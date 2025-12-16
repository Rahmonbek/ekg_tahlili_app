import { FaHeartbeat, FaHome } from "react-icons/fa";
import { FaPeopleGroup, FaUserDoctor } from "react-icons/fa6";
import { IoIosCard, IoIosPeople, IoMdSettings } from "react-icons/io";

export const routers=[
    {
        path:'/',
        icon:<FaUserDoctor />,
        title:"staffs",
        tools:""
    },

    
    {
        path:'/analyse-ecg',
        icon:<FaHeartbeat />,
        title:"analyse_ecg",
        tools:"analyse-ecg"
    },
     {
        path:'/patcients',
        icon:<FaPeopleGroup />,
        title:"patcients",
        tools:"patcients"
    },
    {
        path:'/billings',
        icon:<IoIosCard />,
        title:"billings",
        tools:"billings"
    },
    {
        path:'/settings',
        icon:<IoMdSettings />,
        title:"organization_info",
        tools:"settings"
    }
]