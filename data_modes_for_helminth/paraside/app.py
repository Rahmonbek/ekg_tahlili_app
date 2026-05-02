"""
NMED AI Verification System v2.2
=================================
Roboflow workflow v2.2 natijasini olib, AI-tahlil uchun toza,
professional diagnostik rasm yaratadi.

Workflow chiqishlari:
- predictions: list — har biri {class_name, confidence, x, y, width, 
  height, x1, y1, x2, y2}
- class_counts: dict — sinflar bo'yicha sonlar
- total_count: int — umumiy son
- color_mapping: dict — har sinf uchun HEX rang
- image_dimensions: {width, height}
- workflow_metadata: audit ma'lumotlari

Atlas Design System v2 ranglari ishlatilgan.
"""

import os
import sys
import base64
import json
import hashlib
import logging
import requests
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

load_dotenv()


# ═══════════════════════════════════════════════════════════════
# YORDAMCHI FUNKSIYALAR
# ═══════════════════════════════════════════════════════════════

def hex_to_rgb(hex_color: str) -> tuple:
    """HEX rangni RGB tuple'ga o'tkazish"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        return (255, 255, 255)  # default oq
    try:
        return (
            int(hex_color[0:2], 16),
            int(hex_color[2:4], 16),
            int(hex_color[4:6], 16)
        )
    except ValueError:
        return (255, 255, 255)


# ═══════════════════════════════════════════════════════════════
# ASOSIY KLASS
# ═══════════════════════════════════════════════════════════════

class NmedPrecisionSystem:
    """
    NMED AI Verification System v2.2
    
    Yangi workflow (JSON-only) ga to'liq moslangan.
    """
    
    def __init__(self):
        # Konfiguratsiya
        self.api_key = os.getenv("ROBOFLOW_API_KEY")
        self.workspace_id = os.getenv("WORKSPACE_ID")
        self.workflow_id = os.getenv("WORKFLOW_ID")
        self.server_url = os.getenv("INFERENCE_SERVER_URL", "http://localhost:9001")
        
        # Konfiguratsiya tekshirish
        if not all([self.api_key, self.workspace_id, self.workflow_id]):
            raise ValueError(
                "❌ .env faylda ROBOFLOW_API_KEY, WORKSPACE_ID, "
                "WORKFLOW_ID to'liq sozlanmagan!"
            )
        
        # Papkalar
        self.results_dir = Path("results")
        self.logs_dir = Path("logs")
        self.results_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
        
        # Logging (NMED audit talabi)
        self._setup_logging()
    
    def _setup_logging(self):
        """Audit logging sozlash"""
        log_file = self.logs_dir / f"nmed_audit_{datetime.now():%Y%m%d}.log"
        
        # Eski handlerlarni tozalash (qayta ishga tushirishda dublikat bo'lmasligi uchun)
        logger = logging.getLogger("NMED")
        logger.handlers.clear()
        
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(message)s'
        )
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        self.logger = logger
    
    def _get_image_hash(self, image_bytes: bytes) -> str:
        """Rasm uchun unique identifikator"""
        return hashlib.sha256(image_bytes).hexdigest()[:16]
    
    def _get_font(self, size: int = 20, bold: bool = False) -> ImageFont.FreeTypeFont:
        """Tizim shriftini olish"""
        font_paths = [
            # Linux
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold 
                else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            # macOS
            "/System/Library/Fonts/Helvetica.ttc",
            # Windows
            "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        ]
        
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    return ImageFont.truetype(font_path, size)
                except Exception:
                    continue
        
        return ImageFont.load_default()
    
    # ═══════════════════════════════════════════════════════════════
    # ROBOFLOW WORKFLOW CHAQIRUVI
    # ═══════════════════════════════════════════════════════════════
    
    def _call_workflow(self, image_path: str) -> tuple:
        """
        Roboflow workflow'ni chaqirish.
        
        Returns:
            tuple: (workflow_output_dict, image_hash)
        """
        # Rasmni o'qish
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        image_hash = self._get_image_hash(image_bytes)
        self.logger.info(f"Rasm yuklandi | hash={image_hash} | path={image_path}")
        
        # Base64 ga o'tkazish
        img_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Payload
        payload = {
            "api_key": self.api_key,
            "inputs": {"image": {"type": "base64", "value": img_base64}}
        }
        
        # Endpoint
        endpoint = (
            f"{self.server_url}/infer/workflows/"
            f"{self.workspace_id}/{self.workflow_id}"
            f"?api_key={self.api_key}"
        )
        
        self.logger.info(f"Workflow chaqirilmoqda | hash={image_hash}")
        
        response = requests.post(endpoint, json=payload, timeout=120)
        
        if response.status_code != 200:
            raise RuntimeError(
                f"Roboflow API xatosi {response.status_code}: {response.text}"
            )
        
        result = response.json()
        
        # outputs[0] dan workflow natijalarini olish
        if 'outputs' not in result or not result['outputs']:
            raise RuntimeError("Workflow chiqishi bo'sh!")
        
        output = result['outputs'][0]
        
        self.logger.info(
            f"Workflow javobi olindi | hash={image_hash} | "
            f"keys={list(output.keys())}"
        )
        
        return output, image_hash
    
    # ═══════════════════════════════════════════════════════════════
    # VIZUALIZATSIYA (PIL bilan — toza, professional)
    # ═══════════════════════════════════════════════════════════════
    
    def _draw_detections(
        self,
        image: Image.Image,
        predictions: list,
        color_mapping: dict
    ) -> Image.Image:
        """
        Rasmga bbox chiziladi — matn yozilmaydi (rasm to'silmasligi uchun).
        Workflow'dan keladigan x1, y1, x2, y2 burchak koordinatalari ishlatiladi.
        """
        draw = ImageDraw.Draw(image)
        
        for pred in predictions:
            # Workflow'dan to'g'ridan-to'g'ri burchaklarni olish
            x1 = int(pred.get('x1', 0))
            y1 = int(pred.get('y1', 0))
            x2 = int(pred.get('x2', 0))
            y2 = int(pred.get('y2', 0))
            
            # Sinf rangi (workflow color_mapping'dan)
            class_name = pred.get('class_name', 'unknown')
            color_hex = color_mapping.get(class_name, '#FFFFFF')
            color_rgb = hex_to_rgb(color_hex)
            
            # Qalin bbox (3 piksel) — toza, label yo'q
            draw.rectangle([x1, y1, x2, y2], outline=color_rgb, width=3)
        
        return image
    
    def _build_legend_panel(
        self,
        width: int,
        predictions: list,
        class_counts: dict,
        total_count: int,
        color_mapping: dict,
        image_hash: str,
        metadata: dict
    ) -> Image.Image:
        """
        Rasm tagiga qo'shiladigan ma'lumotlar paneli.
        Atlas Design System v2 dark mode ranglarida.
        """
        # Panel o'lchami (dinamik)
        header_height = 90
        row_height = 50
        footer_height = 60
        legend_height = (
            header_height
            + max(len(class_counts), 1) * row_height
            + footer_height
        )
        
        # Qora panel (Atlas dark canvas)
        panel = Image.new('RGB', (width, legend_height), color=(8, 9, 10))
        draw = ImageDraw.Draw(panel)
        
        # Shriftlar
        font_title = self._get_font(28, bold=True)
        font_subtitle = self._get_font(16, bold=False)
        font_class = self._get_font(20, bold=True)
        font_count = self._get_font(20, bold=False)
        font_meta = self._get_font(13, bold=False)
        
        # ─── Sarlavha ───
        draw.text(
            (24, 20),
            "NMED AI VERIFICATION PANEL",
            fill=(245, 193, 90),  # Atlas amber dark
            font=font_title
        )
        
        # Statistika xulosa
        summary = f"Jami: {total_count} ta obyekt  |  Sinflar: {len(class_counts)}"
        draw.text(
            (24, 55),
            summary,
            fill=(181, 179, 171),  # text.secondary dark
            font=font_subtitle
        )
        
        # Ajratuvchi chiziq
        draw.line(
            [(24, 80), (width - 24, 80)],
            fill=(46, 45, 42),  # border.default dark
            width=2
        )
        
        # ─── Sinflar ro'yxati ───
        y_pos = header_height
        
        # Sinflarni count bo'yicha kamayish tartibida saralash
        sorted_classes = sorted(
            class_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        if not sorted_classes:
            # Hech narsa topilmagan
            draw.text(
                (24, y_pos + 12),
                "Hech qanday parazit aniqlanmadi",
                fill=(134, 132, 128),
                font=font_class
            )
        
        for class_name, count in sorted_classes:
            color_hex = color_mapping.get(class_name, '#FFFFFF')
            color_rgb = hex_to_rgb(color_hex)
            
            # Rang indikatori
            indicator_size = 24
            indicator_x = 24
            indicator_y = y_pos + (row_height - indicator_size) // 2
            
            draw.rectangle(
                [
                    indicator_x, indicator_y,
                    indicator_x + indicator_size, indicator_y + indicator_size
                ],
                fill=color_rgb,
                outline=(240, 239, 232),
                width=1
            )
            
            # Sinf nomi
            text_x = indicator_x + indicator_size + 16
            text_y = y_pos + (row_height - 24) // 2
            
            draw.text(
                (text_x, text_y),
                class_name,
                fill=(240, 239, 232),  # text.primary dark
                font=font_class
            )
            
            # Soni (o'ng tomonda)
            count_text = f"{count} ta"
            count_bbox = draw.textbbox((0, 0), count_text, font=font_count)
            count_width = count_bbox[2] - count_bbox[0]
            
            draw.text(
                (width - 24 - count_width, text_y),
                count_text,
                fill=(90, 196, 159),  # secondary teal dark
                font=font_count
            )
            
            # O'rtacha confidence
            class_preds = [
                p for p in predictions 
                if p.get('class_name') == class_name
            ]
            if class_preds:
                avg_conf = sum(
                    p.get('confidence', 0) for p in class_preds
                ) / len(class_preds)
                conf_text = f"o'rt. ishonch: {avg_conf:.1%}"
                conf_bbox = draw.textbbox((0, 0), conf_text, font=font_meta)
                conf_width = conf_bbox[2] - conf_bbox[0]
                
                draw.text(
                    (width - 24 - count_width - conf_width - 24, text_y + 4),
                    conf_text,
                    fill=(134, 132, 128),
                    font=font_meta
                )
            
            y_pos += row_height
        
        # ─── Footer ───
        footer_y = legend_height - footer_height + 10
        
        # Ajratuvchi chiziq
        draw.line(
            [(24, footer_y), (width - 24, footer_y)],
            fill=(46, 45, 42),
            width=1
        )
        
        # Audit ma'lumotlari
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        wf_version = metadata.get('workflow_version', 'N/A') if metadata else 'N/A'
        footer_text = f"ID: {image_hash}  |  {timestamp}  |  WF v{wf_version}"
        
        draw.text(
            (24, footer_y + 16),
            footer_text,
            fill=(134, 132, 128),
            font=font_meta
        )
        
        return panel
    
    # ═══════════════════════════════════════════════════════════════
    # ASOSIY METOD
    # ═══════════════════════════════════════════════════════════════
    
    def create_ai_ready_result(self, image_path: str) -> dict:
        """
        Asosiy oqim: Workflow → Vizualizatsiya → AI uchun tayyor rasm
        
        Returns:
            dict: {
                'success': bool,
                'image_path': str,    # tayyor rasm
                'json_path': str,     # to'liq JSON natija
                'predictions': list,
                'class_counts': dict,
                'total_count': int,
                'image_hash': str,
                'metadata': dict
            }
        """
        try:
            # Rasm mavjudligini tekshirish
            if not os.path.exists(image_path):
                error = f"Rasm topilmadi: {image_path}"
                self.logger.error(error)
                return {'success': False, 'error': error}
            
            print(f"🚀 Roboflow workflow tahlili boshlandi...")
            
            # 1. Workflow chaqirish
            output, image_hash = self._call_workflow(image_path)
            
            # 2. Workflow chiqishlarini olish (yangi workflow tuzilmasi)
            predictions = output.get('predictions', []) or []
            class_counts = output.get('class_counts', {}) or {}
            total_count = output.get('total_count', 0) or 0
            color_mapping = output.get('color_mapping', {}) or {}
            image_dimensions = output.get('image_dimensions', {}) or {}
            metadata = output.get('workflow_metadata', {}) or {}
            
            # Agar total_count workflow'dan kelmasa
            if not total_count:
                total_count = len(predictions)
            
            self.logger.info(
                f"Aniqlandi | total={total_count} | "
                f"classes={len(class_counts)} | hash={image_hash}"
            )
            
            # Metadata loglash (audit uchun)
            if metadata:
                self.logger.info(
                    f"Metadata | "
                    f"raw_a={metadata.get('model_a_raw_count', 0)} | "
                    f"raw_b={metadata.get('model_b_raw_count', 0)} | "
                    f"after_filters={metadata.get('after_filters_count', 0)} | "
                    f"hash={image_hash}"
                )
            
            # 3. Rasmni PIL bilan ochish
            image = Image.open(image_path).convert('RGB')
            
            # 4. Bbox chizish (faqat ramka, matnsiz)
            image_with_boxes = self._draw_detections(
                image, predictions, color_mapping
            )
            
            # 5. Pastga ma'lumot paneli
            legend = self._build_legend_panel(
                width=image.width,
                predictions=predictions,
                class_counts=class_counts,
                total_count=total_count,
                color_mapping=color_mapping,
                image_hash=image_hash,
                metadata=metadata
            )
            
            # 6. Birlashtirish
            combined_height = image_with_boxes.height + legend.height
            combined = Image.new(
                'RGB',
                (image_with_boxes.width, combined_height),
                color=(8, 9, 10)
            )
            combined.paste(image_with_boxes, (0, 0))
            combined.paste(legend, (0, image_with_boxes.height))
            
            # 7. Saqlash
            base_name = Path(image_path).stem
            output_image_path = self.results_dir / f"READY_FOR_AI_{base_name}.jpg"
            output_json_path = self.results_dir / f"READY_FOR_AI_{base_name}.json"
            
            combined.save(output_image_path, 'JPEG', quality=95)
            
            # 8. JSON natija saqlash (AI uchun ham qulay)
            result_data = {
                'image_hash': image_hash,
                'timestamp': datetime.now().isoformat(),
                'source_image': str(image_path),
                'output_image': str(output_image_path),
                'total_count': total_count,
                'class_counts': class_counts,
                'predictions': predictions,
                'color_mapping': color_mapping,
                'image_dimensions': image_dimensions,
                'workflow_metadata': metadata
            }
            
            with open(output_json_path, 'w', encoding='utf-8') as f:
                json.dump(result_data, f, indent=2, ensure_ascii=False)
            
            # 9. Konsol xulosasi
            self._print_summary(result_data)
            
            self.logger.info(
                f"Yakunlandi | hash={image_hash} | "
                f"output={output_image_path}"
            )
            
            return {
                'success': True,
                'image_path': str(output_image_path),
                'json_path': str(output_json_path),
                'predictions': predictions,
                'class_counts': class_counts,
                'total_count': total_count,
                'image_hash': image_hash,
                'metadata': metadata
            }
        
        except requests.RequestException as e:
            error = f"Roboflow API xatosi: {e}"
            self.logger.error(error)
            return {'success': False, 'error': error}
        
        except Exception as e:
            self.logger.exception(f"Kutilmagan xato: {e}")
            return {'success': False, 'error': str(e)}
    
    def _print_summary(self, result: dict):
        """Konsolga chiroyli xulosa"""
        print("\n" + "═" * 60)
        print("  ✅  NMED AI VERIFICATION — TAHLIL TUGADI")
        print("═" * 60)
        print(f"  📊 Jami obyektlar:    {result['total_count']}")
        print(f"  🔬 Sinflar soni:      {len(result['class_counts'])}")
        print(f"  🆔 Rasm ID:           {result['image_hash']}")
        
        # Workflow metadata (audit)
        meta = result.get('workflow_metadata', {})
        if meta:
            print()
            print("  Workflow ma'lumotlari:")
            print(f"    Model A xom natija:  {meta.get('model_a_raw_count', 0)}")
            print(f"    Model B xom natija:  {meta.get('model_b_raw_count', 0)}")
            print(f"    Filterdan keyin:     {meta.get('after_filters_count', 0)}")
            print(f"    Filtrlangan A:       {meta.get('filtered_out_a', 0)}")
            print(f"    Filtrlangan B:       {meta.get('filtered_out_b', 0)}")
        
        print()
        if result['class_counts']:
            print("  Aniqlangan turlar:")
            for cls, count in sorted(
                result['class_counts'].items(),
                key=lambda x: x[1],
                reverse=True
            ):
                color_hex = result['color_mapping'].get(cls, '#FFFFFF')
                # Confidence o'rtachasi
                class_preds = [
                    p for p in result['predictions']
                    if p.get('class_name') == cls
                ]
                if class_preds:
                    avg_conf = sum(
                        p.get('confidence', 0) for p in class_preds
                    ) / len(class_preds)
                    print(f"    [{color_hex}]  {cls}: {count} ta  ({avg_conf:.1%})")
                else:
                    print(f"    [{color_hex}]  {cls}: {count} ta")
        else:
            print("  ⚠️  Hech qanday parazit aniqlanmadi")
        
        print()
        print(f"  📁 Rasm:    {result['output_image']}")
        json_path = Path(result['output_image']).with_suffix('.json')
        print(f"  📄 JSON:    {json_path}")
        print("═" * 60 + "\n")


# ═══════════════════════════════════════════════════════════════
# DEMO ISHGA TUSHIRISH
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Fayl yo'lini argumentdan olish
    image_file = sys.argv[1] if len(sys.argv) > 1 else "askarida.jpg"
    
    print("\n🔬 NMED Precision System v2.2 ishga tushirilmoqda...\n")
    
    try:
        system = NmedPrecisionSystem()
        result = system.create_ai_ready_result(image_file)
        
        if result['success']:
            print(f"\n✨ Tayyor rasm: {result['image_path']}")
            print(f"   Bu rasmni endi AI'ga yuborishingiz mumkin!\n")
            sys.exit(0)
        else:
            error_msg = result.get('error', "Noma'lum xato")
            print(f"\n❌ Xato: {error_msg}\n")
            sys.exit(1)
    
    except ValueError as e:
        print(f"\n❌ Konfiguratsiya xatosi: {e}\n")
        print(".env fayl namunasi:")
        print("  ROBOFLOW_API_KEY=your_api_key_here")
        print("  WORKSPACE_ID=your_workspace")
        print("  WORKFLOW_ID=your_workflow")
        print("  INFERENCE_SERVER_URL=http://localhost:9001\n")
        sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Foydalanuvchi tomonidan to'xtatildi\n")
        sys.exit(130)