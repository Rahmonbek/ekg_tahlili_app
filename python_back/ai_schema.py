"""Sun'iy intellekt javobi uchun qat'iy JSON sxemalari (T-032, T-031).

Muammo nima edi
---------------
Holter, SMAD va Laboratoriya promptlari modeldan atigi uchta maydon
so'rardi: `automatic_analysis`, `automatic_analysis_bool`, `final_summary`.
EKG esa beshtasini so'rardi. Natijada frontenddagi

    {result.AI_recommendations ? (...) : null}

sharti hech qachon bajarilmasdi va **"AI tavsiyasi" bo'limi to'rt
moduldan uchtasida jimgina yo'qolardi** — shifokor bunday bo'lim umuman
yo'q deb o'ylardi. Laboratoriya natijasi ayniqsa qashshoq edi: ko'rsatkichlar
umuman ajratib olinmasdi.

Ikkinchi muammo — model formatga rioya qilishi faqat prompt matniga
tayangan edi ("Javob FAQAT JSON bo'lsin"). Model ba'zan JSON ni ``` ichiga
o'rab yuborardi yoki maydonni tashlab ketardi, kod esa `json.loads` xatoga
uchraganda butun tahlilni `{"raw": "..."}` ga aylantirib yubarardi.

Yechim
------
OpenAI **Structured Outputs** — `text.format` orqali JSON Schema beriladi
va model undan chetga chiqa olmaydi: maydonlar soni, nomi va turi
kafolatlanadi. Prompt matni endi *nima yozish kerakligini* tushuntiradi,
*qanday formatda* ekanini esa sxema majburlaydi.

`strict: true` rejimi talablari:
  * har bir `object` da `additionalProperties: false`;
  * `required` ro'yxatida **barcha** xossalar bo'lishi shart —
    "ixtiyoriy" maydon `"type": [..., "null"]` orqali ifodalanadi.
"""

# ─── Umumiy maydonlar ────────────────────────────────────────────────────────

def _common_properties(subject: str) -> dict:
    """Barcha tahlil turlarida bir xil bo'lgan maydonlar.

    `subject` — prompt matnida ishlatiladigan tahlil nomi ("Holter yozuvi").
    """
    return {
        "automatic_analysis": {
            "type": "string",
            "description": (
                f"{subject} bo'yicha aniqlangan patologik holatlar va "
                "kasalliklar. Topilma bo'lmasa buni ham aniq yoz."
            ),
        },
        "analiz_mumkinmi": {
            "type": "boolean",
            "description": (
                "Fayl tahlil qilishga yaroqli bo'lsa true. Yozuv ko'rinmasa, "
                "sifati past bo'lsa yoki mazmuni boshqa tahlilga tegishli "
                "bo'lsa false."
            ),
        },
        "analiz_mumkin_emas_sababi": {
            "type": ["string", "null"],
            "description": (
                "analiz_mumkinmi false bo'lsa — sababi qisqacha. "
                "Aks holda null."
            ),
        },
        "automatic_analysis_bool": {
            "type": ["integer", "null"],
            "enum": [1, 2, 3, None],
            "description": (
                "Holat jiddiyligi: 1 = normal (patologiya YO'Q), "
                "2 = e'tibor talab qiladi (patologiya bor, shoshilinch emas), "
                "3 = shoshilinch. analiz_mumkinmi false bo'lsa null bo'lishi SHART."
            ),
        },
        "AI_recommendations": {
            "type": "string",
            "description": (
                "Oddiy tilda tavsiya: qaysi qo'shimcha tekshiruv kerak, "
                "shifokorga qachon murojaat qilish kerak, turmush tarzi "
                "bo'yicha ko'rsatma. Patologiya topilmasa ham profilaktik "
                "tavsiya yoz — bu maydon hech qachon bo'sh qolmasin."
            ),
        },
        "final_summary": {
            "type": "string",
            "description": "Tibbiy asoslangan yakuniy xulosa: asosiy topilmalar va klinik baho.",
        },
    }


def _measure(description: str) -> dict:
    """Bitta raqamli o'lchov. Aniqlab bo'lmasa model `null` qaytaradi."""
    return {"type": ["string", "null"], "description": description}


# ─── Tur bo'yicha raqamli o'lchovlar ─────────────────────────────────────────

HOLTER_MEASUREMENTS = {
    "HR_avg": _measure("Sutkalik o'rtacha yurak urish tezligi, bpm"),
    "HR_min": _measure("Eng past YUT va vaqti. QISQA: '66 bpm (02:00)'"),
    "HR_max": _measure("Eng yuqori YUT va vaqti. QISQA: '118 bpm (19:04)'"),
    "total_beats": _measure("Umumiy qisqarishlar soni"),
    "pauses_count": _measure("2 soniyadan uzun pauzalar soni"),
    "max_pause": _measure("Eng uzun pauza davomiyligi, soniya"),
    "ventricular_extrasystoles": _measure("Qorincha ekstrasistolalari soni va Lown darajasi"),
    "supraventricular_extrasystoles": _measure("Supraventrikulyar ekstrasistolalar soni"),
    "QTc": _measure("QTc interval (Bazett). QISQA: '355 ms'"),
    "st_deviation": _measure("ST segment siljishi: maksimal depressiya/elevatsiya va davomiyligi"),
    "rhythm_summary": _measure("Asosiy ritm va aniqlangan aritmiya epizodlari"),
}

SMAD_MEASUREMENTS = {
    "SBP_24h_avg": _measure("Sutkalik o'rtacha sistolik bosim, mm Hg"),
    "DBP_24h_avg": _measure("Sutkalik o'rtacha diastolik bosim, mm Hg"),
    "SBP_day_avg": _measure("Kunduzgi o'rtacha sistolik bosim"),
    "DBP_day_avg": _measure("Kunduzgi o'rtacha diastolik bosim"),
    "SBP_night_avg": _measure("Tungi o'rtacha sistolik bosim"),
    "DBP_night_avg": _measure("Tungi o'rtacha diastolik bosim"),
    "max_bp": _measure("Maksimal bosim. QISQA yoz: '229/205 mmHg (21:01)'"),
    "min_bp": _measure("Minimal bosim. QISQA yoz: '124/45 mmHg (03:02)'"),
    "load_index_sbp": _measure("Sistolik yuk indeksi. QISQA: 'kunduz 89.7% / tun 100%'"),
    "load_index_dbp": _measure("Diastolik yuk indeksi. QISQA: 'kunduz 65.5% / tun 77.8%'"),
    "circadian_index": _measure("Tungi pasayish darajasi, %"),
    "dipping_status": _measure("Tungi profil: dipper / non-dipper / over-dipper / night-peaker"),
    "heart_rate_avg": _measure("O'rtacha yurak urish tezligi, bpm"),
}

#: EKG. Kalitlar frontend (`EcgResult.js`) va PDF hisobot
#: (`PdfReportService.EcgRows`) kutayotgan nomlar bilan AYNAN bir xil —
#: aks holda o'lchovlar ekranda ham, hisobotda ham ko'rinmay qoladi.
ECG_MEASUREMENTS = {
    "HR": _measure("Yurak urish tezligi, bpm"),
    "PR_interval": _measure("PR interval, ms"),
    "QRS_duration": _measure("QRS kompleksi davomiyligi, ms"),
    "QT_interval": _measure("QT interval, ms"),
    "QTc_Bazett": _measure("QTc (Bazett formulasi), ms"),
    "QRS_axis": _measure("QRS elektr o'qi, gradus"),
    "P_wave_duration": _measure("P to'lqini davomiyligi, ms"),
    "P_wave_amplitude": _measure("P to'lqini amplitudasi, mV"),
    "R_wave_amplitude": _measure("R to'lqini amplitudasi (RV5), mV"),
    "S_wave_amplitude": _measure("S to'lqini amplitudasi (SV1), mV"),
    "T_wave_amplitude": _measure("T to'lqini amplitudasi, mV"),
    "PR_segment": _measure("PR segment holati"),
    "ST_segment_elevation": _measure("ST segment siljishi, mV"),
    "ST_depression": _measure("ST depressiya, mV"),
    "ST_elevation": _measure("ST elevatsiya, mV"),
    "Sokolow_Lyon": _measure("Sokolov-Lyon indeksi, mV"),
    "RR_interval": _measure("RR interval, ms"),
    "heart_rate_variability": _measure("Yurak ritmi o'zgaruvchanligi (HRV)"),
    "P_QRS_T_morphology": _measure("P/QRS/T morfologiyasi va ritm tavsifi"),
}

#: Laboratoriya uchun qat'iy sxema ATAYIN ishlatilmaydi.
#:
#: Sababi: lab natijasidagi `digital_measurements` faqat ekranda
#: ko'rsatilmaydi — u `**digital_values` orqali `lab_analyses` jadvalining
#: haqiqiy ustunlariga (hb, urine_rbc, daily_protein va h.k., ~50 ta)
#: yoziladi. `strict: true` rejimi `required` ro'yxatiga BARCHA xossalarni
#: talab qiladi, ya'ni model har bir tahlilda ellikta maydonni, asosan
#: `null` qiymat bilan, qaytarishga majbur bo'lardi — bu javob narxini
#: va kechikishini bekorga oshiradi.
#:
#: Shuning uchun laboratoriya uchun mavjud kalitli lug'at shakli saqlanadi,
#: yetishmayotgan `AI_recommendations` esa prompt orqali qo'shiladi.

def _schema(name: str, subject: str, measurements) -> dict:
    """Tur uchun to'liq sxema quradi.

    `measurements` ikki ko'rinishda bo'lishi mumkin:

    * **maydonlar lug'ati** (EKG/Holter/SMAD) — kalit ko'rsatkich nomi,
      qiymat esa `_measure(...)`. Bu yerdan obyekt sxemasi quriladi;
    * **tayyor JSON sxema** (Laboratoriya) — ichida `"type"` kaliti bor.
      U o'zgarishsiz ishlatiladi.

    Farqlash `"type"` kaliti bo'yicha: `_measure()` qaytargan lug'atlar
    ham `"type"` ga ega, lekin ular **ichki** qiymatlar — tashqi lug'atda
    bunday kalit bo'lmaydi.
    """
    if isinstance(measurements, dict) and "type" not in measurements:
        digital = {
            "type": "object",
            "additionalProperties": False,
            "properties": measurements,
            "required": list(measurements.keys()),
            "description": (
                "Fayldan o'qib olingan raqamli ko'rsatkichlar. "
                "Aniqlab bo'lmagan har bir maydonga null ber — taxmin qilma."
            ),
        }
    else:
        digital = measurements

    properties = {"digital_measurements": digital}
    properties.update(_common_properties(subject))

    return {
        "type": "object",
        "additionalProperties": False,
        "properties": properties,
        "required": list(properties.keys()),
    }


# ─── Laboratoriya ───────────────────────────────────────────────────────────

#: `lab_analyses` jadvalidagi ko'rsatkich ustunlari. Manba —
#: `lab_value_types.column_name` (40 ta yozuv).
#:
#: Yangi ko'rsatkich qo'shilganda bu ro'yxatga ham qo'shish SHART:
#: `enum` da yo'q nomni model qaytara olmaydi, ya'ni ko'rsatkich
#: jimgina yo'qoladi. Buni `startup_check()` tekshiradi.
LAB_COLUMNS = [
    # Umumiy qon tahlili
    "hb", "rbc", "wbc", "plt", "hct", "mcv", "mch", "mchc", "esr",
    # Biokimyo
    "glucose", "cholesterol", "alt", "ast", "bilirubin_total",
    "bilirubin_direct", "creatinine", "urea", "total_protein", "albumin",
    "calcium", "sodium", "potassium", "iron",
    # Gormonlar
    "tsh", "free_t4", "insulin",
    # Peshob
    "urine_volume", "urine_density", "urine_ph", "urine_protein",
    "urine_glucose", "urine_ketones", "urine_bilirubin", "urobilinogen",
    "urine_rbc", "urine_wbc",
    # Sutkalik peshob
    "daily_protein", "daily_creatinine", "daily_calcium", "daily_sodium",
    # ── Qo'shimcha ko'rsatkichlar (20260905 migratsiya) ──
    # Lipid paneli
    "triglycerides", "hdl", "ldl", "vldl", "atherogenic_index",
    # Uglevod almashinuvi
    "hba1c", "c_peptide",
    # Yallig'lanish
    "crp",
    # Fermentlar
    "ggt", "alp", "amylase", "lipase", "ldh", "ck", "ck_mb",
    # Buyrak / elektrolit / almashinuv
    "uric_acid", "magnesium", "phosphorus", "chloride",
    # Temir almashinuvi
    "ferritin", "tibc", "transferrin",
    # Bilirubin / oqsil
    "bilirubin_indirect", "globulin",
    # Qalqonsimon bez
    "free_t3", "t3_total", "t4_total",
    # Vitaminlar
    "vitamin_d", "vitamin_b12", "folate",
    # Koagulyatsiya (gemostaz)
    "prothrombin_time", "prothrombin_index", "inr", "aptt",
    "fibrinogen", "thrombin_time", "d_dimer",
    # Qon formulasi (leykotsitar)
    "neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils",
    # Qizil qon / trombotsit indekslari
    "rdw", "mpv", "pdw", "pct", "reticulocytes",
]

#: Laboratoriya o'lchovlari — obyekt emas, **massiv**.
#:
#: Nima uchun boshqa turlardan farq qiladi: EKG/Holter/SMAD da
#: ko'rsatkichlar ro'yxati qat'iy va har doim bir xil (11–19 ta), shuning
#: uchun ularni obyekt sifatida so'rash va aniqlanmaganiga `null` berish
#: mantiqiy. Laboratoriyada esa 40 ta ustun bor, bitta tahlilda esa
#: odatda 2–10 tasi bo'ladi — qat'iy obyekt modelni 30–38 ta `null`
#: yozishga majbur qilardi. Massivda esa faqat TOPILGANLARI qaytadi.
#:
#: `column_name` uchun `enum`: model mavjud bo'lmagan ustun nomini
#: o'ylab topa olmaydi. Ilgari bu himoya yo'q edi va noma'lum kalit
#: `update_lab_analyse(**digital_values)` chaqiruvini `TypeError` bilan
#: buzardi — ya'ni butun tahlil natijasi yo'qolardi.
LAB_MEASUREMENTS = {
    "type": "array",
    "description": (
        "Fayldan o'qib olingan ko'rsatkichlar. FAQAT haqiqatan topilganlarini "
        "yoz — fayl da yo'q ko'rsatkichni ro'yxatga qo'shma va qiymatini "
        "taxmin qilma."
    ),
    "items": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "column_name": {
                "type": "string",
                "enum": LAB_COLUMNS,
                "description": "Ko'rsatkichning tizimdagi nomi",
            },
            "value": {
                "type": ["number", "null"],
                "description": "Raqamli qiymat. O'qib bo'lmasa null.",
            },
            "unit": {
                "type": ["string", "null"],
                "description": "O'lchov birligi (masalan g/L, mmol/L)",
            },
        },
        "required": ["column_name", "value", "unit"],
    },
}


SCHEMAS = {
    "ecg": _schema("ecg_analysis", "EKG yozuvi", ECG_MEASUREMENTS),
    "holter": _schema("holter_analysis", "Holter monitoring yozuvi", HOLTER_MEASUREMENTS),
    "smad": _schema("smad_analysis", "Sutkalik arterial bosim monitoringi (SMAD)", SMAD_MEASUREMENTS),
    "lab": _schema("lab_analysis", "Laboratoriya tahlili", LAB_MEASUREMENTS),
}

#: `automatic_analysis_bool` va boshqa umumiy maydonlar ro'yxati — natijani
#: bazaga yozishda ishlatiladi
RESULT_FIELDS = (
    "digital_measurements",
    "automatic_analysis",
    "analiz_mumkinmi",
    "analiz_mumkin_emas_sababi",
    "automatic_analysis_bool",
    "AI_recommendations",
    "final_summary",
)


def response_format(kind: str) -> dict:
    """`client.responses.create(text=...)` uchun format tavsifi.

    `kind` — "ecg", "holter", "smad" yoki "lab".
    """
    return {
        "format": {
            "type": "json_schema",
            "name": f"{kind}_analysis",
            "strict": True,
            "schema": SCHEMAS[kind],
        }
    }


def normalize(parsed: dict) -> dict:
    """Model javobini bazaga yoziladigan ko'rinishga keltiradi.

    Structured Outputs maydonlarni kafolatlaydi, lekin bu funksiya eski
    (sxemasiz) javoblar va zaxira yo'l uchun ham ishlaydi — shuning uchun
    har bir maydon alohida tekshiriladi.
    """
    if not isinstance(parsed, dict):
        return {field: None for field in RESULT_FIELDS}

    level = parsed.get("automatic_analysis_bool")
    if level is not None:
        try:
            level = int(level)
        except (ValueError, TypeError):
            level = None
        else:
            if level not in (1, 2, 3):
                level = None

    # Tahlil imkonsiz bo'lsa jiddiylik darajasi ko'rsatilmasligi kerak —
    # aks holda "normal" (yashil) chip chiqib, shifokorni chalg'itadi (T-092)
    if parsed.get("analiz_mumkinmi") is False:
        level = None

    return {
        "digital_measurements": parsed.get("digital_measurements"),
        "automatic_analysis": parsed.get("automatic_analysis") or "",
        "analiz_mumkinmi": parsed.get("analiz_mumkinmi"),
        "analiz_mumkin_emas_sababi": parsed.get("analiz_mumkin_emas_sababi"),
        "automatic_analysis_bool": level,
        "AI_recommendations": parsed.get("AI_recommendations") or "",
        "final_summary": parsed.get("final_summary") or "",
    }


# ─── Kompleks (ko'p tahlilli) xulosa ────────────────────────────────────────
#
# Bemorning bir nechta tahlili (masalan ikkita EKG, laboratoriya, SMAD va
# Holter) BIRGALIKDA tahlil qilinganda ishlatiladi.
#
# Nima uchun alohida sxema: bu yerda modeldan fayldan raqam o'qish emas,
# TAYYOR xulosalarni bir-biriga bog'lash so'raladi. Shuning uchun
# `digital_measurements` yo'q, uning o'rniga modullar orasidagi
# bog'liqliklar (`cross_findings`) bor.
#
# QISQALIK — sxemaning ajralmas qismi (loyiha egasining talabi). Model
# uzun matn yozishga moyil: normal ko'rsatkichlarni sanaydi, bir xil
# fikrni to'rt maydonda takrorlaydi. Shifokor esa bunday xulosani
# o'qimaydi. Shuning uchun har bir maydon tavsifida GAP SONI chegarasi
# aniq ko'rsatilgan va "faqat patologiya" qoidasi takrorlangan.
#
# `timeline_summary` (dinamika) maydoni OLIB TASHLANDI: uning mazmuni
# baribir `automatic_analysis` va `cross_findings` bilan takrorlanardi.
#
# `automatic_analysis_bool` va `final_summary` nomlari ATAYLAB saqlangan:
# frontenddagi `severityColor`/`severityLabel` va backenddagi
# `AiSeverity.Parse` shu nomlarga tayanadi va o'zgartirishsiz ishlaydi.

COMBINED_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "cross_findings": {
            "type": "string",
            "description": (
                "ENG MUHIM MAYDON. Turli tahlillardagi PATOLOGIK topilmalar "
                "orasidagi bog'liqlik. Masalan laboratoriyadagi elektrolit "
                "siljishi va EKG dagi QT o'zgarishi. "
                "ENG KO'PI BILAN 3 GAP. Normal topilmalarni bog'lama. "
                "Bog'liqlik yo'q bo'lsa faqat bitta qisqa gap yoz."
            ),
        },
        "automatic_analysis": {
            "type": "string",
            "description": (
                "FAQAT patologik topilmalar va sog'liq muammolari — lekin "
                "har birini BATAFSIL yoz. Bu maydon eng mazmunli bo'lishi kerak. "
                "Har bir topilma ALOHIDA QATORDA va quyidagilarni o'z ichiga olsin: "
                "1) topilmaning nomi; "
                "2) uni tasdiqlaydigan ANIQ RAQAMLAR yoki tavsif "
                "(masalan 'tungi SBP 148/92, tungi pasayish -4%'); "
                "3) qaysi tahlildan va qachonligi qavs ichida; "
                "4) klinik ma'nosi — bu nimani anglatadi va qanchalik jiddiy. "
                "Har bir topilma uchun 2-4 gap. ENG KO'PI BILAN 5 TA topilma. "
                "NORMAL ko'rsatkichlarni va topilmagan holatlarni UMUMAN "
                "sanab o'tirma — ular bu maydonda bo'lmasin. "
                "Patologiya topilmasa faqat 'Patologik topilma aniqlanmadi' deb yoz."
            ),
        },
        "automatic_analysis_bool": {
            "type": ["integer", "null"],
            "enum": [1, 2, 3, None],
            "description": (
                "Umumiy holat jiddiyligi: 1 = normal, 2 = e'tibor talab "
                "qiladi, 3 = shoshilinch. Bu ALOHIDA tahlillarning eng "
                "yuqorisidan past bo'la olmaydi."
            ),
        },
        "differential_diagnosis": {
            "type": "array",
            "description": (
                "Ehtimoliy tashxislar, ehtimolligi bo'yicha kamayish tartibida. "
                "IKKI XIL tashxisni ham ko'rib chiq: "
                "(a) bitta tahlildagi patologiyadan kelib chiqadigan tashxis; "
                "(b) TAHLILLAR JAMLANMASIDAN kelib chiqadigan tashxis — "
                "alohida olganda har bir topilma unchalik ma'no bermasligi "
                "mumkin, lekin BIRGALIKDA ma'lum bir kasallik yoki sindromga "
                "ishora qilishi mumkin (masalan bir nechta a'zo tizimidagi "
                "o'zgarishlar bitta tizimli kasallikka mos kelsa). "
                "Bunday tashxisni O'TKAZIB YUBORMA — u eng qimmatlisi, "
                "chunki alohida tahlil qilganda ko'rinmaydi. Uning `evidence` "
                "maydonida qaysi tahlillardagi qaysi topilmalar birgalikda "
                "shu xulosaga olib kelganini KO'RSAT. "
                "ENG KO'PI BILAN 4 TA. Faqat haqiqiy asosi bo'lganini yoz — "
                "asos bo'lmasa BO'SH massiv qaytar."
            ),
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "diagnosis": {"type": "string", "description": "Tashxis nomi"},
                    "probability": {
                        "type": "string",
                        "enum": ["yuqori", "o'rtacha", "past"],
                        "description": "Mavjud ma'lumotlarga asoslangan ehtimollik",
                    },
                    "evidence": {
                        "type": "string",
                        "description": (
                            "Qaysi tahlildagi qaysi topilma bu tashxisni "
                            "qo'llab-quvvatlaydi. BITTA qisqa gap."
                        ),
                    },
                },
                "required": ["diagnosis", "probability", "evidence"],
            },
        },
        "red_flags": {
            "type": "array",
            "description": (
                "Shoshilinch e'tibor talab qiladigan topilmalar. "
                "Har biri BITTA qisqa gap. Bunday topilma bo'lmasa "
                "BO'SH massiv — 'yo'q' deb yozma."
            ),
            "items": {"type": "string"},
        },
        "AI_recommendations": {
            "type": "string",
            "description": (
                "Faqat ANIQLANGAN muammodan kelib chiqadigan keyingi qadamlar: "
                "qanday tekshiruv kerak va shifokorga qachon murojaat qilish "
                "kerak. Har biri alohida qatorda, qisqa. "
                "ENG KO'PI BILAN 4 TA punkt. "
                "Umumiy turmush tarzi maslahatlarini (ovqatlanish, uyqu, sport) "
                "aniqlangan patologiya bilan bevosita bog'liq bo'lmasa yozma. "
                "Aniq dori dozasi yozma. Bu maydon bo'sh qolmasin."
            ),
        },
        "final_summary": {
            "type": "string",
            "description": (
                "Yakuniy tibbiy xulosa: asosiy muammo nima va u qanchalik "
                "jiddiy. ENG KO'PI BILAN 3 GAP. "
                "Yuqoridagi maydonlarni aynan takrorlama."
            ),
        },
        "analiz_mumkinmi": {
            "type": "boolean",
            "description": (
                "Berilgan ma'lumotlar kompleks xulosa chiqarishga yetarli "
                "bo'lsa true."
            ),
        },
        "analiz_mumkin_emas_sababi": {
            "type": ["string", "null"],
            "description": "analiz_mumkinmi false bo'lsa sababi, aks holda null.",
        },
    },
    "required": [
        "cross_findings",
        "automatic_analysis",
        "automatic_analysis_bool",
        "differential_diagnosis",
        "red_flags",
        "AI_recommendations",
        "final_summary",
        "analiz_mumkinmi",
        "analiz_mumkin_emas_sababi",
    ],
}

SCHEMAS["combined"] = COMBINED_SCHEMA

#: Kompleks xulosaning maydonlari — bazaga yozishda ishlatiladi
COMBINED_RESULT_FIELDS = tuple(COMBINED_SCHEMA["required"])


def normalize_combined(parsed: dict) -> dict:
    """Kompleks xulosani bazaga yoziladigan ko'rinishga keltiradi.

    `normalize()` dan alohida: maydonlar to'plami boshqacha va bu yerda
    `digital_measurements` yo'q. Jiddiylik darajasi bo'yicha qoida esa
    bir xil — tahlil imkonsiz bo'lsa daraja ko'rsatilmaydi (T-092).
    """
    if not isinstance(parsed, dict):
        return {field: None for field in COMBINED_RESULT_FIELDS}

    level = parsed.get("automatic_analysis_bool")
    if level is not None:
        try:
            level = int(level)
        except (ValueError, TypeError):
            level = None
        else:
            if level not in (1, 2, 3):
                level = None

    if parsed.get("analiz_mumkinmi") is False:
        level = None

    def _list(value):
        return value if isinstance(value, list) else []

    return {
        "cross_findings": parsed.get("cross_findings") or "",
        "automatic_analysis": parsed.get("automatic_analysis") or "",
        "automatic_analysis_bool": level,
        "differential_diagnosis": _list(parsed.get("differential_diagnosis")),
        "red_flags": _list(parsed.get("red_flags")),
        "AI_recommendations": parsed.get("AI_recommendations") or "",
        "final_summary": parsed.get("final_summary") or "",
        "analiz_mumkinmi": parsed.get("analiz_mumkinmi"),
        "analiz_mumkin_emas_sababi": parsed.get("analiz_mumkin_emas_sababi"),
    }
