import React from 'react';
import { useTranslation } from 'react-i18next';
import ResultCard from './ResultCard';

/**
 * EKG natijasi kartochkasi. Ko'rinish va mantiq — umumiy `ResultCard`;
 * bu yerda faqat EKG ga xos ma'lumot: shikoyatlar va EKG rasmi.
 */
export default function EcgOldResult({ data, initialOpen = false, showMeta = true }) {
  const { t } = useTranslation();
  const complaints = (data?.complaints ?? [])
    .map((c) => c?.[`name${t('data_lang')}`])
    .filter(Boolean)
    .join(', ');

  return (
    <ResultCard
      kind="ecg"
      data={data}
      initialOpen={initialOpen}
      showMeta={showMeta}
      image={data?.generatedFileLink}
      imageShort={data?.generatedShortFileLink}
      metaRows={[{ label: t('complaints'), value: complaints }]}
    />
  );
}
