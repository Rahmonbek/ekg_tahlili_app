import React from 'react';
import { useTranslation } from 'react-i18next';
import ResultCard from '../ResultCard';

/**
 * Holter natijasi kartochkasi. Ko'rinish va mantiq — umumiy `ResultCard`;
 * bu yerda faqat Holter ga xos ma'lumot: hisobot muallifi.
 */
export default function HolterOldResult({ data, initialOpen = false, showMeta = true }) {
  const { t } = useTranslation();
  const author = data?.mainDoctor
    ? `${data.mainDoctor.lastName ?? ''} ${data.mainDoctor.firstName ?? ''}`.trim()
    : '';

  return (
    <ResultCard
      kind="holter"
      data={data}
      initialOpen={initialOpen}
      showMeta={showMeta}
      image={data?.analyseFileLink}
      metaRows={[{ label: t('holter_doctor'), value: author }]}
    />
  );
}
