import React from 'react';
import ClinicHeader from './ClinicHeader';
import AnalysisResultBody from './AnalysisResultBody';

// Tahlil bajarilgandan keyingi ko'rinish. Butun mazmun
// `AnalysisResultBody` da — ilgari u sakkiz faylda takrorlanardi (T-034).
export default function EcgResult({ error, result, image, image_short, clinic }) {
  return (
    <div>
      <ClinicHeader clinic={clinic} />
      <AnalysisResultBody
        kind="ecg"
        result={result}
        image={image}
        imageShort={image_short}
        error={error}
      />
    </div>
  );
}
