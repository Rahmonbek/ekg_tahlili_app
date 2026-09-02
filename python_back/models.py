from sqlalchemy import Column, Integer,  Numeric, String, Float,Text, DateTime
from database import Base
import datetime

class ECGAnalyse(Base):
    __tablename__ = "ecg_analyses" # Bazadagi mavjud jadval nomi

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

    # Qon tahlili
    hb = Column(Numeric, nullable=True)       # g/L
    rbc = Column(Numeric, nullable=True)      # x10^12/L
    wbc = Column(Numeric, nullable=True)      # x10^9/L
    plt = Column(Numeric, nullable=True)      # x10^9/L
    hct = Column(Numeric, nullable=True)      # %
    mcv = Column(Numeric, nullable=True)      # fL
    mch = Column(Numeric, nullable=True)      # pg
    mchc = Column(Numeric, nullable=True)     # g/L
    esr = Column(Numeric, nullable=True)      # mm/hour
    glucose = Column(Numeric, nullable=True)  # mmol/L
    cholesterol = Column(Numeric, nullable=True)  # mmol/L
    alt = Column(Numeric, nullable=True)      # U/L
    ast = Column(Numeric, nullable=True)      # U/L
    bilirubin_total = Column(Numeric, nullable=True)   # µmol/L
    bilirubin_direct = Column(Numeric, nullable=True)  # µmol/L
    creatinine = Column(Numeric, nullable=True)       # µmol/L
    urea = Column(Numeric, nullable=True)             # mmol/L
    total_protein = Column(Numeric, nullable=True)    # g/L
    albumin = Column(Numeric, nullable=True)          # g/L
    calcium = Column(Numeric, nullable=True)          # mmol/L
    sodium = Column(Numeric, nullable=True)           # mmol/L
    potassium = Column(Numeric, nullable=True)        # mmol/L
    iron = Column(Numeric, nullable=True)             # µmol/L
    tsh = Column(Numeric, nullable=True)              # µIU/mL
    free_t4 = Column(Numeric, nullable=True)          # pmol/L
    insulin = Column(Numeric, nullable=True)          # µIU/mL

    # Peshob tahlili
    urine_volume = Column(Numeric, nullable=True)     # mL
    urine_density = Column(Numeric, nullable=True)    # 1.010–1.025
    urine_ph = Column(Numeric, nullable=True)         # 0–14
    urine_protein = Column(Numeric, nullable=True)    # g/L
    urine_glucose = Column(Numeric, nullable=True)    # mmol/L
    urine_ketones = Column(Numeric, nullable=True)    # mmol/L
    urine_bilirubin = Column(Numeric, nullable=True)  # µmol/L
    urobilinogen = Column(Numeric, nullable=True)     # µmol/L
    urine_rbc = Column(Integer, nullable=True)        # count per field
    urine_wbc = Column(Integer, nullable=True)        # count per field

    # Daily urine measurements
    daily_protein = Column(Numeric, nullable=True)    # mg/24h
    daily_creatinine = Column(Numeric, nullable=True) # mmol/24h
    daily_calcium = Column(Numeric, nullable=True)    # mmol/24h
    daily_sodium = Column(Numeric, nullable=True)     # mmol/24h

    # -- Qo'shimcha ko'rsatkichlar (20260905 migratsiya) --
    # Lipid, koagulyatsiya, qon formulasi, gormon, vitamin, ferment va h.k.
    # AI aniqlagan qiymat shu ustunlarga yoziladi (update_lab_analyse).
    triglycerides = Column(Numeric, nullable=True)  # mmol/L
    hdl = Column(Numeric, nullable=True)  # mmol/L
    ldl = Column(Numeric, nullable=True)  # mmol/L
    vldl = Column(Numeric, nullable=True)  # mmol/L
    atherogenic_index = Column(Numeric, nullable=True)  # None
    hba1c = Column(Numeric, nullable=True)  # %
    c_peptide = Column(Numeric, nullable=True)  # ng/mL
    crp = Column(Numeric, nullable=True)  # mg/L
    ggt = Column(Numeric, nullable=True)  # U/L
    alp = Column(Numeric, nullable=True)  # U/L
    amylase = Column(Numeric, nullable=True)  # U/L
    lipase = Column(Numeric, nullable=True)  # U/L
    ldh = Column(Numeric, nullable=True)  # U/L
    ck = Column(Numeric, nullable=True)  # U/L
    ck_mb = Column(Numeric, nullable=True)  # U/L
    uric_acid = Column(Numeric, nullable=True)  # µmol/L
    magnesium = Column(Numeric, nullable=True)  # mmol/L
    phosphorus = Column(Numeric, nullable=True)  # mmol/L
    chloride = Column(Numeric, nullable=True)  # mmol/L
    ferritin = Column(Numeric, nullable=True)  # µg/L
    tibc = Column(Numeric, nullable=True)  # µmol/L
    transferrin = Column(Numeric, nullable=True)  # g/L
    bilirubin_indirect = Column(Numeric, nullable=True)  # µmol/L
    globulin = Column(Numeric, nullable=True)  # g/L
    free_t3 = Column(Numeric, nullable=True)  # pmol/L
    t3_total = Column(Numeric, nullable=True)  # nmol/L
    t4_total = Column(Numeric, nullable=True)  # nmol/L
    vitamin_d = Column(Numeric, nullable=True)  # ng/mL
    vitamin_b12 = Column(Numeric, nullable=True)  # pg/mL
    folate = Column(Numeric, nullable=True)  # ng/mL
    prothrombin_time = Column(Numeric, nullable=True)  # sekund
    prothrombin_index = Column(Numeric, nullable=True)  # %
    inr = Column(Numeric, nullable=True)  # None
    aptt = Column(Numeric, nullable=True)  # sekund
    fibrinogen = Column(Numeric, nullable=True)  # g/L
    thrombin_time = Column(Numeric, nullable=True)  # sekund
    d_dimer = Column(Numeric, nullable=True)  # mg/L
    neutrophils = Column(Numeric, nullable=True)  # %
    lymphocytes = Column(Numeric, nullable=True)  # %
    monocytes = Column(Numeric, nullable=True)  # %
    eosinophils = Column(Numeric, nullable=True)  # %
    basophils = Column(Numeric, nullable=True)  # %
    rdw = Column(Numeric, nullable=True)  # %
    mpv = Column(Numeric, nullable=True)  # fL
    pdw = Column(Numeric, nullable=True)  # %
    pct = Column(Numeric, nullable=True)  # %
    reticulocytes = Column(Numeric, nullable=True)  # %

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class HolterAnalyses(Base):
    __tablename__ = "holter_analyses"

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

class LabAnalyseCategories(Base):
    __tablename__ = "lab_analyse_categories" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    lab_analyse_id = Column(Integer)
    category_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)