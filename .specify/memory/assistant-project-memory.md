# Assistant Project Memory (NMED EKG Tahlili App)

**Last updated**: 2026-04-25  
**Repo root**: `D:\git\ekg_tahlili_app`

## 1) Stack & Services
- **Frontend**: React 18 + Ant Design v5 (`frontend/src`)
- **Backend**: .NET 8 Web API (`backend/EkgAnalyzerApi`)
- **AI Service**: FastAPI + Python (`python_back`)
- **DB**: PostgreSQL `med_helper_data`

## 2) Critical Rules (Do Not Break)
- Frontend must call **.NET API only** (no direct frontend -> Python calls).
- Python production logs: `logging.getLogger(__name__)`, not `print()`.
- DB schema source of truth is **EF Core migrations** (not Python-side schema changes).
- No empty `catch` blocks in .NET; always log at least with `ILogger`.
- Secrets must come from environment variables.
- JWT fallback to anonymous is forbidden; missing secret should fail fast.

## 3) Analysis Modules
- EKG, Lab, Holter, SMAD: numeric status (`0,1,2,-1`)
- Parasitology: string status (`pending`, `analyzed`, `not_analyzed`, `failed`)

## 4) High-traffic Frontend Files
- Layout: `frontend/src/pages/cabinet/Main.js`
- Sidebar/header: `frontend/src/components/SideBar.js`, `frontend/src/components/Header.js`
- Global styling: `frontend/src/App.css`
- Shared view header: `frontend/src/components/shared/AnalyseViewHeader.js`
- PDF button: `frontend/src/components/DownloadReportButton.js`
- Analyzer pages:
  - `frontend/src/pages/cabinet/ecg_analyse/EcgAnalyzer.js`
  - `frontend/src/pages/cabinet/lab_analyse/LabAnalyzer.js`
  - `frontend/src/pages/cabinet/holter_analyse/HolterAnalyzer.js`
  - `frontend/src/pages/cabinet/smad_analyse/SmadAnalyzer.js`
  - `frontend/src/pages/cabinet/parasitology/ParasitologyAnalyzer.js`

## 5) High-traffic Backend Files
- PDF generator: `backend/EkgAnalyzerApi/Services/PdfReportService.cs`
- EKG API controller: `backend/EkgAnalyzerApi/Controllers/ECGAnalyseController.cs`
- EKG service logic: `backend/EkgAnalyzerApi/Services/ECGAnalyseService.cs`

## 6) Recent UI/PDF Focus Areas
- `analysis-view-actions` alignment and responsive behavior
- Parasitology AI summary formatting in PDF (avoid raw JSON dump)
- PDF header readability + clinic phone display
- Lighter PDF font weights for readability
- EKG PDF source image output (if source file is image-compatible)

## 7) Responsive & UX Notes
- Desktop/tablet/mobile breakpoints are primarily managed in `frontend/src/App.css`.
- Sidebar state:
  - Desktop (`>1024px`): persisted in localStorage key `nmed.sidebar.open.desktop`
  - Tablet/mobile (`<=1024px`): starts closed

## 8) Helpful Build Commands
- Backend build:
  - `dotnet build .\backend\EkgAnalyzerApi\EkgAnalyzerApi.csproj -p:UseAppHost=false -v minimal`
- Frontend build:
  - `node .\node_modules\react-scripts\bin\react-scripts.js build`

## 9) Known Practical Notes
- Repo may contain pre-existing eslint warnings in frontend build output.
- `bin/` and `obj/` artifacts can appear as changed after local builds.
- If executable lock happens during backend build, ensure running API process is stopped.
