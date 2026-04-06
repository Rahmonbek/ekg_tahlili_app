import { FaChartLine, FaHeartbeat, FaHome } from "react-icons/fa";
import { FaPeopleGroup, FaUserDoctor } from "react-icons/fa6";
import { IoIosCard, IoIosPeople, IoMdSettings } from "react-icons/io";
import { MdOutlineMedicalInformation } from "react-icons/md";
import { GiTestTubes } from "react-icons/gi";
import {RiPulseLine } from 'react-icons/ri'
export const routers=[
    {
        path:'/doctor',
        icon:<FaUserDoctor />,
        title:"staffs",
        tools:"doctor",
        role_id:[2, 3]
    },

    
   
     {
        path:'/ecg-analyses',
        icon:<FaHeartbeat />,
        title:"analyse_ecg",
        tools:"ecg-analyses",
        role_id:[]
    },
    {
        path:'/holter-analyses',
        icon:<RiPulseLine />,
        title:"analyse_holter",
        tools:"holter-analyses",
        role_id:[]
    },
    {
        path:'/smad-analyses',
        icon:<FaChartLine />,
        title:"analyse_smad",
        tools:"smad-analyses",
        role_id:[]
    },
     {
        path:'/lab-analyses',
        icon:<GiTestTubes />,
        title:"analyse_lab",
        tools:"lab-analyses",
        role_id:[]
    },
     {
        path:'/patient-diagnoses',
        icon:< MdOutlineMedicalInformation />,
        title:"patient_diagnostics",
        tools:"patient-diagnoses",
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