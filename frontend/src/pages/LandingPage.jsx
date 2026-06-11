import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import logo from '../images/logo.png';
import {
  FiActivity,
  FiArrowRight,
  FiArrowUp,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCpu,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiHeart,
  FiLock,
  FiMenu,
  FiMic,
  FiMonitor,
  FiPhoneOff,
  FiPlay,
  FiSend,
  FiShield,
  FiTrendingUp,
  FiUpload,
  FiUserPlus,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import { FaHospital, FaMicroscope } from 'react-icons/fa';
import { FaGaugeHigh, FaHeartPulse } from 'react-icons/fa6';

const navLinks = [
  { label: 'Platforma', href: '#top' },
  { label: 'Xizmatlar', href: '#xizmatlar' },
  { label: 'Konsultatsiya', href: '#konsultatsiya' },
  { label: 'Statistika', href: '#statistika' },
  { label: "Bog'lanish", href: '#footer' },
];

const problemItems = [
  "Qog'oz tahlillar yo'qoladi",
  'Qayta ishlash 30+ daqiqa',
  'Xato tashxis xavfi',
  "Shifokor vaqtini boy beradi",
  "Masofaviy ko'rik imkonsiz",
];

const solutionItems = [
  'Tahlil 30 soniyada tayyor',
  'AI xatolikni 95% kamaytiradi',
  'Hamma joydan kirish mumkin',
  'Avto-arxivlash va hisobot',
  'Masofaviy konsultatsiya',
];

const features = [
  {
    icon: 'activity',
    title: 'EKG Tahlili',
    body: "12 qo'rg'oshinli EKG faylini yuklang, AI yurak ritmi, ST segment va QTc intervalni bir necha soniyada tahlil qiladi.",
  },
  {
    icon: 'gauge',
    title: 'SMAD Monitoring',
    body: '24 soatlik qon bosimi monitoringi sutkalik profil va tsirkad indeks bilan avtomatik ko‘rinishga keladi.',
  },
  {
    icon: 'heart-pulse',
    title: 'Holter Monitoring',
    body: '48 soatlik yurak monitoringida aritmiyalar, pauzalar va ST siljishlar batafsil ajratib beriladi.',
  },
  {
    icon: 'lab',
    title: 'Laboratoriya',
    body: 'Laboratoriya rasmlaridan ko‘rsatkichlar ajratiladi, normadan og‘ishlar va tavsiyalar tayyorlanadi.',
  },
  {
    icon: 'microscope',
    title: 'Parazitologiya',
    body: "Mikroskop rasmi asosida gijja turi va epidemiologik kuzatuv uchun kerakli ma'lumotlar tayyorlanadi.",
  },
  {
    icon: 'video',
    title: 'Online Konsultatsiya',
    body: 'Mutaxassis shifokorlar bilan bemor diagnostikasini platforma ichida video orqali birga ko‘rish mumkin.',
    tags: ['Video qo‘ng‘iroq', 'Masofaviy'],
    highlight: true,
  },
];

const consultSteps = [
  {
    icon: 'send',
    number: '01',
    title: 'Diagnostika yuboriladi',
    body: 'Admin bemor tahlillarini tanlangan mutaxassisga platforma ichida yuboradi.',
  },
  {
    icon: 'monitor',
    number: '02',
    title: "Mutaxassis ko'radi",
    body: "Shifokor o'z kabinetidan bemorning EKG, SMAD, Holter va laboratoriya natijalarini ko'radi.",
  },
  {
    icon: 'video',
    number: '03',
    title: 'Video muloqot',
    body: "Platforma ichida shifokor, admin va bemor o'rtasida bevosita masofaviy maslahat bo'ladi.",
  },
];

const timelineSteps = [
  {
    number: '01',
    icon: 'hospital',
    title: "Klinikani ro'yxatdan o'tkazing",
    body: '5 daqiqada klinika nomi, INN va asosiy ma’lumotlarni kiritib ishni boshlang.',
  },
  {
    number: '02',
    icon: 'user-plus',
    title: "Bemorni qo'shing",
    body: "Passport seriyasi va tug'ilgan sana orqali bemorni toping yoki yangi kartasini yarating.",
  },
  {
    number: '03',
    icon: 'upload',
    title: 'Tahlil faylini yuklang',
    body: "EKG, SMAD, Holter yoki laboratoriya faylini drag-and-drop yoki tanlash orqali yuklang.",
  },
  {
    number: '04',
    icon: 'cpu',
    title: 'AI natijani tayyorlaydi',
    body: 'Tahlil, tavsiya, ko‘rsatkichlar va PDF hisobot bir joyda tayyor bo‘ladi.',
  },
];

const stats = [
  { icon: 'hospital', value: 142, suffix: '+', label: 'Faol klinikalar' },
  { icon: 'chart', value: 50000, suffix: '+', label: 'Amalga oshirilgan tahlillar' },
  { icon: 'globe', value: 14, suffix: '', label: "Viloyatlar bo'yicha qamrov" },
  { icon: 'shield', value: 99.2, suffix: '%', label: 'AI aniqlik darajasi', fixed: 1 },
];

const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const monthValues = [42, 55, 61, 58, 73, 80, 77, 88, 92, 99, 108, 120];

const regions = [
  { name: 'Qoraqalpog‘iston', count: 6, x: 3, y: 6, w: 24, h: 42 },
  { name: 'Xorazm', count: 4, x: 3, y: 50, w: 17, h: 20 },
  { name: 'Navoiy', count: 6, x: 29, y: 8, w: 21, h: 38 },
  { name: 'Buxoro', count: 8, x: 23, y: 52, w: 22, h: 30 },
  { name: 'Sirdaryo', count: 3, x: 52, y: 6, w: 10, h: 13 },
  { name: 'Jizzax', count: 3, x: 52, y: 21, w: 13, h: 18 },
  { name: 'Toshkent', count: 20, x: 64, y: 4, w: 16, h: 15 },
  { name: 'Toshkent sh.', count: 38, x: 66, y: 21, w: 11, h: 10 },
  { name: 'Samarqand', count: 14, x: 49, y: 43, w: 16, h: 18 },
  { name: 'Qashqadaryo', count: 7, x: 47, y: 63, w: 19, h: 22 },
  { name: 'Surxondaryo', count: 3, x: 52, y: 87, w: 16, h: 11 },
  { name: 'Namangan', count: 9, x: 82, y: 8, w: 16, h: 11 },
  { name: 'Andijon', count: 10, x: 86, y: 21, w: 12, h: 11 },
  { name: "Farg'ona", count: 11, x: 80, y: 34, w: 14, h: 13 },
];

const securityItems = [
  {
    icon: 'lock',
    title: 'AES-256 shifrlash',
    body: "Barcha bemor ma'lumotlari saqlash va uzatish jarayonida himoyalanadi.",
  },
  {
    icon: 'shield',
    title: 'Rasmiy litsenziya',
    body: "Sog'liqni saqlash talablari asosida ishlaydigan xavfsiz tibbiy platforma.",
  },
  {
    icon: 'monitor',
    title: "Ma'lumotlar O'zbekistonda",
    body: 'Server infratuzilmasi mahalliy talablarga mos, audit va kuzatuv uchun tayyor.',
  },
  {
    icon: 'users',
    title: 'Rolga asoslangan kirish',
    body: "Har bir xodim faqat o'z vakolati doirasidagi ma'lumotni ko'radi.",
  },
  {
    icon: 'file',
    title: "To'liq audit jurnali",
    body: "Ko'rish, tahrirlash va chaqiruvlar bo'yicha izlar tizimda qayd etiladi.",
  },
  {
    icon: 'check-circle',
    title: '99.9% ishonchlilik',
    body: 'Doimiy monitoring, zaxira nusxa va uzluksiz xizmat ko‘rsatish arxitekturasi.',
  },
];

const testimonials = [
  {
    initials: 'DK',
    name: 'Dr. Karimov',
    role: 'Kardiolog',
    quote: 'EKG tahlili 30 daqiqadan 30 soniyaga tushdi va bemor oqimi sezilarli oshdi.',
  },
  {
    initials: 'DA',
    name: 'Dr. Azimova',
    role: 'Terapevt',
    quote: "Laboratoriya natijalarini AI tayyorlagach, bemor bilan muloqot uchun ko'proq vaqt qolmoqda.",
  },
  {
    initials: 'DY',
    name: 'Dr. Yusupov',
    role: 'Kardiolog',
    quote: 'Holter xulosasi juda batafsil, AI ko‘rinmay qoladigan nuqtalarni ham topadi.',
  },
  {
    initials: 'DR',
    name: 'Dr. Rahimova',
    role: 'Laborant',
    quote: 'Parazitologiya moduli laboratoriya jarayonlarini tezlashtirib, xatolarni kamaytirdi.',
  },
];

const blogPosts = [
  {
    category: 'Texnologiya',
    icon: 'activity',
    title: 'AI EKG tahlilida ST segment va QTc qanday hisoblanadi',
    date: '12-Iyun, 2026',
    read: '5 daqiqa',
  },
  {
    category: 'Amaliyot',
    icon: 'video',
    title: 'Online konsultatsiya: 142 klinika tajribasidan 5 saboq',
    date: '4-Iyun, 2026',
    read: '7 daqiqa',
  },
  {
    category: 'Tadqiqot',
    icon: 'microscope',
    title: 'Parazitologiyada AI va epidemiologik monitoring',
    date: '28-May, 2026',
    read: '6 daqiqa',
  },
];

const faqs = [
  {
    q: "NMED qanday tahlillarni qo'llab-quvvatlaydi?",
    a: 'EKG, SMAD, Holter, laboratoriya va parazitologiya tahlillari bitta platformada ishlaydi.',
  },
  {
    q: 'AI tahlili qancha vaqt oladi?',
    a: "Fayl turi va hajmiga qarab odatda bir necha soniyadan 30 soniyagacha bo'lgan oraliqda natija tayyorlanadi.",
  },
  {
    q: 'Online konsultatsiya qanday ishlaydi?',
    a: 'Admin natijalarni mutaxassisga yuboradi, mutaxassis esa tahlillarni ko‘rib platforma ichida video maslahat beradi.',
  },
  {
    q: "Ma'lumotlar xavfsizligi qanday ta'minlanadi?",
    a: "Shifrlash, audit, rolga asoslangan kirish va kuzatuv qatlamlari orqali bemor ma'lumotlari himoyalanadi.",
  },
  {
    q: "Ro'yxatdan o'tish qancha vaqt oladi?",
    a: 'Asosiy klinika ma’lumotlari tayyor bo‘lsa, tizimga kirish va ishni boshlash bir necha daqiqada yakunlanadi.',
  },
];

function iconFor(name) {
  const iconMap = {
    activity: FiActivity,
    gauge: FaGaugeHigh,
    'heart-pulse': FaHeartPulse,
    lab: FiMic,
    microscope: FaMicroscope,
    video: FiVideo,
    send: FiSend,
    monitor: FiMonitor,
    hospital: FaHospital,
    'user-plus': FiUserPlus,
    upload: FiUpload,
    cpu: FiCpu,
    chart: FiBarChart2,
    globe: FiGlobe,
    shield: FiShield,
    lock: FiLock,
    users: FiUsers,
    file: FiFileText,
    'check-circle': FiCheck,
    play: FiPlay,
    calendar: FiCalendar,
    clock: FiClock,
    menu: FiMenu,
    close: FiX,
    chevronDown: FiChevronDown,
    arrowRight: FiArrowRight,
    arrowUp: FiArrowUp,
    phoneOff: FiPhoneOff,
    heart: FiHeart,
    external: FiExternalLink,
    trend: FiTrendingUp,
  };

  return iconMap[name] || FiActivity;
}

function Icon({ name, className }) {
  const Component = iconFor(name);
  return <Component className={className} />;
}

function useReveal() {
  useEffect(() => {
    const isVisibleNow = (item) => {
      const rect = item.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
          }
        });
      },
      { threshold: 0.04, rootMargin: '0px 0px -8% 0px' }
    );

    const items = document.querySelectorAll('.reveal');
    requestAnimationFrame(() => {
      items.forEach((item) => {
        if (isVisibleNow(item)) {
          item.classList.add('in');
        }
        observer.observe(item);
      });
    });

    return () => observer.disconnect();
  }, []);
}

function useScrollProgress() {
  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - doc.clientHeight;
      const progress = maxScroll > 0 ? (doc.scrollTop / maxScroll) * 100 : 0;
      doc.style.setProperty('--landing-progress', `${progress}%`);
    };

    window.addEventListener('scroll', update, { passive: true });
    update();

    return () => window.removeEventListener('scroll', update);
  }, []);
}

function useCounter(target, start, fixed = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) {
      return;
    }

    const startTime = performance.now();
    const duration = 1600;
    let frameId;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [start, target]);

  return fixed ? value.toFixed(fixed) : Math.round(value).toLocaleString();
}

function SectionHeader({ eyebrow, title, accent, description }) {
  return (
    <div className="landing-head reveal">
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2 className="landing-title">
        {title} {accent ? <span>{accent}</span> : null}
      </h2>
      {description ? <p className="landing-subtitle">{description}</p> : null}
    </div>
  );
}

function StatCard({ item, start, delay }) {
  const value = useCounter(item.value, start, item.fixed);

  return (
    <article className="landing-card reveal" data-delay={delay}>
      <span className="landing-icon-box">
        <Icon name={item.icon} />
      </span>
      <strong className="landing-stat-value">
        {value}
        {item.suffix}
      </strong>
      <p>{item.label}</p>
    </article>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('#top');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );

    navLinks.forEach((link) => {
      const id = link.href.replace('#', '');
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-container landing-nav-inner">
          <a className="landing-brand" href="#top">
            <span className="landing-brand-mark">
              <img src={logo} alt="NMED" />
            </span>
            <span className="landing-brand-text">NMED</span>
          </a>

          <nav className="landing-links">
            {navLinks.map((link) => (
              <a
                key={link.href}
                className={active === link.href ? 'is-active' : ''}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="landing-nav-actions">
            <Link className="landing-btn landing-btn-outline landing-btn-sm" to="/login">
              Kirish
            </Link>
            <Link className="landing-btn landing-btn-primary landing-btn-sm" to="/register">
              Boshlash <Icon name="arrowRight" />
            </Link>
            <button
              className="landing-menu-button"
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Menyuni ochish"
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <div className={`landing-drawer ${open ? 'is-open' : ''}`}>
        <button
          className="landing-drawer-close"
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Menyuni yopish"
        >
          <Icon name="close" />
        </button>
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            <span>{link.label}</span>
            <Icon name="external" />
          </a>
        ))}
        <Link className="landing-btn landing-btn-outline" to="/login" onClick={() => setOpen(false)}>
          Kirish
        </Link>
        <Link className="landing-btn landing-btn-primary" to="/register" onClick={() => setOpen(false)}>
          Boshlash
        </Link>
      </div>
    </>
  );
}

function HeroDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setStep((current) => (current + 1) % 3),
      [2200, 2400, 3400][step]
    );
    return () => window.clearTimeout(timeout);
  }, [step]);

  return (
    <div className="landing-demo reveal" data-delay="2">
      <div className="landing-demo-glow" />
      <div className="landing-demo-frame">
        <div className="landing-demo-bar">
          <span />
          <span />
          <span />
          <b>nmed.uz/dashboard</b>
        </div>

        <div className="landing-demo-body">
          <div className="landing-demo-head">
            <div>
              <h4>EKG · Bemor #4471</h4>
              <p>Kardiologiya · 10:24</p>
            </div>
            <span className={`landing-pill ${step === 2 ? 'is-solid' : step === 1 ? 'is-light' : 'is-ghost'}`}>
              {step === 0 ? 'Yuklanmoqda' : step === 1 ? 'Tahlil qilinmoqda' : 'Tahlil tayyor'}
            </span>
          </div>

          {step === 0 ? (
            <div className="landing-demo-upload">
              <Icon name="upload" />
              <p>ekg_4471.dcm</p>
              <div className="landing-demo-progress">
                <span />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="landing-demo-loading">
              <div className="landing-demo-loading-row" />
              <div className="landing-demo-loading-card-row">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="landing-demo-result">
              <div className="landing-demo-wave">
                <svg viewBox="0 0 360 74" aria-hidden="true">
                  <path d="M0 37 L78 37 L96 14 L110 61 L124 8 L138 64 L152 37 L246 37 L296 37 L308 18 L322 57 L336 12 L350 61 L360 37" />
                </svg>
              </div>
              <div className="landing-demo-metrics">
                <div>
                  <small>Ritm</small>
                  <strong>Sinus</strong>
                </div>
                <div>
                  <small>QTc</small>
                  <strong>412 ms</strong>
                </div>
                <div>
                  <small>ST</small>
                  <strong>Normal</strong>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="landing-float-card landing-float-card-left">
        <span className="landing-float-icon"><Icon name="check-circle" /></span>
        <div>
          <strong>EKG tahlil tayyor</strong>
          <small>30 soniyada</small>
        </div>
      </div>

      <div className="landing-float-card landing-float-card-right">
        <span className="landing-float-icon is-blue"><Icon name="cpu" /></span>
        <div>
          <strong>AI: Normal ritm</strong>
          <small>Ishonch 99.2%</small>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="landing-hero" id="top">
      <div className="landing-hero-mesh" />
      <div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy">
          <span className="landing-pill is-ghost reveal">O‘zbekistondagi birinchi AI tibbiy platforma</span>
          <h1 className="reveal" data-delay="1">
            <span>Tibbiyotni</span>
            <span className="landing-gradient-text">aqlli qiling</span>
          </h1>
          <p className="reveal" data-delay="2">
            EKG, SMAD, Holter, laboratoriya va parazitologiya tahlillarini sun’iy intellekt
            bilan birlashtiruvchi zamonaviy platforma.
          </p>
          <div className="landing-hero-actions reveal" data-delay="3">
            <Link className="landing-btn landing-btn-primary landing-btn-lg" to="/login">
              Platformani ko‘rish <Icon name="arrowRight" />
            </Link>
            <button className="landing-btn landing-btn-ghost landing-btn-lg" type="button">
              <Icon name="play" /> Video ko‘rish
            </button>
          </div>
          <div className="landing-hero-stats reveal" data-delay="4">
            <div>
              <strong>142+</strong>
              <span>klinika</span>
            </div>
            <div>
              <strong>50K+</strong>
              <span>tahlil</span>
            </div>
            <div>
              <strong>99.2%</strong>
              <span>aniqlik</span>
            </div>
          </div>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}

function ProblemSolution() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Nima o‘zgaradi"
          title="Qog‘oz davridan"
          accent="raqamli davrga"
        />

        <div className="landing-problem-grid">
          <div className="landing-state-card landing-state-card-problem reveal" data-delay="1">
            <h3>Bugungi muammo</h3>
            <ul>
              {problemItems.map((item) => (
                <li key={item}>
                  <span className="landing-list-icon is-problem">
                    <Icon name="close" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-state-arrow reveal" data-delay="2">
            <span><Icon name="arrowRight" /></span>
            <b>NMED</b>
          </div>

          <div className="landing-state-card landing-state-card-solution reveal" data-delay="3">
            <h3>NMED bilan</h3>
            <ul>
              {solutionItems.map((item) => (
                <li key={item}>
                  <span className="landing-list-icon">
                    <Icon name="check-circle" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function BeforeAfter() {
  const [position, setPosition] = useState(52);
  const wrapRef = useRef(null);
  const draggingRef = useRef(false);

  const updatePosition = (clientX) => {
    if (!wrapRef.current) {
      return;
    }

    const rect = wrapRef.current.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(4, Math.min(96, next)));
  };

  useEffect(() => {
    const move = (event) => {
      if (!draggingRef.current) {
        return;
      }
      const point = 'touches' in event ? event.touches[0].clientX : event.clientX;
      updatePosition(point);
    };

    const stop = () => {
      draggingRef.current = false;
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
  }, []);

  return (
    <section className="landing-section landing-section-alt">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Solishtiring"
          title="Qog‘oz davri"
          accent="vs NMED"
          description="Tutqichni suring va jarayonlar farqini bir qarashda ko‘ring."
        />

        <div
          ref={wrapRef}
          className="landing-compare reveal"
          onMouseDown={(event) => {
            draggingRef.current = true;
            updatePosition(event.clientX);
          }}
          onTouchStart={(event) => {
            draggingRef.current = true;
            updatePosition(event.touches[0].clientX);
          }}
        >
          <div className="landing-compare-pane landing-compare-after">
            <span className="landing-compare-tag is-after">NMED</span>
            <div className="landing-compare-panel">
              <div className="landing-compare-panel-head">
                <strong>EKG · #4471</strong>
                <span className="landing-pill is-solid">30 soniya</span>
              </div>
              <div className="landing-compare-wave">
                <svg viewBox="0 0 320 56" aria-hidden="true">
                  <path d="M0 28 L70 28 L88 10 L98 46 L108 4 L118 52 L128 28 L218 28 L300 28 L308 14 L314 42 L320 28" />
                </svg>
              </div>
              <div className="landing-compare-chips">
                <span>Sinus</span>
                <span>412 ms</span>
                <span>Normal</span>
              </div>
            </div>
          </div>

          <div
            className="landing-compare-pane landing-compare-before"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            <span className="landing-compare-tag is-before">Qog‘oz</span>
            <div className="landing-paper-stack">
              {[0, 1, 2].map((index) => (
                <div key={index} className={`landing-paper-sheet landing-paper-sheet-${index}`}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </div>

          <div className="landing-compare-handle" style={{ left: `${position}%` }}>
            <span>
              <FiChevronLeft />
              <FiChevronRight />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="landing-section" id="xizmatlar">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Xizmatlar"
          title="Bitta platforma"
          accent="6 ta modul"
          description="Diagnostikadan masofaviy konsultatsiyagacha bo‘lgan butun jarayon yagona tizimga yig‘iladi."
        />

        <div className="landing-feature-grid">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`landing-card landing-feature-card reveal ${feature.highlight ? 'is-highlight' : ''}`}
              data-delay={(index % 3) + 1}
            >
              <div className="landing-feature-head">
                <span className="landing-icon-box">
                  <Icon name={feature.icon} />
                </span>
                {feature.highlight ? <span className="landing-pill is-solid">Yangi</span> : null}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              {feature.tags ? (
                <div className="landing-feature-tags">
                  {feature.tags.map((tag) => (
                    <span key={tag} className="landing-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Consultation() {
  return (
    <section className="landing-section landing-section-alt" id="konsultatsiya">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Online Konsultatsiya"
          title="Masofadan"
          accent="malaka bilan"
          description="Boshqa shahardagi mutaxassis shifokor bemor diagnostikasini platforma ichida ko‘rib, darhol maslahat beradi."
        />

        <div className="landing-consult-steps">
          {consultSteps.map((step, index) => (
            <article key={step.title} className="landing-card reveal" data-delay={index + 1}>
              <span className="landing-icon-box">
                <Icon name={step.icon} />
              </span>
              <small>{step.number}</small>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <div className="landing-consult-showcase">
          <div className="landing-consult-copy reveal">
            <h3>Video qo‘ng‘iroq platforma ichida</h3>
            <ul>
              <li>Diagnostika va suhbat bitta oynada.</li>
              <li>Bemor bilan yonma-yon tushuntirish imkoniyati.</li>
              <li>Masofaviy shifokor fikrini zudlik bilan olish.</li>
              <li>Qo‘ng‘iroq va xulosa tarixini saqlash.</li>
              <li>Tahlil natijasini parallel ko‘rish.</li>
              <li>Mutaxassis bilan tezkor hamkorlik.</li>
            </ul>
          </div>

          <div className="landing-video-frame reveal" data-delay="2">
            <div className="landing-demo-bar">
              <span />
              <span />
              <span />
              <b>nmed.uz/konsultatsiya</b>
              <em>LIVE</em>
            </div>
            <div className="landing-video-grid">
              <div className="landing-video-column">
                <div className="landing-video-person is-green">
                  <strong>Dr. Karimov</strong>
                  <small>Kardiolog · Toshkent</small>
                </div>
                <div className="landing-video-person is-blue">
                  <strong>Admin + Bemor</strong>
                  <small>Anor Klinikasi</small>
                </div>
              </div>
              <div className="landing-video-side">
                <b>Bemor diagnostikasi</b>
                <div className="landing-video-side-wave">
                  <svg viewBox="0 0 200 44" aria-hidden="true">
                    <path d="M0 22 L60 22 L72 8 L82 36 L92 4 L102 40 L112 22 L200 22" />
                  </svg>
                </div>
                <div className="landing-video-metrics">
                  <span><small>Ritm</small><strong>Sinus</strong></span>
                  <span><small>QTc</small><strong>412 ms</strong></span>
                  <span><small>BP</small><strong>128/82</strong></span>
                </div>
              </div>
            </div>
            <div className="landing-video-actions">
              <span className="landing-icon-box"><FiMic /></span>
              <span className="landing-icon-box"><FiVideo /></span>
              <span className="landing-icon-box"><FiMonitor /></span>
              <span className="landing-icon-box is-danger"><Icon name="phoneOff" /></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const lineRef = useRef(null);
  const fillRef = useRef(null);

  useEffect(() => {
    const update = () => {
      if (!lineRef.current || !fillRef.current) {
        return;
      }

      const rect = lineRef.current.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height + viewport * 0.4;
      const passed = Math.min(Math.max(viewport * 0.7 - rect.top, 0), total);
      fillRef.current.style.height = `${Math.min((passed / total) * 100, 100)}%`;
    };

    window.addEventListener('scroll', update, { passive: true });
    update();

    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <section className="landing-section">
      <div className="landing-container">
        <SectionHeader eyebrow="Qanday ishlaydi" title="4 qadamda boshlang" />

        <div className="landing-timeline" ref={lineRef}>
          <span className="landing-timeline-line">
            <i ref={fillRef} />
          </span>

          <div className="landing-timeline-list">
            {timelineSteps.map((step, index) => (
              <div key={step.number} className={`landing-timeline-row reveal ${index % 2 === 0 ? 'is-right' : 'is-left'}`}>
                <span className="landing-timeline-dot" />
                <article className="landing-card landing-timeline-card">
                  <div className="landing-timeline-head">
                    <span className="landing-icon-box">
                      <Icon name={step.icon} />
                    </span>
                    <strong>{step.number}</strong>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const ref = useRef(null);
  const [start, setStart] = useState(false);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current || start) {
        return;
      }
      const rect = ref.current.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.75 && rect.bottom > 0) {
        setStart(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [start]);

  const maxValue = Math.max(...monthValues);
  const maxRegion = Math.max(...regions.map((region) => region.count));

  return (
    <section className="landing-section landing-section-alt" id="statistika" ref={ref}>
      <div className="landing-container">
        <SectionHeader
          eyebrow="Statistika"
          title="Raqamlarda NMED"
          description="Platforma klinikalar va tahlillar oqimini bir necha yo‘nalishda kuzatib boradi."
        />

        <div className="landing-stats-grid">
          {stats.map((item, index) => (
            <StatCard key={item.label} item={item} start={start} delay={(index % 4) + 1} />
          ))}
        </div>

        <div className="landing-stats-detail">
          <article className="landing-card reveal">
            <div className="landing-chart-head">
              <h3>Oylik tahlillar soni (2026)</h3>
              <span className="landing-pill">
                <Icon name="trend" /> +186% o‘sish
              </span>
            </div>
            <div className="landing-bar-wrap">
              <div className="landing-bar-grid">
                {monthValues.map((value, index) => (
                  <div key={months[index]} className="landing-bar-item">
                    <span
                      className="landing-bar"
                      style={{ height: start ? `${(value / maxValue) * 100}%` : '0%' }}
                    />
                    <small>{months[index]}</small>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="landing-card reveal" data-delay="2">
            <div className="landing-chart-head">
              <h3>Hududlar bo‘yicha qamrov</h3>
              <span className="landing-pill">14 viloyat</span>
            </div>
            <p className="landing-map-note">Rang to‘qroq bo‘lsa, shu hududda faol klinikalar ko‘proq.</p>
            <div className="landing-map" onMouseLeave={() => setTip(null)}>
              {regions.map((region) => {
                const opacity = 0.34 + 0.64 * (region.count / maxRegion);
                return (
                  <button
                    key={region.name}
                    className="landing-map-region"
                    type="button"
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.w}%`,
                      height: `${region.h}%`,
                      background: `rgba(17, 148, 136, ${opacity})`,
                    }}
                    onMouseMove={(event) =>
                      setTip({
                        x: event.nativeEvent.offsetX,
                        y: event.nativeEvent.offsetY,
                        name: region.name,
                        count: region.count,
                      })
                    }
                  >
                    <span>{region.name}</span>
                  </button>
                );
              })}

              {tip ? (
                <div className="landing-map-tooltip" style={{ left: tip.x, top: tip.y }}>
                  {tip.name} · <b>{tip.count}</b> klinika
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Xavfsizlik"
          title="Ma’lumot ishonchli"
          accent="qo‘llarda"
          description="Tibbiy ma’lumotlar uchun xavfsizlik, audit va boshqaruv qatlamlari yagona tizimga yig‘ilgan."
        />

        <div className="landing-feature-grid">
          {securityItems.map((item, index) => (
            <article key={item.title} className="landing-card reveal" data-delay={(index % 3) + 1}>
              <span className="landing-icon-box">
                <Icon name={item.icon} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="landing-cert-row reveal">
          {['ISO 27001', 'HIPAA-mos', 'GDPR-mos', "O‘zStandart"].map((item) => (
            <span key={item} className="landing-pill is-ghost">
              <Icon name="shield" /> {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const marqueeItems = useMemo(() => [...testimonials, ...testimonials], []);

  return (
    <section className="landing-section landing-section-alt landing-section-overflow">
      <div className="landing-container">
        <SectionHeader eyebrow="Mijozlar fikri" title="Shifokorlar nima deydi?" />
      </div>

      <div className="landing-logo-marquee">
        <div>
          {['R.Doctor Clinics', 'MedCenter Toshkent', 'Anor Klinikasi', 'Shifobaxsh', 'SilkMed', 'NMED Partner'].map((item) => (
            <span key={item}>
              {item} <b>•</b>
            </span>
          ))}
          {['R.Doctor Clinics', 'MedCenter Toshkent', 'Anor Klinikasi', 'Shifobaxsh', 'SilkMed', 'NMED Partner'].map((item) => (
            <span key={`${item}-copy`}>
              {item} <b>•</b>
            </span>
          ))}
        </div>
      </div>

      <div className="landing-testimonial-marquee">
        <div>
          {marqueeItems.map((item, index) => (
            <article key={`${item.name}-${index}`} className="landing-card landing-testimonial-card">
              <div className="landing-testimonial-head">
                <span>{item.initials}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.role}</small>
                </div>
              </div>
              <b className="landing-testimonial-stars">★★★★★</b>
              <p>{item.quote}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Blog() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Blog"
          title="So‘nggi"
          accent="maqolalar"
          description="Tibbiy AI, amaliy tajriba va platforma yangiliklari bo‘yicha qisqa materiallar."
        />

        <div className="landing-blog-grid">
          {blogPosts.map((post, index) => (
            <article key={post.title} className="landing-card landing-blog-card reveal" data-delay={index + 1}>
              <div className={`landing-blog-thumb landing-blog-thumb-${index}`}>
                <Icon name={post.icon} />
                <span className="landing-pill is-ghost">{post.category}</span>
              </div>
              <div className="landing-blog-body">
                <h3>{post.title}</h3>
                <div className="landing-blog-meta">
                  <span>
                    <Icon name="calendar" /> {post.date}
                  </span>
                  <span>
                    <Icon name="clock" /> {post.read}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section className="landing-section landing-section-alt">
      <div className="landing-container landing-faq-wrap">
        <SectionHeader eyebrow="Savol-javob" title="Ko‘p so‘raladigan savollar" />
        <div className="landing-faq-list reveal">
          {faqs.map((item, index) => (
            <article key={item.q} className={`landing-faq-item ${open === index ? 'is-open' : ''}`}>
              <button type="button" onClick={() => setOpen(open === index ? -1 : index)}>
                <span>{item.q}</span>
                <Icon name="chevronDown" />
              </button>
              <div className="landing-faq-answer">
                <p>{item.a}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <>
      <section className="landing-section landing-cta-section">
        <div className="landing-container">
          <div className="landing-cta-card reveal">
            <div className="landing-cta-background" />
            <div className="landing-cta-content">
              <span>Bugundan boshlang</span>
              <h2>
                <strong>O‘z klinikangizni</strong>
                <b>raqamlashtiring</b>
              </h2>
              <p>5 daqiqada ro‘yxatdan o‘ting va platformani klinika jarayonlariga ulab ko‘ring.</p>
              <Link className="landing-btn landing-btn-white landing-btn-lg" to="/register">
                Hoziroq boshlash <Icon name="arrowRight" />
              </Link>
              <small>Kredit karta talab qilinmaydi · Sozlash 5 daqiqa · Istalgan payt bekor qilish</small>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer" id="footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <div className="landing-brand">
                <span className="landing-brand-mark">
                  <img src={logo} alt="NMED" />
                </span>
                <span className="landing-brand-text">NMED</span>
              </div>
              <p>O‘zbekistondagi tibbiy diagnostika platformasi.</p>
            </div>

            <div>
              <h4>Platforma</h4>
              <a href="#top">Platforma haqida</a>
              <a href="#xizmatlar">Xizmatlar</a>
              <a href="#konsultatsiya">Online konsultatsiya</a>
              <a href="#statistika">Statistika</a>
            </div>

            <div>
              <h4>Yordam</h4>
              <a href="#top">Foydalanuvchi qo‘llanmasi</a>
              <a href="#top">FAQ</a>
              <a href="#footer">Bog‘lanish</a>
              <a href="#top">Texnik yordam</a>
            </div>

            <div>
              <h4>Kontakt</h4>
              <span>Toshkent, O‘zbekiston</span>
              <span>info@nmed.uz</span>
              <span>nmed.uz</span>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© 2026 NMED. Barcha huquqlar himoyalangan.</span>
            <span>Maxfiylik siyosati · Foydalanish shartlari</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`landing-top-button ${visible ? 'is-visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Yuqoriga qaytish"
    >
      <Icon name="arrowUp" />
    </button>
  );
}

export default function LandingPage() {
  useReveal();
  useScrollProgress();

  return (
    <div className="landing-page-shell">
      <div className="landing-progress" />
      <Navbar />
      <Hero />
      <ProblemSolution />
      <BeforeAfter />
      <Features />
      <Consultation />
      <HowItWorks />
      <Stats />
      <Security />
      <Testimonials />
      <Blog />
      <Faq />
      <Footer />
      <BackToTop />
    </div>
  );
}
