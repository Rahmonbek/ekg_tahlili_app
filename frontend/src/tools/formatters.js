export const formatPhoneNumber=(phone)=>{
    if(phone){
return phone.replaceAll("+", '').replaceAll("(", '').replaceAll(")", '').replaceAll("-", '').replaceAll(" ", '')
    }else{
        return(null)
    }
    
}

export const formatHeaderLastname=(lastname)=>{
         if(lastname!=null){
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










export const formatPhoneNumberForForm=(phone)=>{
    if(phone){
        console.log(`+${phone.slice(0, 3)} (${phone.slice(3, 5)}) ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10, 12)}`)
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