export const formatPhoneNumber=(phone)=>{
    if(phone){
return phone.replaceAll("+", '').replaceAll("(", '').replaceAll(")", '').replaceAll("-", '').replaceAll(" ", '')
    }else{
        return(null)
    }
    
}

export const formatPhoneNumberForForm=(phone)=>{
    if(phone){
        console.log(`+${phone.slice(0, 3)} (${phone.slice(3, 5)}) ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10, 12)}`)
return `+${phone.slice(0, 3)} (${phone.slice(3, 5)}) ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10, 12)}`
    }else{
        return("")
    }
    
}

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
