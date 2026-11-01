from sqlalchemy import Boolean, Column, Integer, Numeric, SmallInteger, String, Float, Text, DateTime
from database import Base
import datetime

class ECGAnalyse(Base):
    __tablename__ = "ecg_analyses" # Bazadagi mavjud jadval nomi

    # Yumshoq o'chirish (T-027) — EF migratsiyasida yaratilgan; faqat o'qish uchun
    deleted_at = Column(DateTime, nullable=True)

    id = Column(Integer, primary_key=True, index=True)
    # Python atributi eski nomda qoladi — u API form maydoni va
    # boshqa modullar bilan bog'langan. Bazadagi ustun esa
    # `patient_id` deb tuzatildi (T-068).
    patcient_id = Column("patient_id", Integer)
    created_doctor_id = Column(Integer)
    clinic_id = Column(Integer)
    status = Column(Integer)
    document_number = Column(Text, nullable=True)
    analyse_file_link = Column(Text)
    generated_file_link = Column(Text)
    generated_short_file_link = Column(Text)
    ai_answer_data = Column(Text, nullable=True)
    analysis_date = Column(DateTime, nullable=True)

    # Yuklangan faylning SHA-256 xeshi — takroriy yuklashni
    # aniqlash uchun (T-096, `duplicate_guard.py`)
    file_hash = Column(String(64), nullable=True)

    # Yuklangan faylning ASL nomi. Diskdagi nom UUID (T-099) —
    # asl nom yo'lga tushmaydi, chunki u bemor familiyasini yoki
    # qanday tahlil topshirilganini oshkor qilishi mumkin (T-101).
    original_filename = Column(String(255), nullable=True)

    # AI xulosasi qaysi tilda yaratilgani (T-059). Interfeys tili
    # boshqa bo'lsa foydalanuvchiga buni aytish uchun.
    ai_lang = Column(String(5), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class LabAnalyses(Base):
    __tablename__ = "lab_analyses"

    # Yumshoq o'chirish (T-027) — EF migratsiyasida yaratilgan; faqat o'qish uchun
    deleted_at = Column(DateTime, nullable=True)

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer)
    # Python atributi eski nomda qoladi — u API form maydoni va
    # boshqa modullar bilan bog'langan. Bazadagi ustun esa
    # `patient_id` deb tuzatildi (T-068).
    patcient_id = Column("patient_id", Integer)
    created_doctor_id = Column(Integer)

    status = Column(Integer, default=0)
    document_number = Column(Text, nullable=True)

    analyse_file_link = Column(String, nullable=True)
    ai_answer_data = Column(String, nullable=True)  # text
    analysis_date = Column(DateTime, nullable=True)
    # `user` — formada kiritilgan, `document` — fayldan olingan, NULL — noma'lum
    analysis_date_source = Column(String(16), nullable=True)

    # Yuklangan faylning SHA-256 xeshi — takroriy yuklashni
    # aniqlash uchun (T-096, `duplicate_guard.py`)
    file_hash = Column(String(64), nullable=True)

    # Yuklangan faylning ASL nomi. Diskdagi nom UUID (T-099) —
    # asl nom yo'lga tushmaydi, chunki u bemor familiyasini yoki
    # qanday tahlil topshirilganini oshkor qilishi mumkin (T-101).
    original_filename = Column(String(255), nullable=True)

    # AI xulosasi qaysi tilda yaratilgani (T-059). Interfeys tili
    # boshqa bo'lsa foydalanuvchiga buni aytish uchun.
    ai_lang = Column(String(5), nullable=True)

    # Ko'rsatkich qiymatlari endi `lab_analysis_values` da (har biri alohida
    # qator) — `LabAnalysisValues`. Eski 87 ta ustun bazada zaxira sifatida
    # turibdi (migratsiya 20261101000000_LabAnalysisValues), lekin ularga
    # endi yozilmaydi va ulardan o'qilmaydi.

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class HolterAnalyses(Base):
    __tablename__ = "holter_analyses"

    # Yumshoq o'chirish (T-027) — EF migratsiyasida yaratilgan; faqat o'qish uchun
    deleted_at = Column(DateTime, nullable=True)

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer)
    # Python atributi eski nomda qoladi — u API form maydoni va
    # boshqa modullar bilan bog'langan. Bazadagi ustun esa
    # `patient_id` deb tuzatildi (T-068).
    patcient_id = Column("patient_id", Integer)
    created_doctor_id = Column(Integer)
    main_doctor_id = Column(Integer)

    status = Column(Integer, default=0)
    document_number = Column(Text, nullable=True)

    analyse_file_link = Column(String, nullable=True)
    ai_answer_data = Column(String, nullable=True)  # text
    analysis_date = Column(DateTime, nullable=True)

    # Yuklangan faylning SHA-256 xeshi — takroriy yuklashni
    # aniqlash uchun (T-096, `duplicate_guard.py`)
    file_hash = Column(String(64), nullable=True)

    # Yuklangan faylning ASL nomi. Diskdagi nom UUID (T-099) —
    # asl nom yo'lga tushmaydi, chunki u bemor familiyasini yoki
    # qanday tahlil topshirilganini oshkor qilishi mumkin (T-101).
    original_filename = Column(String(255), nullable=True)

    # AI xulosasi qaysi tilda yaratilgani (T-059). Interfeys tili
    # boshqa bo'lsa foydalanuvchiga buni aytish uchun.
    ai_lang = Column(String(5), nullable=True)


    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SmadAnalyses(Base):
    __tablename__ = "smad_analyses"

    # Yumshoq o'chirish (T-027) — EF migratsiyasida yaratilgan; faqat o'qish uchun
    deleted_at = Column(DateTime, nullable=True)

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer)
    # Python atributi eski nomda qoladi — u API form maydoni va
    # boshqa modullar bilan bog'langan. Bazadagi ustun esa
    # `patient_id` deb tuzatildi (T-068).
    patcient_id = Column("patient_id", Integer)
    created_doctor_id = Column(Integer)
    main_doctor_id = Column(Integer)

    status = Column(Integer, default=0)
    document_number = Column(Text, nullable=True)

    analyse_file_link = Column(String, nullable=True)
    ai_answer_data = Column(String, nullable=True)  # text
    analysis_date = Column(DateTime, nullable=True)

    # Yuklangan faylning SHA-256 xeshi — takroriy yuklashni
    # aniqlash uchun (T-096, `duplicate_guard.py`)
    file_hash = Column(String(64), nullable=True)

    # Yuklangan faylning ASL nomi. Diskdagi nom UUID (T-099) —
    # asl nom yo'lga tushmaydi, chunki u bemor familiyasini yoki
    # qanday tahlil topshirilganini oshkor qilishi mumkin (T-101).
    original_filename = Column(String(255), nullable=True)

    # AI xulosasi qaysi tilda yaratilgani (T-059). Interfeys tili
    # boshqa bo'lsa foydalanuvchiga buni aytish uchun.
    ai_lang = Column(String(5), nullable=True)


    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)



class MedicalDiagnoses(Base):
    __tablename__ = "medical_diagnoses" # Bazadagi mavjud jadval nomi
    
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer)
    # Python atributi eski nomda qoladi — u API form maydoni va
    # boshqa modullar bilan bog'langan. Bazadagi ustun esa
    # `patient_id` deb tuzatildi (T-068).
    patcient_id = Column("patient_id", Integer)
    created_doctor_id = Column(Integer)
    main_doctor_id = Column(Integer)
    diagnose_file_link = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class ECGAnalyseDoctors(Base):
    __tablename__ = "ecg_analyse_doctors" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    ecg_analyse_id = Column(Integer)
    doctor_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class LabAnalyseDoctors(Base):
    __tablename__ = "lab_analyse_doctors" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    lab_analyse_id = Column(Integer)
    doctor_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class SmadAnalyseDoctors(Base):
    __tablename__ = "smad_analyse_doctors" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    smad_analyse_id = Column(Integer)
    doctor_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class HolterAnalyseDoctors(Base):
    __tablename__ = "holter_analyse_doctors" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    holter_analyse_id = Column(Integer)
    doctor_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class ECGAnalyseComplaints(Base):
    __tablename__ = "ecg_analyse_complaints" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    ecg_analyse_id = Column(Integer)
    complaint_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class LabAnalysisFiles(Base):
    # Laboratoriya tahliliga biriktirilgan fayllar (bitta yoki bir nechta).
    # Jadval EF Core migratsiyasida yaratiladi (20260907000000_AddLabAnalysisFiles);
    # bu yerda faqat mavjud jadvalga moslashtirilgan model.
    __tablename__ = "lab_analysis_files"

    id = Column(Integer, primary_key=True, index=True)
    lab_analysis_id = Column(Integer)
    file_link = Column(String)
    original_filename = Column(String)
    file_hash = Column(String)
    position = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class LabValueTypes(Base):
    # Laboratoriya ko'rsatkichlari katalogi — yagona manba (EF jadvali).
    # AI sxemasi (`enum`), prompt ro'yxati va birlik me'yorlari shundan
    # quriladi (`lab_catalog.py`). Yangi ko'rsatkich = shu jadvalga qator.
    __tablename__ = "lab_value_types"

    id = Column(Integer, primary_key=True)
    name_uz = Column(String)
    name_ru = Column(String)
    name_en = Column(String)
    measure = Column(String)
    normal_min_male = Column(Float)
    normal_max_male = Column(Float)
    normal_min_female = Column(Float)
    normal_max_female = Column(Float)
    column_name = Column(String)
    category = Column(String)
    value_kind = Column(String)
    sort_order = Column(Integer)
    ai_hint = Column(Text)


class LabAnalysisValues(Base):
    # Bitta tahlilning bitta ko'rsatkichi = bitta qator (migratsiya
    # 20261101000000_LabAnalysisValues). Yozuvchi — `lab_analyse.replace_lab_values`.
    __tablename__ = "lab_analysis_values"

    id = Column(Integer, primary_key=True)
    lab_analysis_id = Column(Integer, nullable=False)
    value_type_id = Column(Integer, nullable=False)
    patient_id = Column(Integer, nullable=False)
    measured_at = Column(DateTime(timezone=True), nullable=False)
    value = Column(Numeric, nullable=True)
    unit = Column(String(64), nullable=True)
    text = Column(String(200), nullable=True)
    original_value = Column(Numeric, nullable=True)
    original_unit = Column(String(64), nullable=True)
    unit_mismatch = Column(Boolean, nullable=False, default=False)
    flag = Column(SmallInteger, nullable=True)
    flag_source = Column(String(8), nullable=True)  # lab | catalog
    # Laboratoriyaning o'z me'yori (fayldan, `value` bilan bir xil birlikda)
    ref_low = Column(Numeric, nullable=True)
    ref_high = Column(Numeric, nullable=True)
    ref_text = Column(String(300), nullable=True)
    # Sifat natijasi: NEGATIVE | POSITIVE | EQUIVOCAL | INVALID | UNKNOWN
    result_kind = Column(String(16), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)


class LabAnalyseCategories(Base):
    __tablename__ = "lab_analyse_categories" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    lab_analyse_id = Column(Integer)
    category_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class CombinedAnalyses(Base):
    """Bemorning bir nechta tahlilini birgalikda tahlil qilgan AI xulosasi.

    Jadval .NET tomondagi EF Core migratsiyasi bilan yaratiladi
    (`20260906000000_AddCombinedAnalyses`) — bu yerda faqat mavjud
    jadval aks ettiriladi (loyiha qoidasi: sxemani Python o'zgartirmaydi).
    """
    __tablename__ = "combined_analyses"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer)
    clinic_id = Column(Integer)
    created_doctor_id = Column(Integer)

    #: 0 = yaratildi, 1 = AI kutmoqda, 2 = tayyor, -1 = xatolik
    status = Column(Integer, default=0)

    #: "summary" (faqat xulosalar) yoki "deep" (EKG rasmlari bilan)
    mode = Column(String(10), default="summary")

    ai_answer_data = Column(Text, nullable=True)
    ai_lang = Column(String(5), nullable=True)
    model_used = Column(String(50), nullable=True)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    source_fingerprint = Column(String(64), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class CombinedAnalysisItems(Base):
    """Kompleks xulosaga kirgan bitta tahlilga havola (polimorf)."""
    __tablename__ = "combined_analysis_items"

    id = Column(Integer, primary_key=True, index=True)
    combined_analysis_id = Column(Integer)

    #: "ecg" | "holter" | "smad" | "lab"
    analysis_type = Column(String(20))
    analysis_id = Column(Integer)

    snapshot_date = Column(DateTime, nullable=True)
    snapshot_severity = Column(Integer, nullable=True)
