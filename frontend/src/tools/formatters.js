export const formatPhoneNumber=(phone)=>{
    if(phone){
return phone.replaceAll("+", '').replaceAll("(", '').replaceAll(")", '').replaceAll("-", '').replaceAll(" ", '')
    }else{
        return(null)
    }
    
}

export const formatHeaderLastname=(lastname)=>{
         // Bo'sh satr ham tekshiriladi: ilgari `""` uchun `undefined.` qaytarardi
         if(lastname != null && String(lastname).trim() !== ""){
          let prefix = "";


const twoLetterPrefixes = ["Sh", "Ch"]; 
const lastNameUpper = lastname.toUpperCase();

const prefixMatch = twoLetterPrefixes.find(p => lastNameUpper.startsWith(p.toUpperCase()));

if (prefixMatch) {
  prefix = prefixMatch;
} else {
  prefix = lastNameUpper[0];
}

const displayName = `${prefix}.`;
return displayName
         }
         return ""
}




export const formatPhoneNumberForForm2 = (phone) => {
    if (!phone) return "";
    // 1. Faqat raqamlarni qoldiramiz: "+998901234567" -> "998901234567"
    let cleaned = phone.replace(/\D/g, ''); 
    
    // 2. Agar 998 bilan boshlansa, uni kesamiz: "998901234567" -> "901234567"
    if (cleaned.startsWith('998')) {
        cleaned = cleaned.slice(3);
    }
    return cleaned; 
}





export const formatPhoneNumberForForm=(phone)=>{
    if(phone){
return `+${phone.slice(0, 3)} (${phone.slice(3, 5)}) ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10, 12)}`
    }else{
        return("")
    }
    
}

export const formatPhoneNumberForForm1 = (phone) => {
  if (!phone) return "";

  // Agar raqam '+998' bilan boshlansa, olib tashlaymiz
  let digits = phone.startsWith("998") && phone.length==12 ? phone.slice(3) : phone;

  // Raqam yetarli uzunlikda bo‘lsa formatlaymiz
  if (digits.length === 9) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
  }

  // Default: bo‘sh string
  return "";
};




export function calculateAge(birthdate) {
  if(birthdate!=null){
const [year, month, day] = birthdate.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;

  // Check if the birthday has occurred yet this year
  if (
    today.getMonth() + 1 < month || 
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age--;
  }

  return age;
  }else{
    return null
  }
  
}


export function formatDateTime(isoString) {
  const date = new Date(isoString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}.${month}.${year} | ${hours}:${minutes}`;
}

export function formatDate(isoString) {
  const date = new Date(isoString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}
/**
 * Foydalanuvchi/shifokor ismini xavfsiz ko'rsatish.
 *
 * Ilgari sarlavhada `formatHeaderLastname(lastName) + firstName` ishlatilardi.
 * Yangi ro'yxatdan o'tgan foydalanuvchida ikkala maydon ham bo'sh bo'ladi va
 * JS `"" + null` ni `"null"` ga aylantirardi — foydalanuvchi platformadagi
 * BIRINCHI ekranida o'z ismi o'rniga `null` so'zini ko'rardi.
 *
 * @param {object} person `{ firstName, lastName, phone }`
 * @param {object} [opts]
 * @param {'full'|'short'} [opts.style='full'] `short` — "I. RAHMONJON"
 * @param {string} [opts.fallback] ism bo'lmasa ko'rsatiladigan matn
 */
export const displayName = (person, opts = {}) => {
    const { style = 'full', fallback = '' } = opts;
    if (!person) return fallback;

    const last = (person.lastName || '').trim();
    const first = (person.firstName || '').trim();

    if (!last && !first) {
        // Ism hali to'ldirilmagan — telefon raqami eng foydali muqobil
        return (person.phone || '').trim() || fallback;
    }

    if (style === 'short') {
        const prefix = formatHeaderLastname(last);
        return `${prefix}${first}`.trim();
    }

    // Sharif (otasining ismi) ATAYIN chiqarilmaydi — platformada
    // foydalanuvchi ma'lumotlari faqat familiya va ism bilan ko'rsatiladi.
    // U bazada saqlanadi va formalarda tahrirlanadi, faqat ekranga
    // chiqmaydi: qatorlar qisqaradi va ustunlarga joy chiqadi.
    return [last, first].filter(Boolean).join(' ');
};

/**
 * Familiya va ism — sharifsiz. Ro'yxatlar, kartochkalar, sarlavhalar va
 * qidiruv natijalarida ishlatiladi.
 *
 * `displayName` bilan farqi shundaki, bu yerda `person` xohlagan
 * shakldagi obyekt bo'lishi mumkin (bemor, shifokor, xodim) — kerak
 * bo'lgani faqat `firstName` va `lastName`.
 *
 * @param {object} person `{ firstName, lastName }`
 * @param {string} [fallback] ikkala maydon ham bo'sh bo'lsa
 */
export const personName = (person, fallback = '') => {
    if (!person) return fallback;
    const name = [person.lastName, person.firstName]
        .map((part) => (part || '').trim())
        .filter(Boolean)
        .join(' ');
    return name || fallback;
};

/**
 * Jadvaldagi `#` ustuni uchun tartib raqami.
 *
 * Ilgari har xil sahifada har xil edi: ba'zilarida sahifadagi tartib raqami,
 * "Shifokor xulosasi" sahifasida esa bazadagi `id` ko'rsatilardi — ro'yxatda
 * bitta yozuv bo'lsa ham `16` deb yozilardi va foydalanuvchi "16 ta yozuv
 * bormi?" deb o'ylardi. Xodimlar sahifasida esa sahifa siljishi hisobga
 * olinmasdi: 2-sahifada raqamlar yana 1 dan boshlanardi.
 *
 * @param {number} page     joriy sahifa (1 dan)
 * @param {number} pageSize sahifadagi yozuvlar soni
 * @returns {(value:any, row:any, index:number) => number} antd `render` funksiyasi
 */
export const rowNumber = (page, pageSize) =>
    (_value, _row, index) => (Math.max(page, 1) - 1) * pageSize + index + 1
