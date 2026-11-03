/**
 * Har bir route uchun breadcrumb konfiguratsiyasi.
 * label — i18n kalit so'zi (t() ga beriladi)
 * parent — ota route path (null = eng yuqori daraja)
 */
export const BREADCRUMB_CONFIG = {
  '/':                  { labelKey: 'home',               parent: null },
  '/doctor':            { labelKey: 'staffs',             parent: '/' },
  '/doctor/create':     { labelKey: 'create_doctor',      parent: '/doctor' },
  '/settings':          { labelKey: 'organization_info',  parent: '/' },
  '/ecg-analyses':          { labelKey: 'analyse_ecg',        parent: '/' },
  '/analyse-ecg':           { labelKey: 'new_ecg_analyse',    parent: '/ecg-analyses' },
  '/ecg-analyses/view':     { labelKey: 'view_analyse',       parent: '/ecg-analyses' },
  '/holter-analyses':       { labelKey: 'analyse_holter',     parent: '/' },
  '/analyse-holter':        { labelKey: 'new_holter_analyse', parent: '/holter-analyses' },
  '/holter-analyses/view':  { labelKey: 'view_analyse',       parent: '/holter-analyses' },
  '/smad-analyses':         { labelKey: 'analyse_smad',       parent: '/' },
  '/analyse-smad':          { labelKey: 'new_smad_analyse',   parent: '/smad-analyses' },
  '/smad-analyses/view':    { labelKey: 'view_analyse',       parent: '/smad-analyses' },
  '/lab-analyses':          { labelKey: 'analyse_lab',        parent: '/' },
  '/analyse-lab':           { labelKey: 'new_lab_analyse',    parent: '/lab-analyses' },
  '/lab-analyses/view':     { labelKey: 'view_analyse',       parent: '/lab-analyses' },
  '/patient-diagnoses':     { labelKey: 'patient_diagnostics',parent: '/' },
  '/diagnoses-create':      { labelKey: 'new_diagnose',       parent: '/patient-diagnoses' },
  '/patient-diagnoses/view':{ labelKey: 'view_analyse',       parent: '/patient-diagnoses' },
  '/patcients':             { labelKey: 'patcients',          parent: '/' },
  '/parasitology-analyses': { labelKey: 'parasitology_analyse', parent: '/' },
  '/parasitology-analyzer': { labelKey: 'new_parasitology_analyse', parent: '/parasitology-analyses' },
  '/parasitology-analyses/view': { labelKey: 'view_analyse',    parent: '/parasitology-analyses' },
  // SuperAdmin kabineti
  '/sa/clinics':            { labelKey: 'sa_clinics',         parent: '/' },
  '/sa/clinics/view':       { labelKey: 'sa_clinic',          parent: '/sa/clinics' },
  '/sa/users':              { labelKey: 'sa_users',           parent: '/' },
  '/sa/patients':           { labelKey: 'sa_patients',        parent: '/' },
  '/sa/analyses':           { labelKey: 'sa_analyses',        parent: '/' },
  '/sa/dictionaries':       { labelKey: 'sa_dictionaries',    parent: '/' },
  '/sa/ai-usage':           { labelKey: 'sa_ai_usage',        parent: '/' },
  '/audit-logs':            { labelKey: 'audit_log',          parent: '/' },
  '/system-status':         { labelKey: 'system_status',      parent: '/' },
};

/**
 * Joriy pathname bo'yicha breadcrumb zanjirini qaytaradi.
 * @param {string} pathname - location.pathname
 * @returns {{ path: string, labelKey: string }[]}
 */
export function buildCrumbs(pathname) {
  // Dinamik ID larni olib tashlash (masalan, /ecg-analyses/view/123 -> /ecg-analyses/view)
  const normalizedPath = pathname
    .replace(/\/doctor\/create\/\d+$/, '/doctor/create')
    .replace(/\/view\/\d+$/, '/view')
    .replace(/^\/sa\/clinics\/\d+$/, '/sa/clinics/view');
  
  const crumbs = [];
  let current = normalizedPath;
  while (current && BREADCRUMB_CONFIG[current]) {
    crumbs.unshift({ path: current, labelKey: BREADCRUMB_CONFIG[current].labelKey });
    current = BREADCRUMB_CONFIG[current].parent;
  }
  return crumbs;
}
