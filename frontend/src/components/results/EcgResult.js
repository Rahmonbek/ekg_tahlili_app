import { Image, Tag } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, StarOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { apiEcg } from '../../host/Host'
import ClinicHeader from './ClinicHeader'

const SEVERITY_TAG = {
  1: <Tag color="success" icon={<CheckCircleOutlined />}>Normal</Tag>,
  2: <Tag color="warning" icon={<ExclamationCircleOutlined />}>O'rtacha</Tag>,
  3: <Tag color="error" icon={<CloseCircleOutlined />}>Xavfli</Tag>,
}

function getSeverityTag(val) {
  const str = String(val).trim()
  if (str === '1') return SEVERITY_TAG[1]
  if (str === '2') return SEVERITY_TAG[2]
  if (str === '3') return SEVERITY_TAG[3]
  return <Tag icon={<StarOutlined />} color="blue">Tahlil qilingan</Tag>
}

export default function EcgResult({ error, image, image_short, result, clinic }) {
  const { t } = useTranslation()

  return (
    <div>
      <ClinicHeader clinic={clinic} />

      {error && (
        <div className="ekg-error">
          <Tag color="error" icon={<CloseCircleOutlined />}>{t('error') || 'Xatolik'}: {error}</Tag>
        </div>
      )}

      {image != null ? (
        <div className="ekg-image">
          <Image
            style={{ width: '100%', borderRadius: '8px' }}
            preview={{ src: `${apiEcg}${image}` }}
            src={`${apiEcg}${image_short}`}
          />
        </div>
      ) : null}

      {result && (
        <div className="ekg-result">

          {result.digital_measurements ? (
            <>
              <div className="ekg-item-text">
                <b>{t('digital_measurements') || 'Raqamli o\'lchovlar'}:</b>
              </div>
              <ul>
                {result.digital_measurements.HR != null && (
                  <li><b>{t('hr') || 'Yurak urish ritmi (HR)'}</b><span> — {result.digital_measurements.HR}</span></li>
                )}
                {result.digital_measurements.PR_interval != null && (
                  <li><b>PR interval</b><span> — {result.digital_measurements.PR_interval}</span></li>
                )}
                {result.digital_measurements.QRS_duration != null && (
                  <li><b>QRS {t('duration') || 'davomiyligi'}</b><span> — {result.digital_measurements.QRS_duration}</span></li>
                )}
                {result.digital_measurements.QT_interval != null && (
                  <li><b>QT interval</b><span> — {result.digital_measurements.QT_interval}</span></li>
                )}
                {result.digital_measurements.QTc_Bazett != null && (
                  <li><b>QTc (Bazett)</b><span> — {result.digital_measurements.QTc_Bazett}</span></li>
                )}
                {result.digital_measurements.QRS_axis != null && (
                  <li><b>QRS {t('electrical_axis') || 'elektr o\'qi'}</b><span> — {result.digital_measurements.QRS_axis}</span></li>
                )}
                {result.digital_measurements.P_wave_duration != null && (
                  <li><b>P {t('wave_duration') || 'to\'lqini davomiyligi'}</b><span> — {result.digital_measurements.P_wave_duration}</span></li>
                )}
                {result.digital_measurements.P_wave_amplitude != null && (
                  <li><b>P {t('wave_amplitude') || 'to\'lqini amplitudasi'}</b><span> — {result.digital_measurements.P_wave_amplitude}</span></li>
                )}
                {result.digital_measurements.R_wave_amplitude != null && (
                  <li><b>R {t('wave_amplitude') || 'to\'lqini amplitudasi'}</b><span> — {result.digital_measurements.R_wave_amplitude}</span></li>
                )}
                {result.digital_measurements.S_wave_amplitude != null && (
                  <li><b>S {t('wave_amplitude') || 'to\'lqini amplitudasi'}</b><span> — {result.digital_measurements.S_wave_amplitude}</span></li>
                )}
                {result.digital_measurements.T_wave_amplitude != null && (
                  <li><b>T {t('wave_amplitude') || 'to\'lqini amplitudasi'}</b><span> — {result.digital_measurements.T_wave_amplitude}</span></li>
                )}
                {result.digital_measurements.PR_segment != null && (
                  <li><b>PR segment</b><span> — {result.digital_measurements.PR_segment}</span></li>
                )}
                {result.digital_measurements.ST_segment_elevation != null && (
                  <li><b>ST segment</b><span> — {result.digital_measurements.ST_segment_elevation}</span></li>
                )}
                {result.digital_measurements.RR_interval != null && (
                  <li><b>RR interval</b><span> — {result.digital_measurements.RR_interval}</span></li>
                )}
                {result.digital_measurements.heart_rate_variability != null && (
                  <li><b>HRV</b><span> — {result.digital_measurements.heart_rate_variability}</span></li>
                )}
                {result.digital_measurements.P_QRS_T_morphology != null && (
                  <li><b>P/QRS/T {t('morphology') || 'morfologiyasi'}</b><span> — {result.digital_measurements.P_QRS_T_morphology}</span></li>
                )}
              </ul>
            </>
          ) : null}

          {result.automatic_analysis ? (
            <div className="ekg-item-text">
              <b>{getSeverityTag(result.automatic_analysis_bool)} {t('automatic_analysis') || 'Avtomatik tahlil (AI xulosasi)'}:</b>
              <span> {result.automatic_analysis}</span>
            </div>
          ) : null}

          {result.AI_recommendations ? (
            <div className="ekg-item-text">
              <b>{t('ai_recommendations') || 'AI tavsiyasi'}:</b>
              <span> {result.AI_recommendations}</span>
            </div>
          ) : null}

          {result.final_summary ? (
            <div className="ekg-item-text">
              <b>{t('final_summary') || 'Xulosa'}:</b>
              <span> {result.final_summary}</span>
            </div>
          ) : null}

        </div>
      )}
    </div>
  )
}
