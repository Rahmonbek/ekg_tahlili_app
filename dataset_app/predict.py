import argparse
from ultralytics import YOLO

CLASS_NAMES = {
    0: "ascaris",
    1: "trichuris",
    2: "hookworm",
    3: "schistosoma"
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="runs/detect/nmed_parasite/weights/best.pt")
    parser.add_argument("--image", required=True, help="Tekshiriladigan rasm yo‘li")
    parser.add_argument("--conf", type=float, default=0.35, help="Ishonch chegarasi")
    args = parser.parse_args()

    model = YOLO(args.model)
    results = model.predict(
        source=args.image,
        conf=args.conf,
        save=True,
        save_txt=True,
        save_conf=True
    )

    print("\nNatija:")
    found = False

    for result in results:
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            print("Gijja tuxumi topilmadi.")
            continue

        for box in boxes:
            found = True
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            name = CLASS_NAMES.get(cls_id, str(cls_id))
            print(f"- {name}: confidence={conf:.2f}")

    if found:
        print("\n⚠️ Bu AI taxmini. Laboratoriya mutaxassisi tasdig‘i kerak.")
    print("\nRasm natijasi runs/detect/predict papkasida saqlandi.")

if __name__ == "__main__":
    main()
