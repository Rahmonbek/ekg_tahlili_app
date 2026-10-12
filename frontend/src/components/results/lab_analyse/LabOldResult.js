import React from 'react';
import { useTranslation } from 'react-i18next';
import ResultCard from '../ResultCard';

/**
 * Laboratoriya natijasi kartochkasi. Ko'rinish va mantiq — umumiy
 * `ResultCard`; fayllar ro'yxati (bir nechta bo'lishi mumkin) DTO dagi
 * `files` dan olinadi. Kategoriyalar faqat eski yozuvlarda bor —
 * yuklash sahifasidan bu bo'lim olib tashlangan.
 */
export default function LabOldResult({ data, initialOpen = false, showMeta = true }) {
  const { t } = useTranslation();
  const categories = (data?.categories ?? [])
    .map((c) => c?.[`name${t('data_lang')}`])
    .filter(Boolean)
    .join(', ');

  return (
    <ResultCard
      kind="lab"
      data={data}
      initialOpen={initialOpen}
      showMeta={showMeta}
      image={data?.analyseFileLink}
      metaRows={[{ label: t('lab_categories'), value: categories }]}
    />
  );
}
