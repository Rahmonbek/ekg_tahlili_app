from sqlalchemy import Column, Integer, String, Float,Text, DateTime
from database import Base
import datetime

class ECGAnalyse(Base):
    __tablename__ = "ecg_analyses" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    patcient_id = Column(Integer)
    created_doctor_id = Column(Integer)
    status = Column(Integer)
    analyse_file_link = Column(Text)
    generated_file_link = Column(Text)
    generated_short_file_link = Column(Text)
    ai_answer_data = Column(Text, nullable=True)  
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class MedicalDiagnoses(Base):
    __tablename__ = "medical_diagnoses" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    patcient_id = Column(Integer)
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

class ECGAnalyseComplaints(Base):
    __tablename__ = "ecg_analyse_complaints" # Bazadagi mavjud jadval nomi

    id = Column(Integer, primary_key=True, index=True)
    ecg_analyse_id = Column(Integer)
    complaint_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)