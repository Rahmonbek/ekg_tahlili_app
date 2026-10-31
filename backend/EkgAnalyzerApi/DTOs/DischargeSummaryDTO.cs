namespace EkgAnalyzerApi.DTOs;

/// <summary>Vipiskaga kiritiladigan tahlilga havola.</summary>
public class DischargeItemRefDTO
{
    /// <summary>"ecg" | "holter" | "smad" | "lab" | "para"</summary>
    public string Type { get; set; } = string.Empty;
    public int Id { get; set; }
}

public class DischargePrescriptionDTO
{
    public string DrugName { get; set; } = string.Empty;
    public string? Dose { get; set; }
    public string? Frequency { get; set; }
    public string? IntakeTime { get; set; }
    public string? Duration { get; set; }
}

/// <summary>Yaratish va tahrirlash so'rovi (ikkalasi uchun bitta shakl).</summary>
public class DischargeSaveRequest
{
    public int PatientId { get; set; }
    public string HistoryNumber { get; set; } = string.Empty;
    public DateOnly DocumentDate { get; set; }
    public DateOnly AdmissionDate { get; set; }
    public DateOnly DischargeDate { get; set; }

    public string? DiagnosisMain { get; set; }
    public string? DiagnosisConcomitant { get; set; }
    public string? DiagnosisComplications { get; set; }

    public List<int> ComplaintIds { get; set; } = new();
    public string? ComplaintsText { get; set; }
    public string? Anamnesis { get; set; }
    public string? ObjectiveStatus { get; set; }

    public List<DischargeItemRefDTO> Items { get; set; } = new();
    public List<int> ConsultationIds { get; set; } = new();

    public string? Treatment { get; set; }
    public string? DischargeCondition { get; set; }
    public List<DischargePrescriptionDTO> Prescriptions { get; set; } = new();
    public string? RecommendationsText { get; set; }
    public bool IncludePatientCopy { get; set; } = true;
}

/// <summary>Tahlilga yozilgan shifokor xulosasi — diagnoz tanlash uchun.</summary>
public class DischargeConclusionDTO
{
    public int Id { get; set; }
    public string? DoctorName { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
}

/// <summary>Vipiskaga tanlash mumkin bo'lgan tahlil.</summary>
public class DischargeCandidateAnalysisDTO
{
    public string Type { get; set; } = string.Empty;
    public int Id { get; set; }
    public DateTime? Date { get; set; }
    public string? DocumentNumber { get; set; }
    public int? Severity { get; set; }

    /// <summary>AI xulosasining qisqa matni (ko'rish uchun).</summary>
    public string? Summary { get; set; }

    /// <summary>Tahlil shu shifokorga yo'naltirilgan yoki u yuklagan.</summary>
    public bool AssignedToMe { get; set; }

    /// <summary>Tahlil sanasi yotqizilish–chiqarilish oralig'ida.</summary>
    public bool InPeriod { get; set; }

    public List<DischargeConclusionDTO> Conclusions { get; set; } = new();
}

public class DischargeCandidateConsultationDTO
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public string? DoctorName { get; set; }
    public string? ClinicName { get; set; }
    public string? PatientCondition { get; set; }
    public string? Diagnosis { get; set; }
    public string? Treatment { get; set; }
}

/// <summary>
/// Bemorning tayyor kompleks AI xulosasi — vipiskaga tanlangan tahlillardan
/// kamida bittasi unda qatnashgan bo'lsa, diagnoz bo'limida ko'rsatiladi
/// (qaysi tahlillar tanlanganini frontend biladi, filtr o'sha yerda).
/// </summary>
public class DischargeCandidateCombinedDTO
{
    public int Id { get; set; }
    public DateTime? CreatedAt { get; set; }
    public int? Severity { get; set; }

    /// <summary>AI ning yakuniy xulosasi (`final_summary`).</summary>
    public string? Summary { get; set; }

    public List<DischargeItemRefDTO> Items { get; set; } = new();

    /// <summary>Kompleks xulosaning o'ziga yozilgan shifokor xulosalari.</summary>
    public List<DischargeConclusionDTO> Conclusions { get; set; } = new();
}

public class DischargeCandidatesDTO
{
    public List<DischargeCandidateAnalysisDTO> Analyses { get; set; } = new();
    public List<DischargeCandidateConsultationDTO> Consultations { get; set; } = new();
    public List<DischargeCandidateCombinedDTO> Combined { get; set; } = new();
}

public class DischargeListItemDTO
{
    public int Id { get; set; }
    public string HistoryNumber { get; set; } = string.Empty;
    public DateOnly DocumentDate { get; set; }
    public DateOnly AdmissionDate { get; set; }
    public DateOnly DischargeDate { get; set; }
    public string? DoctorName { get; set; }
    public string? DiagnosisMain { get; set; }
    public bool IsMine { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class DischargeByPatientDTO
{
    /// <summary>Joriy foydalanuvchi shu bemorga vipiska chiqara oladimi.</summary>
    public bool CanCreate { get; set; }
    public List<DischargeListItemDTO> Items { get; set; } = new();
}

public class DischargeDetailDTO : DischargeSaveRequest
{
    public int Id { get; set; }
    public string? DoctorName { get; set; }
    public bool IsMine { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public string? PatientFirstName { get; set; }
    public string? PatientLastName { get; set; }
    public DateOnly? PatientBirthDate { get; set; }
    public bool? PatientGender { get; set; }
}
