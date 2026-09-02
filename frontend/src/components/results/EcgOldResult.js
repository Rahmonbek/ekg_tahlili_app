import parseAiResult from '../../tools/aiResult';
import AnalysisResultBody from './AnalysisResultBody';
import { Button, Image } from 'antd'
import { formatTimeStr } from 'antd/es/statistic/utils'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateAge, formatDate, formatDateTime } from '../../tools/formatters'
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io'
import { dangerAlert, warningAlert } from '../../tools/Alerts'
import { analyzeEkgFileRetry } from '../../host/EkgService'
import { useStore } from '../../store/Store'
import { buildFileUrl } from '../../host/Host'
import ClinicHeader from './ClinicHeader'
import { severityClass, severityLabel, severityIcon } from '../../tools/severity';

// `showMeta`: shifoxona va shifokor ma'lumotlari. Ko'rish sahifalarida
// ular sahifa sarlavhasida chiqadi, shuning uchun u yerda o'chiriladi.
export default function EcgOldResult({ data, initialOpen = false, showMeta = true }) {
  const [result, setresult] = useState(null)
  const [image, setimage] = useState(null)
  const [image_short, setimage_short] = useState(null)
  const [open, setopen] = useState(initialOpen)
  const { t } = useTranslation()
  const { ecg_btn_loading, setecg_btn_loading } = useStore()
  useEffect(() => {
    const parsedResult = parseAiResult(data.aiAnswerData);
    setimage(data.generatedFileLink)
    setimage_short(data.generatedShortFileLink)
    setresult(parsedResult);
  }, [data.aiAnswerData])

  const handleSubmit = async () => {

    try {
      warningAlert(t("please_wait"))
      setecg_btn_loading(true);
      const formData = new FormData();
      if (data.complaints != null) {
        data.complaints.forEach((f) => formData.append("complaint", f.nameUz));
      }
      if (data.patcient != null) {
        formData.append('gender', data.patcient.gender ? "erkak" : 'ayol')
        formData.append('age', calculateAge(data.patcient.birthDate))
      }

      formData.append('lang', 'uz')
      formData.append('id', data.id)

      var res = await analyzeEkgFileRetry(formData);
      let parsedResult;
      try {
        // agar string bo'lsa JSON.parse qilamiz
        parsedResult = res.ai_response.raw ? typeof res.ai_response.raw === "string"
          ? JSON.parse(res.ai_response.raw)
          : res.ai_response.raw : typeof res.ai_response === "string"
          ? JSON.parse(res.ai_response)
          : res.ai_response;
      } catch (e) {
        parsedResult = res.ai_response;
      }
      // `ecg_png_base64` nomi aldamchi — qiymat fayl yo'li. Server endi
      // to'g'ri nomlangan maydonni ham qaytaradi (T-084).
      setimage(res.ecg_image_url ?? res.ecg_png_base64)
      setimage_short(res.ecg_thumbnail_url ?? res.ecg_png_base64_short)
      setresult(parsedResult);

    } catch (err) {
      dangerAlert(t("api_error"))
    } finally {
      setecg_btn_loading(false);
    }
  };
  return (
    data != null ? <div className={`old_analyse main_card ${open ? "opened_main_card" : "closed_main_card"} ${result != null ? severityClass(result.automatic_analysis_bool) : 'unknown_analyse'}`}>
      <h1 onClick={() => { setopen(!open) }}><p>

        {data.analysisDate ? <span><b>{t('analysis_date')}:</b> {formatDate(data.analysisDate)}</span> : formatDate(data.createdAt)}  </p>
        <p>
          {result != null ? severityLabel(result.automatic_analysis_bool, t) : t('not_analysed')}
          <span>{open ? <IoIosArrowUp /> : <IoIosArrowDown />}</span>
        </p>
      </h1>
      {
        open ?

          <div className="main_card_content">
            {showMeta && <ClinicHeader clinic={data.clinic} />}


            {/* Old clinic display removed as it's now in ClinicHeader */}

            {showMeta && data.createdDoctor != null ? <div>
              <p className='ecg_label'>{t("doctor_of_created")}</p>
              <div className="ekg-item-info-text">
                <b>{data.createdDoctor.role != null ? data.createdDoctor.role[`name${t("data_lang")}`] + ":" : ''} </b>
                <p>{data.createdDoctor.lastName} {data.createdDoctor.firstName} </p>
              </div></div> : <></>}

            {showMeta && data.doctors != null && data.doctors.length > 0 ? <div>
              <p className='ecg_label'>{t("doctor_of_patcient")}</p>
              {data.doctors.map((item) => (
                // `key` — shifokor id si: ro'yxat yangilanganda React qatorlarni
                // to'g'ri farqlaydi va eski qiymat ekranda qolib ketmaydi (T-067)
                <div className="ekg-item-info-text" key={item.id}>
                  <b>{item.role != null ? item.role[`name${t("data_lang")}`] + ":" : ''} </b>
                  <p>{item.lastName} {item.firstName} </p>
                </div>
              ))}
            </div> : <></>}


            {data.complaints != null && data.complaints.length > 0 ? <div>
              <p className='ecg_label'>{t("complaints")}</p>
              {data.complaints.map((item) => (
                <div className="ekg-item-info-text complaint-item" key={item.id}>
                  <p>{item[`name${t("data_lang")}`]} </p>
                </div>
              ))}
            </div> : <></>}


            {/* AI natijasi bo'lsa rasm `AnalysisResultBody` ichida chiqadi —
                bu yerda ham ko'rsatish bir sahifada IKKI marta bir xil
                rasmga olib kelardi. Faqat natija hali yo'q holatda chiqariladi. */}
            {(result == null || typeof result === 'string') && image != null && image_short != null ? <>
              <p className='ecg_label'>{t("ecg-image")}</p>
              <div className="ekg-image"><Image style={{ width: '100%' }}
                preview={{
                  src: buildFileUrl(image)
                }}
                src={buildFileUrl(image)}
                placeholder={
                  <Image preview={false} src={buildFileUrl(image_short)}
                    style={{ width: '100%' }} />
                } /></div></>
              : <></>}

            {!(data.aiAnswerData != null || result != null) ?
              <Button onClick={handleSubmit} loading={ecg_btn_loading} htmlType='button' className="btn_form mini_btn_main">
                {t("check_by_ai")}
              </Button>
              : <></>}
            {/* Natija tanasi barcha to'rt tur uchun bitta joyda (T-034) */}
<AnalysisResultBody
  kind="ecg"
  result={result}
  image={image}
  imageShort={image_short}
/>
          </div> : <></>}</div> : <></>
  )
}
