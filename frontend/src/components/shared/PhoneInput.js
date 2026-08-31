import React from 'react';
import Cleave from 'cleave.js/react';
import { FaPhone } from 'react-icons/fa6';

const phoneOptions = {
  prefix: '+998',
  delimiters: [' (', ') ', '-', '-'],
  blocks: [4, 2, 3, 2, 2],
  numericOnly: true,
  // Ajratgichlar faqat yozilgan sari paydo bo'ladi. Ilgari bo'sh maydonda
  // ham `+998 (` ko'rinardi va foydalanuvchi maydonni "to'ldirilgan" deb
  // o'ylardi, ochiq qavs esa qayerdan yozishni chalkashtirardi.
  delimiterLazyShow: true,
};

/**
 * Telefon raqam maydoni.
 *
 * `withIcon` — chap tomonda telefon ikonkasi. Kirish sahifasida parol
 * maydonida qulf ikonkasi bor edi, telefonda esa yo'q — ikkita maydon
 * bir-biriga o'xshamasdi.
 */
const PhoneInput = React.forwardRef(
  ({ value, onChange, className = 'ant-input claveInput', withIcon = false, ...props }, ref) => {
    const input = (
      <Cleave
        htmlRef={ref}
        value={value}
        onChange={onChange}
        options={phoneOptions}
        placeholder="+998 (__) ___-__-__"
        className={withIcon ? `${className} has_icon` : className}
        style={{ width: '100%', ...(props.style || {}) }}
        {...props}
      />
    );

    if (!withIcon) return input;

    return (
      <span className="phone_input_wrap">
        <span className="phone_input_icon"><FaPhone /></span>
        {input}
      </span>
    );
  }
);

export default PhoneInput;
