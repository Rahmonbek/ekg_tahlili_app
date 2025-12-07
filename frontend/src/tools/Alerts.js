import { message } from "antd"

export const dangerAlert=(content)=>{
    message.error(content, 3)
} 
export const successAlert=(content)=>{
    message.success(content, 3)
} 