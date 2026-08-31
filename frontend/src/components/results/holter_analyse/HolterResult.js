import React from 'react';
import ClinicHeader from '../ClinicHeader';
import AnalysisResultBody from '../AnalysisResultBody';

// Tahlil bajarilgandan keyingi ko'rinish. Butun mazmun
// `AnalysisResultBody` da — ilgari u sakkiz faylda takrorlanardi (T-034).
export default function HolterResult({ error, result, image, image_short, clinic }) {
  return (
    <div>
      <ClinicHeader clinic={clinic} />
      <AnalysisResultBody
        kind="holter"
        result={result}
        image={image}
        imageShort={image_short}
        error={error}
      />
    </div>
  );
}
