import React, { useState, useEffect, useRef } from 'react'
import uz_img from '../images/langs/uz.jpg'
import ru_img from '../images/langs/ru.jpg'
import en_img from '../images/langs/en.jpg'
import { useTranslation } from 'react-i18next'
import { IoIosArrowDown } from 'react-icons/io'
import { FaCheck } from 'react-icons/fa6'
import Cookies from 'js-cookie';
import i18n from '../locale/i18next';

const langs_data = [
  { lang: "uz", title: "O'zbek", img: uz_img },
  { lang: "ru", title: "Русский", img: ru_img },
  { lang: "en", title: "English", img: en_img },
];

export default function ChangeLangs() {

  const { t } = useTranslation();
  const [open, setopen] = useState(false);

  const boxRef = useRef(null);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    // `path: '/'` aniq ko'rsatilgan: ilgari `react-cookie` cookie'ni
    // joriy sahifa yo'liga yozardi, ya'ni ichki sahifada tanlangan til
    // bosh sahifada qo'llanmasligi mumkin edi (T-017).
    Cookies.set("tilYMed", lang, { path: '/', expires: 365 })
  }

  // 🔥 Tashqariga bosilganda yopish
  useEffect(() => {
    function handleClickOutside(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setopen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={boxRef} data-tour="dash-lang" className={`langs_box ${open ? "opened_lang" : ""}`}>
      <div className='selected_lang' onClick={() => setopen(!open)}>
        <img src={langs_data.find(item => item.lang == t("error_api")).img} />
        {/* Pastga qaragan strelka — dropdown ekanini bildiradi (ilgari
            chapga qarab turardi va nimani anglatishi tushunarsiz edi) */}
        <span><IoIosArrowDown /></span>
      </div>

      <div className='langs_list'>
        <ul>
          {langs_data.map(item => (
            <li key={item.lang} onClick={() => changeLanguage(item.lang)}>
              <div className='lang_item_box'>
                <img src={item.img} />
                <p>{item.title}</p>
              </div>
              <div className='lang_check'>
                {item.lang == t("error_api") ? <FaCheck /> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
