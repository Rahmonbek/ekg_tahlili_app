import { FaChartLine, FaHeartbeat, FaHome } from "react-icons/fa";
import { FaPeopleGroup, FaUserDoctor } from "react-icons/fa6";
import { IoIosCard, IoIosPeople, IoMdSettings } from "react-icons/io";
import { MdOutlineMedicalInformation } from "react-icons/md";
import { GiTestTubes } from "react-icons/gi";
import { RiPulseLine } from 'react-icons/ri';
import { GiMicroscope } from 'react-icons/gi';
export const routers=[
    {
        path:'/doctor',
        icon:<FaUserDoctor />,
        title:"staffs",
        tools:"doctor",
        role_id:[2, 3],
        unread_key: null,
        requires_active: false   // Admin doim kira oladi
    },

     {
        path:'/ecg-analyses',
        icon:<FaHeartbeat />,
        title:"analyse_ecg",
        tools:"ecg-analyses",
        role_id:[],
        unread_key: 'ecg_unread',
        requires_active: true
    },
    {
        path:'/holter-analyses',
        icon:<RiPulseLine />,
        title:"analyse_holter",
        tools:"holter-analyses",
        role_id:[],
        unread_key: 'holter_unread',
        requires_active: true
    },
    {
        path:'/smad-analyses',
        icon:<FaChartLine />,
        title:"analyse_smad",
        tools:"smad-analyses",
        role_id:[],
        unread_key: 'smad_unread',
        requires_active: true
    },
     {
        path:'/lab-analyses',
        icon:<GiTestTubes />,
        title:"analyse_lab",
        tools:"lab-analyses",
        role_id:[],
        unread_key: 'lab_unread',
        requires_active: true
    },
     {
        path:'/patient-diagnoses',
        icon:< MdOutlineMedicalInformation />,
        title:"patient_diagnostics",
        tools:"patient-diagnoses",
        role_id:[],
        unread_key: 'diagnoses_unread',
        requires_active: true
    },
    {
        path:'/parasitology-analyses',
        icon:<GiMicroscope />,
        title:"parasitology_analyse",
        tools:"parasitology-analyses",
        role_id:[],
        unread_key: null,
        requires_active: true
    },
    //  {
    //     path:'/patcients',
    //     icon:<FaPeopleGroup />,
    //     title:"patcients",
    //     tools:"patcients",
    //     role_id:[],
    //     requires_active: true
    // },
    // {
    //     path:'/billings',
    //     icon:<IoIosCard />,
    //     title:"billings",
    //     tools:"billings",
    //     role_id:[2, 3],
    //     requires_active: false
    // },
    {
        path:'/settings',
        icon:<IoMdSettings />,
        title:"organization_info",
        tools:"settings",
        role_id:[2, 3],
        unread_key: null,
        requires_active: false   // Admin doim kira oladi
    },

]