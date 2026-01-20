import { FaHeartbeat, FaHome } from "react-icons/fa";
import { FaPeopleGroup, FaUserDoctor } from "react-icons/fa6";
import { IoIosCard, IoIosPeople, IoMdSettings } from "react-icons/io";
import { MdOutlineMedicalInformation } from "react-icons/md";

export const routers=[
    {
        path:'/doctor',
        icon:<FaUserDoctor />,
        title:"staffs",
        tools:"doctor",
        role_id:[2, 3]
    },

    
    {
        path:'/analyse-ecg',
        icon:<FaHeartbeat />,
        title:"analyse_ecg",
        tools:"analyse-ecg",
        role_id:[]
    },
     {
        path:'/diagnoses',
        icon:< MdOutlineMedicalInformation />,
        title:"patient_diagnostics",
        tools:"diagnoses",
        role_id:[]
    },
    //  {
    //     path:'/patcients',
    //     icon:<FaPeopleGroup />,
    //     title:"patcients",
    //     tools:"patcients",
    //     role_id:[]
    // },
    // {
    //     path:'/billings',
    //     icon:<IoIosCard />,
    //     title:"billings",
    //     tools:"billings",
    //     role_id:[2, 3]
    // },
    {
        path:'/settings',
        icon:<IoMdSettings />,
        title:"organization_info",
        tools:"settings",
        role_id:[2, 3]
    },
    
]