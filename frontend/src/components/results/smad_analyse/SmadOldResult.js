import React from 'react';
import { useTranslation } from 'react-i18next';
import ResultCard from '../ResultCard';

/**
 * SMAD natijasi kartochkasi. Ko'rinish va mantiq — umumiy `ResultCard`;
 * bu yerda faqat SMAD ga xos ma'lumot: hisobot muallifi.
 */
export default function SmadOldResult({ data, initialOpen = false, showMeta = true }) {
  const { t } = useTranslation();
  const author = data?.mainDoctor
    ? `${data.mainDoctor.lastName ?? ''} ${data.mainDoctor.firstName ?? ''}`.trim()
    : '';

  return (
    <ResultCard
      kind="smad"
      data={data}
      initialOpen={initialOpen}
      showMeta={showMeta}
      image={data?.analyseFileLink}
      metaRows={[{ label: t('smad_doctor'), value: author }]}
    />
  );
}
