namespace EkgAnalyzerApi.DTOs
{
    public class AnalysisCountsDto
    {
        public int Ecg { get; set; }
        public int Holter { get; set; }
        public int Smad { get; set; }
        public int Lab { get; set; }
        public int Diagnoses { get; set; }
        public int Parasitology { get; set; }
        public int Total => Ecg + Holter + Smad + Lab + Diagnoses + Parasitology;
    }

    public class DashboardStatisticsDto
    {
        public AnalysisCountsDto Today { get; set; } = new();
        public AnalysisCountsDto AllTime { get; set; } = new();
    }
}
