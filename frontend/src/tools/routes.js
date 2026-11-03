import { FaChartLine, FaHeartbeat, FaHome } from "react-icons/fa";
import { FaPeopleGroup, FaUserDoctor } from "react-icons/fa6";
import { IoIosCard, IoIosPeople, IoMdSettings } from "react-icons/io";
import { MdOutlineMedicalInformation } from "react-icons/md";
import { GiTestTubes } from "react-icons/gi";
import { RiPulseLine } from 'react-icons/ri';
import { GiMicroscope, GiBrain } from 'react-icons/gi';
import { VideoCameraOutlined, TeamOutlined, MedicineBoxOutlined, SafetyCertificateOutlined, DashboardOutlined, QuestionCircleOutlined, AppstoreOutlined, BankOutlined, UserOutlined, FileSearchOutlined, BookOutlined, RobotOutlined } from '@ant-design/icons';

// Klinika ichidagi ish bandlari. SuperAdmin (1) ga ko'rsatilmaydi: uning
// klinikasi yo'q, bu ro'yxatlar esa klinika bo'yicha filtrlanadi — u
// platformani o'zining `/sa/*` sahifalaridan kuzatadi (tasks-superadmin.md).
const CLINIC_ROLES = [2, 3, 4, 5];

// SuperAdmin kabineti (rol 1)
const SUPERADMIN_ROUTES = [
    { path: '/', icon: <AppstoreOutlined />, title: 'sa_dashboard', tools: 'sa-dashboard', role_id: [1], unread_key: null, requires_active: false },
    { path: '/sa/clinics', icon: <BankOutlined />, title: 'sa_clinics', tools: 'sa/clinics', role_id: [1], unread_key: null, requires_active: false },
    { path: '/sa/users', icon: <UserOutlined />, title: 'sa_users', tools: 'sa/users', role_id: [1], unread_key: null, requires_active: false },
    { path: '/sa/patients', icon: <FaPeopleGroup />, title: 'sa_patients', tools: 'sa/patients', role_id: [1], unread_key: null, requires_active: false },
    { path: '/sa/analyses', icon: <FileSearchOutlined />, title: 'sa_analyses', tools: 'sa/analyses', role_id: [1], unread_key: null, requires_active: false },
    { path: '/sa/dictionaries', icon: <BookOutlined />, title: 'sa_dictionaries', tools: 'sa/dictionaries', role_id: [1], unread_key: null, requires_active: false },
    { path: '/sa/ai-usage', icon: <RobotOutlined />, title: 'sa_ai_usage', tools: 'sa/ai-usage', role_id: [1], unread_key: null, requires_active: false },
];
// Yon paneldagi nomlar ATAYLAB alohida kalitlarda (`nav_*`).
// `analyse_ecg` kabi kalitlar sahifa sarlavhalarida, teglarda va jadval
// ustunlarida ham ishlatiladi — ularni qisqartirish o'sha joylarni ham
// o'zgartirib yuborardi (masalan bemor kartasidagi "EKG tahlillari" tegi).
export const routers = [
    ...SUPERADMIN_ROUTES,
    {
        path: '/doctor',
        icon: <FaUserDoctor />,
        title: "staffs",
        tools: "doctor",
        role_id: [2, 3],
        unread_key: null,
        requires_active: false   // Admin doim kira oladi
    },

    {
        path: '/ecg-analyses',
        icon: <FaHeartbeat />,
        title: "nav_ecg",
        tools: "ecg-analyses",
        role_id: CLINIC_ROLES,
        unread_key: 'ecg_unread',
        requires_active: true
    },
    {
        path: '/holter-analyses',
        icon: <RiPulseLine />,
        title: "nav_holter",
        tools: "holter-analyses",
        role_id: CLINIC_ROLES,
        unread_key: 'holter_unread',
        requires_active: true
    },
    {
        path: '/smad-analyses',
        icon: <FaChartLine />,
        title: "nav_smad",
        tools: "smad-analyses",
        role_id: CLINIC_ROLES,
        unread_key: 'smad_unread',
        requires_active: true
    },
    {
        path: '/lab-analyses',
        icon: <GiTestTubes />,
        title: "nav_lab",
        tools: "lab-analyses",
        role_id: CLINIC_ROLES,
        unread_key: 'lab_unread',
        requires_active: true
    },
    // {
    //     path: '/patient-diagnoses',
    //     icon: < MdOutlineMedicalInformation />,
    //     title: "patient_diagnostics",
    //     tools: "patient-diagnoses",
    //     role_id: [],
    //     unread_key: 'diagnoses_unread',
    //     requires_active: true
    // },
    // {
    //     path:'/parasitology-analyses',
    //     icon:<GiMicroscope />,
    //     title:"parasitology_analyse",
    //     tools:"parasitology-analyses",
    //     role_id:[],
    //     unread_key: null,
    //     requires_active: true
    // },
    {
        // Kompleks (ko'p tahlilli) AI xulosalari — to'rttala rol uchun ham.
        // Ro'yxat rol bo'yicha cheklangan: foydalanuvchi bemorlar
        // ro'yxatida ko'radigan bemorlarning xulosalari chiqadi.
        path: '/combined-analyses',
        icon: <GiBrain />,
        title: "nav_combined",
        tools: "combined-analyses",
        role_id: CLINIC_ROLES,
        unread_key: null,
        requires_active: true
    },
    {
        // Bemorlar ro'yxati: shifokor/hamshira uchun ham kerak — tahlil
        // yaratishdan oldin bemor allaqachon bazada bor-yo'qligini ko'rish uchun.
        path: '/patcients',
        icon: <FaPeopleGroup />,
        title: "patcients",
        tools: "patcients",
        role_id: CLINIC_ROLES,
        unread_key: null,
        requires_active: true
    },
    // {
    //     path:'/billings',
    //     icon:<IoIosCard />,
    //     title:"billings",
    //     tools:"billings",
    //     role_id:[2, 3],
    //     requires_active: false
    // },
    

    // Klinika laboratoriya statistikasi + klinik qoidalar asosidagi xavf signallari
    {
        path: '/lab-statistics',
        icon: <FaChartLine />,
        title: "nav_lab_statistics",
        tools: "lab-statistics",
        role_id: [2, 3],
        unread_key: null,
        requires_active: true
    },

    // ── Online Konsultatsiya — Admin/Direktor ──────────────────────────────────
    {
        path: '/consultants',
        icon: <TeamOutlined />,
        title: "consultants",
        tools: "consultants",
        role_id: [2, 3],
        unread_key: null,
        requires_active: false
    },
    {
        path: '/consultations',
        icon: <MedicineBoxOutlined />,
        title: "consultation",
        tools: "consultations",
        role_id: [2, 3],
        unread_key: 'consultation_admin_pending',
        requires_active: false
    },
{
        path: '/video-conference',
        icon: <VideoCameraOutlined />,
        title: "video_conference",
        tools: "video-conference",
        role_id: [2, 3, 4],
        unread_key: null,
        requires_active: false
    },
    // ── Online Konsultatsiya — Doctor ──────────────────────────────────────────
    {
        path: '/doctor/clinics',
        icon: <TeamOutlined />,
        title: "accepts",
        tools: "doctor/clinics",
        role_id: [4],
        unread_key: 'consultation_doctor_invitations',
        requires_active: false
    },
    {
        path: '/doctor/consultations',
        icon: <MedicineBoxOutlined />,
        title: "consultation",
        tools: "doctor/consultations",
        role_id: [4],
        unread_key: 'consultation_doctor_created',
        requires_active: false
    },

    {
        path: '/settings',
        icon: <IoMdSettings />,
        title: "organization_info",
        tools: "settings",
        role_id: [2, 3],
        unread_key: null,
        requires_active: false   // Admin doim kira oladi
    },

    // ── Yangi bo'limlar (T-062) ───────────────────────────────────────────
    {
        // Audit jurnali — O'z DSt 2814:2014 C2 talabi:
        // "Admin uchun loglarni ko'rish interfeysi"
        // Faqat SuperAdmin: bu platforma darajasidagi vosita, shifoxona
        // administratori uchun kundalik ishda kerak emas
        path: '/audit-logs',
        icon: <SafetyCertificateOutlined />,
        title: "audit_log",
        tools: "audit-logs",
        role_id: [1],
        unread_key: null,
        requires_active: false
    },
    {
        // Faqat SuperAdmin: xizmatlar holati platforma darajasidagi ma'lumot
        path: '/system-status',
        icon: <DashboardOutlined />,
        title: "system_status",
        tools: "system-status",
        role_id: [1],
        unread_key: null,
        requires_active: false
    },
    {
        path: '/help',
        icon: <QuestionCircleOutlined />,
        title: "help",
        tools: "help",
        role_id: [],
        unread_key: null,
        requires_active: false
    }
]
