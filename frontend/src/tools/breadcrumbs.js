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
};

/**
 * Joriy pathname bo'yicha breadcrumb zanjirini qaytaradi.
 * @param {string} pathname - location.pathname
 * @returns {{ path: string, labelKey: string }[]}
 */
export function buildCrumbs(pathname) {
  const normalizedPath = pathname.replace(/\/doctor\/create\/\d+$/, '/doctor/create');
  const crumbs = [];
  let current = normalizedPath;
  while (current && BREADCRUMB_CONFIG[current]) {
    crumbs.unshift({ path: current, labelKey: BREADCRUMB_CONFIG[current].labelKey });
    current = BREADCRUMB_CONFIG[current].parent;
  }
  return crumbs;
}
