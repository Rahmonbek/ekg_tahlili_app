from sqlalchemy.orm import Session
from models import LabAnalyses, LabAnalysisFiles
import datetime
from typing import Optional

def get_lab_analyse_by_id(session: Session, analyse_id: int) -> Optional[LabAnalyses]:
    """
    Ma'lum ID bo'yicha LabAnalyses yozuvini qaytaradi.
    Agar yozuv topilmasa, None qaytaradi.
    """
    return session.query(LabAnalyses).filter(LabAnalyses.id == analyse_id).first()


def create_lab_analyse(
    session: Session,
    patient_id: int,
    created_doctor_id: int,
    clinic_id: int,
    status: int = 0,
    
    analyse_file_link: Optional[str] = None,
    ai_answer_data: Optional[str] = None,
    hb: Optional[float] = None,
    rbc: Optional[float] = None,
    wbc: Optional[float] = None,
    plt: Optional[float] = None,
    hct: Optional[float] = None,
    mcv: Optional[float] = None,
    mch: Optional[float] = None,
    mchc: Optional[float] = None,
    esr: Optional[float] = None,
    glucose: Optional[float] = None,
    cholesterol: Optional[float] = None,
    alt: Optional[float] = None,
    ast: Optional[float] = None,
    bilirubin_total: Optional[float] = None,
    bilirubin_direct: Optional[float] = None,
    creatinine: Optional[float] = None,
    urea: Optional[float] = None,
    total_protein: Optional[float] = None,
    albumin: Optional[float] = None,
    calcium: Optional[float] = None,
    sodium: Optional[float] = None,
    potassium: Optional[float] = None,
    iron: Optional[float] = None,
    tsh: Optional[float] = None,
    free_t4: Optional[float] = None,
    insulin: Optional[float] = None,
    urine_volume: Optional[float] = None,
    urine_density: Optional[float] = None,
    urine_ph: Optional[float] = None,
    urine_protein: Optional[float] = None,
    urine_glucose: Optional[float] = None,
    urine_ketones: Optional[float] = None,
    urine_bilirubin: Optional[float] = None,
    urobilinogen: Optional[float] = None,
    urine_rbc: Optional[int] = None,
    urine_wbc: Optional[int] = None,
    daily_protein: Optional[float] = None,
    daily_creatinine: Optional[float] = None,
    daily_calcium: Optional[float] = None,
    daily_sodium: Optional[float] = None,
    analysis_date: Optional[datetime.datetime] = None
) -> LabAnalyses:
    """
    Yangi laboratoriya tahlilini yaratadi.
    """
    new_lab = LabAnalyses(
        patcient_id=patient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=status,
        analyse_file_link=analyse_file_link,
        ai_answer_data=ai_answer_data,
        hb=hb,
        rbc=rbc,
        wbc=wbc,
        plt=plt,
        hct=hct,
        mcv=mcv,
        mch=mch,
        mchc=mchc,
        esr=esr,
        glucose=glucose,
        cholesterol=cholesterol,
        alt=alt,
        ast=ast,
        bilirubin_total=bilirubin_total,
        bilirubin_direct=bilirubin_direct,
        creatinine=creatinine,
        urea=urea,
        total_protein=total_protein,
        albumin=albumin,
        calcium=calcium,
        sodium=sodium,
        potassium=potassium,
        iron=iron,
        tsh=tsh,
        free_t4=free_t4,
        insulin=insulin,
        urine_volume=urine_volume,
        urine_density=urine_density,
        urine_ph=urine_ph,
        urine_protein=urine_protein,
        urine_glucose=urine_glucose,
        urine_ketones=urine_ketones,
        urine_bilirubin=urine_bilirubin,
        urobilinogen=urobilinogen,
        urine_rbc=urine_rbc,
        urine_wbc=urine_wbc,
        daily_protein=daily_protein,
        daily_creatinine=daily_creatinine,
        daily_calcium=daily_calcium,
        daily_sodium=daily_sodium,
        analysis_date=analysis_date,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    session.add(new_lab)
    session.commit()
    session.refresh(new_lab)

    # Document number generatsiya (o'zgarmas, takrorlanmas)
    new_lab.document_number = f"NMED-LAB-{str(new_lab.id).zfill(8)}"
    session.commit()

    return new_lab


def update_lab_analyse(
    session: Session,
    analyse_id: int,
    status: Optional[int] = None,
    analyse_file_link: Optional[str] = None,
    ai_answer_data: Optional[str] = None,
    clear_ai_answer: bool = False,
    # Laboratoriya ko'rsatkichlari endi ustunma-ustun sanab o'tilmaydi:
    # AI aniqlagan qiymatlar (column_name -> value) shu yerga tushadi
    # (`update_lab_analyse(**digital_values)`). Yangi ustun qo'shilganda
    # bu funksiyani o'zgartirish SHART EMAS — `lab_analyses` jadvalining
    # haqiqiy ustunlari oq ro'yxat sifatida ishlatiladi (pastda), shuning
    # uchun yangi ko'rsatkichlar avtomatik qo'llab-quvvatlanadi (T-035+).
    **lab_values,
) -> Optional[LabAnalyses]:
    """
    LabAnalyses yozuvini yangilaydi.
    Agar yozuv topilmasa, None qaytaradi.
    AI tomonidan aniqlangan barcha parametrlar ham bazaga yoziladi.
    """

    lab = session.query(LabAnalyses).filter(LabAnalyses.id == analyse_id).first()
    if not lab:
        return None

    # Asosiy (laboratoriya ko'rsatkichi bo'lmagan) maydonlar
    base_fields = {
        "status": status,
        "analyse_file_link": analyse_file_link,
        "ai_answer_data": ai_answer_data,
    }
    for field, value in base_fields.items():
        if value is not None:
            setattr(lab, field, value)

    # Laboratoriya ko'rsatkichlari — faqat `lab_analyses` jadvalida
    # HAQIQATAN mavjud ustunlar yoziladi. `c.key` model atributi nomini
    # beradi ("hb", "crp", ...) — noma'lum yoki noto'g'ri kalit jimgina
    # o'tkazib yuboriladi (kelgan qiymat AI sxemasida allaqachon
    # tekshirilgan, bu esa qo'shimcha himoya).
    valid_columns = {c.key for c in LabAnalyses.__table__.columns}
    for col, value in lab_values.items():
        if value is None or col not in valid_columns:
            continue
        setattr(lab, col, value)

    

    # Aniq tozalash: `None` "tegma" degani, shuning uchun

    # o'chirish uchun alohida bayroq (T-036).

    # Aniq tozalash: yuqoridagi sikl `None` ni "bu maydonga tegma" deb
    # qabul qiladi, shuning uchun o'chirish uchun alohida bayroq kerak.
    # Ilgari shu maqsadda bo'sh satr yozilardi, lekin ustun `jsonb` ga
    # o'tgach bo'sh satr yaroqsiz bo'lib qoldi (T-036).
    if clear_ai_answer:
        lab.ai_answer_data = None

    lab.updated_at = datetime.datetime.utcnow()
    session.commit()
    session.refresh(lab)
    return lab


def set_lab_analysis_files(session: Session, analyse_id: int, files: list[dict]) -> None:
    """Tahlilning fayllar ro'yxatini to'liq almashtiradi (`lab_analysis_files`).

    `files` — yuklangan tartibda: `{"file_link", "original_filename", "file_hash"}`.
    Birinchi fayl `lab_analyses.analyse_file_link` ga ham yoziladi: shu
    ustunga tayanadigan eski kod (PDF, konsultatsiya) buzilmasligi uchun.

    Bitta tranzaksiyada: eski qatorlar o'chiriladi va yangilari yoziladi —
    yarim yangilangan ro'yxat qolmaydi.
    """
    session.query(LabAnalysisFiles).filter(
        LabAnalysisFiles.lab_analysis_id == analyse_id
    ).delete(synchronize_session=False)
    now = datetime.datetime.utcnow()
    for position, item in enumerate(files):
        session.add(LabAnalysisFiles(
            lab_analysis_id=analyse_id,
            file_link=item["file_link"],
            original_filename=item.get("original_filename"),
            file_hash=item.get("file_hash"),
            position=position,
            created_at=now,
        ))
    if files:
        lab = session.query(LabAnalyses).filter(LabAnalyses.id == analyse_id).first()
        if lab is not None:
            first = files[0]
            lab.analyse_file_link = first["file_link"]
            lab.original_filename = first.get("original_filename")
            lab.file_hash = first.get("file_hash")
            lab.updated_at = now
    session.commit()


def get_lab_analysis_file_links(session: Session, lab: LabAnalyses) -> list[str]:
    """Tahlil fayllari yo'llari, yuklangan tartibda.

    Migratsiyadan oldin yaratilgan va ko'chirilmay qolgan yozuv uchun
    `analyse_file_link` ga qaytadi.
    """
    rows = (
        session.query(LabAnalysisFiles.file_link)
        .filter(LabAnalysisFiles.lab_analysis_id == lab.id)
        .order_by(LabAnalysisFiles.position, LabAnalysisFiles.id)
        .all()
    )
    links = [row[0] for row in rows if row[0]]
    if not links and lab.analyse_file_link:
        links = [lab.analyse_file_link]
    return links
