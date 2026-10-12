/**
 * Holter hisobotini yuklash sahifasi (`/analyse-holter`).
 *
 * Ko'rinish va mantiq — umumiy `MonitoringAnalyzer` (SMAD bilan bir xil);
 * bu yerda faqat Holter ga xos sozlamalar.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import MonitoringAnalyzer from '../../../components/analyzer/MonitoringAnalyzer';
import { analyzeHolterFile } from '../../../host/holterService';
import { get_holter_analyses_by_patcient_id } from '../../../host/requests/HolterAnalyseRequest';
import HolterOldResult from '../../../components/results/holter_analyse/HolterOldResult';

export default function HolterAnalyzer() {
    const { t } = useTranslation();

    const config = useMemo(() => ({
        kind: 'holter',
        upload: analyzeHolterFile,
        fetchOldAnalyses: get_holter_analyses_by_patcient_id,
        OldResult: HolterOldResult,
        listPath: '/holter-analyses',
        bgLabel: 'Holter tahlil',
        text: {
            title: t('create_new_holter_analyse', { defaultValue: 'Holter tahlil yuklash' }),
            subtitle: t('holter_upload_subtitle', { defaultValue: '3 ta qadam: bemorni toping, Holter hisobotini yuklang va tahlilga yuboring.' }),
            fileTitle: t('holter_upload_step_file', { defaultValue: 'Holter hisoboti' }),
            fileHint: t('alert_holter'),
            fileName: t('holter_upload_check_file', { defaultValue: 'Holter hisoboti' }),
            needFile: t('holter_upload_need_file', { defaultValue: 'Holter hisobotini yuklang' }),
            author: t('holter_doctor'),
            history: t('holter_upload_history', { defaultValue: 'Bemorning oldingi Holter tahlillari' }),
        },
    }), [t]);

    return <MonitoringAnalyzer config={config} />;
}
