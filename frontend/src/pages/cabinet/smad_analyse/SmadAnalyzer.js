/**
 * SMAD hisobotini yuklash sahifasi (`/analyse-smad`).
 *
 * Ko'rinish va mantiq — umumiy `MonitoringAnalyzer` (Holter bilan bir xil);
 * bu yerda faqat SMAD ga xos sozlamalar.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import MonitoringAnalyzer from '../../../components/analyzer/MonitoringAnalyzer';
import { analyzeSmadFile } from '../../../host/smadService';
import { get_smad_analyses_by_patcient_id } from '../../../host/requests/SmadAnalyseRequest';
import SmadOldResult from '../../../components/results/smad_analyse/SmadOldResult';

export default function SmadAnalyzer() {
    const { t } = useTranslation();

    const config = useMemo(() => ({
        kind: 'smad',
        upload: analyzeSmadFile,
        fetchOldAnalyses: get_smad_analyses_by_patcient_id,
        OldResult: SmadOldResult,
        listPath: '/smad-analyses',
        bgLabel: 'SMAD tahlil',
        text: {
            title: t('create_new_smad_analyse', { defaultValue: 'SMAD tahlil yuklash' }),
            subtitle: t('smad_upload_subtitle', { defaultValue: '3 ta qadam: bemorni toping, SMAD hisobotini yuklang va tahlilga yuboring.' }),
            fileTitle: t('smad_upload_step_file', { defaultValue: 'SMAD hisoboti' }),
            fileHint: t('alert_smad'),
            fileName: t('smad_upload_check_file', { defaultValue: 'SMAD hisoboti' }),
            needFile: t('smad_upload_need_file', { defaultValue: 'SMAD hisobotini yuklang' }),
            author: t('smad_doctor'),
            history: t('smad_upload_history', { defaultValue: 'Bemorning oldingi SMAD tahlillari' }),
        },
    }), [t]);

    return <MonitoringAnalyzer config={config} />;
}
