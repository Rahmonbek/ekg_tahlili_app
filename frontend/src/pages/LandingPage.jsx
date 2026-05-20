import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useScroll, useTransform } from 'framer-motion';
import './LandingPage.css';
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiChevronDown,
  FiCpu,
  FiGithub,
  FiGlobe,
  FiHeart,
  FiMenu,
  FiMic,
  FiMoon,
  FiPlay,
  FiSun,
  FiUpload,
  FiUserPlus,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import logo from '../images/logo.png';
import CustomCursor from '../components/ui/CustomCursor';
import ScrollProgress from '../components/ui/ScrollProgress';
import ParticleField from '../components/ui/ParticleField';
import Reveal from '../components/ui/Reveal';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import {
  blurVariants,
  containerVariants,
  fadeUpVariants,
  scaleVariants,
  slideLeftVariants,
  slideRightVariants,
} from '../animations/variants';

const features = [
  ['EKG Tahlili', '12 qo‘rg‘oshinli EKG faylini yuklang. AI 30 soniyada yurak ritmi, ST segment va QTc intervalni tahlil qiladi.', FiActivity],
  ['SMAD Monitoring', '24 soatlik qon bosimi monitoringi sutkalik profil va tsirkad indeks bilan tahlil qilinadi.', FiBarChart2],
  ['Holter Monitoring', '48 soatlik yurak monitoringida aritmiyalar, pauzalar va ST siljishlar avtomatik aniqlanadi.', FiHeart],
  ['Laboratoriya Tahlili', '36 ta parametr rasmdan ajratiladi, normadan og‘ish bo‘lsa shifokorga aniq signal beradi.', FiMic],
  ['Parazitologiya', 'Mikroskop rasmi asosida gijja turi aniqlanadi va epidemiologik kuzatuvga tayyorlanadi.', FiGlobe],
  ['Online Konsultatsiya', 'Boshqa klinika mutaxassisi bilan real vaqt video konsultatsiya va bemor diagnostikasini birga ko‘rish.', FiVideo],
];

const chartData = [28, 44, 39, 62, 78, 91, 105, 122, 136, 151, 168, 192];
const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const testimonials = [
  ['KS', 'EKG tahlili avval 30 daqiqa olardi, endi 30 soniya. Bemorlarim sonini 2 baravarga oshirdim.', 'Dr. Karimov Sh.', 'Kardiolog, Toshkent'],
  ['AM', 'Lab natijalarini AI tahlil qilgandan so‘ng, vaqtim bemor bilan gaplashishga ko‘proq qoldi.', 'Dr. Azimova M.', 'Terapevt, Samarqand'],
  ['YB', 'Holter monitoring xulosasi juda batafsil, hatto o‘zim ko‘rmagan narsalarni AI topdi.', 'Dr. Yusupov B.', 'Kardiolog, Farg‘ona'],
  ['RN', 'Parazitologiya moduli laboratoriyamiz ish hajmini ikki baravarga qisqartirdi.', 'Dr. Rahimova N.', 'Laborant, Namangan'],
  ['HA', 'Online konsultatsiya orqali Toshkentdagi mutaxassis bilan real vaqtda maslahat olaman.', 'Dr. Hasanov A.', 'Shifokor, Termiz'],
];

const navLinks = [
  ['Platforma haqida', '#platforma'],
  ['Xizmatlar', '#xizmatlar'],
  ['Statistika', '#statistika'],
  ['Klinikalar', '#klinikalar'],
  ['Bog‘lanish', '#boglanish'],
];

const regions = [
  ['Toshkent', 38],
  ['Samarqand', 16],
  ['Farg‘ona', 14],
  ['Andijon', 12],
  ['Namangan', 10],
  ['Buxoro', 9],
  ['Qashqadaryo', 8],
  ['Surxondaryo', 7],
  ['Navoiy', 6],
  ['Xorazm', 6],
  ['Jizzax', 5],
  ['Sirdaryo', 4],
  ['Qoraqalpog‘iston', 4],
  ['Toshkent vil.', 3],
];

function Navbar({ light, setLight }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      className="nmed-navbar"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Link className="nmed-nav-brand" to="/">
        <span className="nmed-logo-pulse"><img src={logo} alt="NMED" /></span>
        <span>NMED</span>
      </Link>
      <nav aria-label="Landing navigation">
        {navLinks.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
      </nav>
      <div className="nmed-nav-actions">
        <button className="nmed-icon-btn" type="button" onClick={() => setLight(!light)} aria-label="Toggle theme">
          {light ? <FiMoon /> : <FiSun />}
        </button>
        <Link className="nmed-gradient-btn nmed-login-cta" to="/login">Kirish</Link>
        <Link className="nmed-outline-btn nmed-start-cta" to="/register">Boshlash</Link>
        <button className="nmed-icon-btn nmed-menu-btn" type="button" onClick={() => setMobileOpen(true)} aria-label="Menyuni ochish">
          <FiMenu />
        </button>
      </div>
      <motion.div
        className="nmed-mobile-drawer"
        initial={false}
        animate={mobileOpen ? 'open' : 'closed'}
        variants={{
          open: { opacity: 1, x: 0, pointerEvents: 'auto' },
          closed: { opacity: 0, x: 40, pointerEvents: 'none' },
        }}
        transition={{ duration: 0.24 }}
        aria-hidden={!mobileOpen}
      >
        <button type="button" onClick={() => setMobileOpen(false)} aria-label="Menyuni yopish"><FiX /></button>
        {navLinks.map(([label, href]) => <a href={href} key={label} onClick={() => setMobileOpen(false)}>{label}</a>)}
        <Link to="/login" onClick={() => setMobileOpen(false)}>Kirish</Link>
        <Link to="/register" onClick={() => setMobileOpen(false)}>Boshlash</Link>
      </motion.div>
    </motion.header>
  );
}

function HeroSection() {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 16);
    rotateX.set(y * -12);
  };

  return (
    <section className="nmed-hero" id="platforma">
      <ParticleField />
      <div className="nmed-grid-overlay" />
      <motion.div className="nmed-hero-copy" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="nmed-hero-badge" variants={fadeUpVariants}>O‘zbekistondagi birinchi AI diagnostika platformasi</motion.div>
        <motion.h1 variants={containerVariants} aria-label="Tibbiyotni Aqlli qiling">
          {['Tibbiyotni', 'Aqlli qiling'].map((word, index) => (
            <motion.span key={word} className={index === 1 ? 'nmed-gradient-text' : ''} variants={blurVariants} aria-hidden="true">
              {word}
            </motion.span>
          ))}
        </motion.h1>
        <motion.p className="nmed-typewriter" variants={fadeUpVariants}>
          NMED — EKG, SMAD, Holter va laboratoriya tahlillarini sun'iy intellekt yordamida tahlil qiluvchi zamonaviy tibbiy diagnostika platformasi.
        </motion.p>
        <motion.div className="nmed-hero-actions" variants={fadeUpVariants}>
          <Link className="nmed-gradient-btn nmed-large-btn" to="/login">Tizimga kirish <FiArrowRight /></Link>
          <button className="nmed-video-btn" type="button"><FiPlay /> Video ko‘rish</button>
        </motion.div>
        <motion.div className="nmed-scroll-cue" animate={{ y: [0, 10, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <FiChevronDown />
          <span>Pastga suring</span>
        </motion.div>
      </motion.div>

      <motion.div
        className="nmed-dashboard-wrap"
        onMouseMove={handleMove}
        onMouseLeave={() => { rotateX.set(0); rotateY.set(0); }}
        initial={{ x: 100, opacity: 0, rotateY: 15 }}
        animate={{ x: 0, opacity: 1, rotateY: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ rotateX, rotateY }}
      >
        <div className="nmed-glow-ring" />
        <div className="nmed-dashboard">
          <div className="nmed-window-dots"><span /><span /><span /></div>
          <div className="nmed-dash-sidebar"><b>NMED</b><span>EKG</span><span>SMAD</span><span>Holter</span><span>Lab</span></div>
          <div className="nmed-dash-main">
            <div className="nmed-dash-top"><span>Bemor: A. Rahmonov</span><em>AI tayyor</em></div>
            <svg viewBox="0 0 460 150" className="nmed-ecg-wave" aria-hidden="true">
              <motion.path d="M0 82 L60 82 L76 32 L92 120 L112 82 L160 82 L176 56 L190 96 L208 82 L260 82 L278 22 L296 128 L318 82 L460 82" pathLength={1} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, repeat: Infinity, repeatType: 'loop', repeatDelay: 0.4 }} />
            </svg>
            <div className="nmed-dash-cards"><span>QTc 412 ms</span><span>ST normal</span><span>Ritm sinus</span></div>
          </div>
        </div>
        <motion.div className="nmed-float-card nmed-float-one" animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity }}>EKG tahlil tayyor</motion.div>
        <motion.div className="nmed-float-card nmed-float-two" animate={{ y: [0, -16, 0] }} transition={{ duration: 3.7, repeat: Infinity }}>AI aniqladi: Normal ritm</motion.div>
        <motion.div className="nmed-float-card nmed-float-three" animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>142 ta klinika</motion.div>
      </motion.div>
    </section>
  );
}

function PaperChaosIllustration() {
  return (
    <div className="nmed-paper-illustration" aria-hidden="true">
      <svg viewBox="0 0 520 170" role="img">
        <defs>
          <linearGradient id="paperScan" x1="0" x2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0" />
            <stop offset="48%" stopColor="#fb7185" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
          <filter id="paperGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.g animate={{ rotate: [-1, 1.5, -1], y: [0, -4, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}>
          <path className="nmed-paper-sheet back" d="M70 30h210l34 34v74H70z" />
          <path className="nmed-paper-fold back" d="M280 30v34h34" />
          {[58, 78, 98, 118].map((y) => <path key={y} className="nmed-paper-line back" d={`M96 ${y}h150`} />)}
        </motion.g>
        <motion.g animate={{ rotate: [1.5, -1.5, 1.5], y: [0, 5, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}>
          <path className="nmed-paper-sheet front" d="M180 18h220l38 38v96H180z" />
          <path className="nmed-paper-fold front" d="M400 18v38h38" />
          <motion.path
            className="nmed-paper-ecg"
            d="M210 92h34l10-26 17 60 16-34h35l13-24 14 48 12-24h48"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 1.9, repeat: Infinity, repeatDelay: 0.35 }}
          />
          {[56, 122, 140].map((y) => <path key={y} className="nmed-paper-line front" d={`M210 ${y}h150`} />)}
        </motion.g>
        <motion.path className="nmed-lost-path" d="M78 132 C145 88, 214 168, 292 124 S402 104, 455 136" animate={{ pathLength: [0.18, 1, 0.18], opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 3.3, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.rect className="nmed-scan-danger" x="60" y="18" width="42" height="136" animate={{ x: [60, 418, 60], opacity: [0, 0.8, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.g className="nmed-warning-chip" animate={{ scale: [1, 1.04, 1], opacity: [0.86, 1, 0.86] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <rect x="338" y="106" width="112" height="34" rx="17" />
          <path d="M358 115l9 17m0-17l-9 17" />
          <text x="382" y="128">Qo'lda</text>
        </motion.g>
      </svg>
    </div>
  );
}

function AiMonitorIllustration() {
  return (
    <div className="nmed-monitor-illustration" aria-hidden="true">
      <svg viewBox="0 0 520 170" role="img">
        <defs>
          <radialGradient id="aiCore" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
          <filter id="aiGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.rect className="nmed-monitor-frame" x="64" y="18" width="392" height="118" rx="22" animate={{ opacity: [0.88, 1, 0.88] }} transition={{ duration: 3, repeat: Infinity }} />
        <path className="nmed-monitor-stand" d="M238 136h44l8 18h-60z" />
        <path className="nmed-monitor-base" d="M204 154h112" />
        <motion.circle className="nmed-ai-core" cx="260" cy="76" r="38" animate={{ scale: [0.92, 1.08, 0.92] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.g className="nmed-ai-orbits" animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} style={{ originX: '260px', originY: '76px' }}>
          <ellipse cx="260" cy="76" rx="84" ry="34" />
          <ellipse cx="260" cy="76" rx="84" ry="34" transform="rotate(60 260 76)" />
          <ellipse cx="260" cy="76" rx="84" ry="34" transform="rotate(120 260 76)" />
        </motion.g>
        <text className="nmed-ai-text" x="260" y="84">AI</text>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <motion.circle
            key={index}
            className="nmed-ai-node"
            cx={[162, 206, 332, 358, 224, 304][index]}
            cy={[62, 116, 42, 108, 44, 128][index]}
            r="5"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.24, 0.85] }}
            transition={{ duration: 2.2, delay: index * 0.18, repeat: Infinity }}
          />
        ))}
        <motion.path className="nmed-clean-ecg" d="M92 104h72l14-34 20 66 22-48h70l18-30 18 58 17-28h86" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: false }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.35 }} />
        <motion.g className="nmed-ready-chip" animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          <rect x="334" y="28" width="100" height="30" rx="15" />
          <path d="M352 43l8 8 17-18" />
          <text x="386" y="48">Tayyor</text>
        </motion.g>
      </svg>
    </div>
  );
}

function ProblemSolution() {
  const problems = ['Qog‘oz tahlillar yo‘qoladi', 'Qayta ishlash sekin', 'Xato tashxis xavfi', 'Shifokor vaqtini boy beradi'];
  const solutions = ['Soniyalarda tahlil', 'AI xatolikni kamaytiradi', 'Hamma joydan kirish', 'Arxivlash avtomatik'];
  return (
    <section className="nmed-section nmed-problem" id="muammo">
      <Reveal className="nmed-problem-panel danger" variants={slideRightVariants}>
        <h2>Hozirgi holat</h2>
        <PaperChaosIllustration />
        {problems.map((item) => <p key={item}><FiX /> {item}</p>)}
      </Reveal>
      <Reveal className="nmed-problem-arrow" variants={scaleVariants}>
        <span>→</span>
        <b>NMED bilan o‘zgaradi</b>
      </Reveal>
      <Reveal className="nmed-problem-panel success" variants={slideLeftVariants}>
        <h2>NMED bilan</h2>
        <AiMonitorIllustration />
        {solutions.map((item) => <p key={item}><FiCheck /> {item}</p>)}
      </Reveal>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="nmed-section" id="xizmatlar">
      <Reveal as="div" className="nmed-section-head" variants={blurVariants}>
        <span>Xizmatlar</span>
        <h2>Nima qila oladi?</h2>
      </Reveal>
      <Reveal className="nmed-feature-grid" variants={containerVariants}>
        {features.map(([title, text, Icon], index) => (
          <motion.article
            className="nmed-glass-card nmed-feature-card nmed-hover-target"
            key={title}
            custom={index}
            variants={fadeUpVariants}
            whileHover={{ rotateX: -5, rotateY: 5, scale: 1.02, boxShadow: '0 20px 60px rgba(0, 212, 170, 0.2)' }}
          >
            <Icon />
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </Reveal>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ['01', 'Ro‘yxatdan o‘tish', 'Klinika ma’lumotlari, INN → 5 daqiqada tayyor', FiGlobe],
    ['02', 'Bemor qo‘shish', 'Passport scan yoki qo‘lda kiritish', FiUserPlus],
    ['03', 'Tahlil yuklash', 'Drag & Drop fayl — format tekshiriladi', FiUpload],
    ['04', 'Natija olish', 'AI tahlil qiladi, PDF hisobot, shifokor ko‘radi', FiCpu],
  ];
  return (
    <section className="nmed-section nmed-how">
      <Reveal className="nmed-section-head" variants={blurVariants}>
        <span>Jarayon</span>
        <h2>Qanday ishlaydi?</h2>
      </Reveal>
      <div className="nmed-how-grid">
        <Reveal className="nmed-steps" variants={containerVariants}>
          <motion.svg className="nmed-step-line" viewBox="0 0 20 460" preserveAspectRatio="none" aria-hidden="true">
            <motion.path d="M10 0 V460" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: false }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
          </motion.svg>
          {steps.map(([num, title, text, Icon]) => (
            <motion.article className="nmed-step-card" key={num} variants={fadeUpVariants}>
              <Icon />
              <div><strong>{num}</strong><h3>{title}</h3><p>{text}</p></div>
            </motion.article>
          ))}
        </Reveal>
        <Reveal className="nmed-live-demo" variants={slideLeftVariants}>
          <div className="nmed-ai-orbit"><span>AI</span><i /><i /><i /></div>
          <h3>Live demo</h3>
          <p>Fayl yuklanadi, AI tekshiradi, shifokor yakunlaydi. Jarayon vizual va nazorat ostida.</p>
        </Reveal>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [[142, '+', 'Klinikalar'], [50000, '+', 'Tahlillar'], [14, '', 'Viloyat'], [99.2, '%', 'Aniqlik darajasi']];
  return (
    <section className="nmed-section nmed-stats" id="statistika">
      <Reveal className="nmed-section-head center" variants={blurVariants}>
        <span>Statistika</span>
        <h2>Raqamlarda NMED</h2>
      </Reveal>
      <Reveal className="nmed-stats-grid" variants={containerVariants}>
        {stats.map(([value, suffix, label]) => (
          <motion.article className="nmed-stat-card" key={label} variants={scaleVariants}>
            <AnimatedCounter value={value} suffix={suffix} precision={value % 1 ? 1 : 0} />
            <span>{label}</span>
          </motion.article>
        ))}
      </Reveal>
      <Reveal className="nmed-chart-map" variants={containerVariants}>
        <motion.div className="nmed-chart" variants={fadeUpVariants}>
          {chartData.map((value, index) => (
            <motion.div className="nmed-bar-wrap" key={months[index]}>
              <motion.span initial={{ height: 0 }} whileInView={{ height: `${value / 2}px` }} viewport={{ once: false }} transition={{ duration: 1.2, delay: index * 0.04 }} />
              <b>{months[index]}</b>
            </motion.div>
          ))}
        </motion.div>
        <motion.div className="nmed-uz-map" variants={fadeUpVariants} aria-label="O‘zbekiston klinikalar xaritasi">
          {regions.map(([name, clinics], index) => (
            <motion.span
              key={name}
              title={`${name}: ${clinics} klinika`}
              aria-label={`${name}: ${clinics} klinika`}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 0.46 + index * 0.035, scale: 1 }}
              viewport={{ once: false }}
              transition={{ delay: index * 0.05 }}
            >
              <b>{name}</b>
              <small>{clinics}</small>
            </motion.span>
          ))}
        </motion.div>
      </Reveal>
    </section>
  );
}

function Testimonials() {
  const doubled = useMemo(() => [...testimonials, ...testimonials], []);
  return (
    <section className="nmed-section nmed-testimonials" id="klinikalar">
      <Reveal className="nmed-section-head center" variants={blurVariants}>
        <span>Klinikalar</span>
        <h2>Shifokorlar ishlatadigan platforma</h2>
      </Reveal>
      <div className="nmed-logo-marquee"><div className="nmed-marquee-track">{['R.Doctor Clinics', 'Med Center', 'NMED Lab', 'Cardio Plus', 'Toshkent Medical', 'Samarqand Clinic', 'R.Doctor Clinics', 'Med Center', 'NMED Lab', 'Cardio Plus', 'Toshkent Medical', 'Samarqand Clinic'].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div></div>
      <div className="nmed-review-marquee"><div className="nmed-marquee-track reverse">{doubled.map(([initials, quote, name, role], index) => <article className="nmed-review-card" key={`${name}-${index}`}><div>{initials}</div><b>★★★★★</b><p>“{quote}”</p><h3>{name}</h3><span>{role}</span></article>)}</div></div>
    </section>
  );
}

function CtaFooter() {
  return (
    <section className="nmed-cta-footer" id="boglanish">
      <Reveal className="nmed-cta" variants={containerVariants}>
        <motion.h2 variants={blurVariants}>O‘z klinikangizni <span>raqamlashtiring</span></motion.h2>
        <motion.p variants={fadeUpVariants}>5 daqiqada ro‘yxatdan o‘ting. Birinchi oy bepul.</motion.p>
        <motion.div variants={fadeUpVariants}><Link className="nmed-gradient-btn nmed-large-btn" to="/register">Hoziroq boshlash <FiArrowRight /></Link></motion.div>
      </Reveal>
      <footer className="nmed-footer">
        <div><h3>NMED</h3><a href="#platforma">Haqimizda</a><a href="#klinikalar">Blog</a><a href="#statistika">Yangiliklar</a></div>
        <div><h3>Xizmatlar</h3><a href="#xizmatlar">EKG</a><a href="#xizmatlar">SMAD</a><a href="#xizmatlar">Holter</a><a href="#xizmatlar">Lab</a></div>
        <div><h3>Yordam</h3><a href="#platforma">Qo‘llanma</a><a href="#xizmatlar">FAQ</a><a href="#boglanish">Bog‘lanish</a></div>
        <div><h3>Kontakt</h3><p>Toshkent, O‘zbekiston</p><p>info@nmed.uz</p><div className="nmed-social"><a href="https://github.com" aria-label="GitHub"><FiGithub /></a><a href="#platforma" aria-label="Veb-sayt"><FiGlobe /></a><a href="#xizmatlar" aria-label="Video konsultatsiya"><FiVideo /></a></div></div>
      </footer>
      <div className="nmed-copyright">2026 NMED. Barcha huquqlar himoyalangan.</div>
    </section>
  );
}

export default function LandingPage() {
  const [light, setLight] = useState(false);
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -300]);

  return (
    <div className={`nmed-landing ${light ? 'light' : ''}`}>
      <a className="nmed-skip-link" href="#main">Asosiy kontentga o‘tish</a>
      <ScrollProgress />
      <CustomCursor />
      <Navbar light={light} setLight={setLight} />
      <motion.div className="nmed-parallax one" style={{ y: y1 }} />
      <motion.div className="nmed-parallax two" style={{ y: y2 }} />
      <main id="main">
        <HeroSection />
        <ProblemSolution />
        <FeaturesSection />
        <HowItWorks />
        <StatsSection />
        <Testimonials />
        <CtaFooter />
      </main>
    </div>
  );
}
