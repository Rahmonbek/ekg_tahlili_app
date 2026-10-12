"""AI xulosasini boshqa tilga tarjima qiladi va keshlaydi (T-059).

Muammo: tahlil yaratilayotganda AI tili tanlanadi va javob o'sha tilda
bazaga yoziladi. Keyin boshqa tilli shifokor uni ochsa — matn tushunarsiz
tilda qoladi. Interfeys tilini o'zgartirish yordam bermaydi, chunki
matn bazada bitta tilda yotadi.

Bu modul mavjud xulosani so'ralgan tilga o'giradi va natijani
`ai_translations` ustunida keshlaydi: matn o'zgarmaydi, shuning uchun
har safar qayta tarjima qilish pul va vaqtni behuda sarflashdir.

**Faqat qiymatlar tarjima qilinadi, kalitlar emas.** Frontend va PDF
hisobot `automatic_analysis`, `digital_measurements` kabi kalitlarga
tayanadi — ular o'zgarsa natija umuman ko'rinmay qoladi.
"""

import json
import logging

from openai import OpenAI

from config import OPENAI_API_KEY
import ai_config

logger = logging.getLogger(__name__)

SUPPORTED = ("uz", "ru", "en")

_LANGUAGE_NAMES = {
    "uz": "o'zbek (lotin yozuvi)",
    "ru": "rus",
    "en": "ingliz",
}

#: Tarjima qilinadigan maydonlar. Boshqalari (`analiz_mumkinmi`,
#: `automatic_analysis_bool`) — mantiqiy qiymatlar, ular tilga bog'liq emas.
_TRANSLATABLE = (
    "automatic_analysis",
    "cross_findings",          # kompleks xulosa: tahlillar orasidagi bog'liqliklar
    "AI_recommendations",
    "final_summary",
    "analiz_mumkin_emas_sababi",
    "xabar",
)


def _prompt(target_lang: str) -> str:
    name = _LANGUAGE_NAMES.get(target_lang, target_lang)
    return (
        f"Quyidagi tibbiy xulosani {name} tiliga tarjima qil.\n\n"
        "QAT'IY QOIDALAR:\n"
        "- Javob FAQAT JSON obyekti bo'lsin, kalitlar o'zgarmasin;\n"
        "- faqat QIYMATLAR tarjima qilinsin;\n"
        "- tibbiy atamalar va o'lchov birliklari (ms, mV, bpm, mmHg) "
        "xalqaro ko'rinishda qolsin;\n"
        "- raqamlar o'zgarmasin;\n"
        "- hech narsa qo'shma va tushirib qoldirma."
    )


#: Kompleks xulosadagi ehtimollik darajasi (sxemada o'zbekcha enum) —
#: tarjimasi qat'iy: frontend rangni shu so'zlarga qarab tanlaydi
_PROBABILITY = {
    "ru": {"yuqori": "высокая", "o'rtacha": "средняя", "past": "низкая"},
    "en": {"yuqori": "high", "o'rtacha": "medium", "past": "low"},
    "uz": {},
}


def translate(ai_answer_data, target_lang: str) -> dict | None:
    """Xulosani `target_lang` ga o'giradi. Muvaffaqiyatsiz bo'lsa `None`.

    `ai_answer_data` — matn YOKI lug'at. Ustun `jsonb` ga o'tgach
    (20260902000000_AiAnswerDataToJsonb) drayver uni lug'at qilib
    qaytaradi; ilgari bu yerda faqat matn kutilardi va `json.loads(dict)`
    xatosi tufayli tarjima barcha tahlil turlarida jimgina ishlamay qolgan edi.
    """
    if target_lang not in SUPPORTED:
        raise ValueError(f"qo'llab-quvvatlanmaydigan til: {target_lang}")

    if isinstance(ai_answer_data, dict):
        source = ai_answer_data
    else:
        try:
            source = json.loads(ai_answer_data)
        except (TypeError, ValueError):
            logger.warning("Tarjima: `ai_answer_data` JSON emas")
            return None

    if not isinstance(source, dict):
        return None

    # Faqat matnli maydonlarni yuboramiz — qolganini tarjimaga berish
    # javob hajmini va xato ehtimolini oshiradi
    payload = {
        key: value for key, value in source.items()
        if key in _TRANSLATABLE and isinstance(value, str) and value.strip()
    }

    # O'lchovlar ham matn bo'lishi mumkin ("204 ms, chegarada uzaygan")
    measurements = source.get("digital_measurements")
    if isinstance(measurements, dict):
        payload["digital_measurements"] = {
            key: value for key, value in measurements.items()
            if isinstance(value, str) and value.strip()
        }

    # Kompleks xulosa: shoshilinch belgilar (matnlar ro'yxati) va ehtimoliy
    # tashxislar — faqat nomi va asosi; ehtimollik darajasi kod bilan
    # (`_PROBABILITY`) o'giriladi, model uni boshqacha so'z bilan yozib,
    # rang mantig'ini buzmasligi uchun
    red_flags = source.get("red_flags")
    if isinstance(red_flags, list) and red_flags:
        payload["red_flags"] = [str(item) for item in red_flags]
    diagnoses = source.get("differential_diagnosis")
    if isinstance(diagnoses, list) and diagnoses:
        payload["differential_diagnosis"] = [
            {"diagnosis": str(d.get("diagnosis") or ""), "evidence": str(d.get("evidence") or "")}
            for d in diagnoses if isinstance(d, dict)
        ]

    # Holter/SMAD epizodlari: faqat `finding` tarjima qilinadi, vaqt o'zgarmaydi
    episodes = source.get("pathology_episodes")
    if isinstance(episodes, list) and episodes:
        payload["pathology_episodes"] = [
            str(item.get("finding") or "") for item in episodes if isinstance(item, dict)
        ]

    if not payload:
        return None

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.responses.create(
        # Model va fikrlash chuqurligi bitta joyda (A-11)
        **ai_config.translation_request(),
        input=[{
            "role": "user",
            "content": [
                {"type": "input_text", "text": _prompt(target_lang)},
                {"type": "input_text",
                 "text": json.dumps(payload, ensure_ascii=False)},
            ],
        }],
    )

    try:
        translated = json.loads(response.output_text)
    except ValueError:
        logger.warning("Tarjima: model JSON qaytarmadi")
        return None

    if not isinstance(translated, dict):
        return None

    # Asl natijani nusxalab, faqat tarjima qilingan maydonlarni almashtiramiz.
    # Shunda `automatic_analysis_bool` kabi mantiqiy qiymatlar saqlanadi.
    result = dict(source)
    for key, value in translated.items():
        if key == "digital_measurements" and isinstance(value, dict):
            merged = dict(measurements or {})
            merged.update(value)
            result[key] = merged
        elif key == "red_flags" and isinstance(value, list):
            if len(value) == len(red_flags or []):
                result[key] = [str(item) for item in value]
        elif key == "differential_diagnosis" and isinstance(value, list):
            original = [d for d in (diagnoses or []) if isinstance(d, dict)]
            if len(value) == len(original):
                result[key] = [
                    {
                        **orig,
                        "diagnosis": str((new or {}).get("diagnosis") or orig.get("diagnosis") or ""),
                        "evidence": str((new or {}).get("evidence") or orig.get("evidence") or ""),
                        "probability": _PROBABILITY.get(target_lang, {}).get(
                            str(orig.get("probability") or "").lower(), orig.get("probability")),
                    }
                    for orig, new in zip(original, value)
                ]
        elif key == "pathology_episodes" and isinstance(value, list):
            # Soni mos kelmasa tarjima ishonchsiz — asl epizodlar qoladi
            original = [item for item in (episodes or []) if isinstance(item, dict)]
            if len(value) == len(original):
                result[key] = [
                    {"time": item.get("time", ""), "finding": str(text)}
                    for item, text in zip(original, value)
                ]
        elif key in _TRANSLATABLE:
            result[key] = value

    return result


def cached(translations_json: str | None, target_lang: str) -> dict | None:
    """Keshdan tarjimani oladi."""
    if not translations_json:
        return None
    try:
        store = json.loads(translations_json)
    except ValueError:
        return None
    value = store.get(target_lang) if isinstance(store, dict) else None
    return value if isinstance(value, dict) else None


def merge_cache(translations_json: str | None, target_lang: str,
                translation: dict) -> str:
    """Keshga yangi tarjimani qo'shadi va JSON matn qaytaradi."""
    store = {}
    if translations_json:
        try:
            loaded = json.loads(translations_json)
            if isinstance(loaded, dict):
                store = loaded
        except ValueError:
            pass

    store[target_lang] = translation
    return json.dumps(store, ensure_ascii=False)
