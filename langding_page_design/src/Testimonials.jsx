// NMED landing — Testimonials (logo marquee + doctor cards marquee)
const { Avatar: TAvatar } = window.NMED;

const LOGOS = ["R.Doctor Clinics", "MedCenter Toshkent", "Anor Klinikasi", "Shifobaxsh", "SilkMed"];
const QUOTES = [
  { n: "Dr. Karimov", r: "Kardiolog", q: "EKG tahlili 30 daqiqadan 30 soniyaga tushdi." },
  { n: "Dr. Azimova", r: "Terapevt", q: "Lab natijalarini AI tahlil qilgach bemorlarimga koʻproq vaqt qoldim." },
  { n: "Dr. Yusupov", r: "Kardiolog", q: "Holter xulosasi juda batafsil, AI hatto men koʻrmagan narsalarni topdi." },
  { n: "Dr. Hasanov", r: "GP", q: "Online konsultatsiya orqali Toshkentdan mutaxassis bilan maslahat olyapmiz." },
  { n: "Dr. Rahimova", r: "Laborant", q: "Parazitologiya moduli gijja aniqlikda bizni hayron qoldirdi." },
];

function QuoteCard({ t }) {
  return (
    <div className="glass" style={{ width: 320, flexShrink: 0, borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TAvatar name={t.n} size={42} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{t.n}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t.r}</div>
        </div>
      </div>
      <div style={{ color: "var(--warning)", fontSize: 14, margin: "12px 0 8px", letterSpacing: 2 }}>★★★★★</div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>"{t.q}"</p>
    </div>
  );
}

function Testimonials() {
  return (
    <section className="section" style={{ overflow: "hidden" }}>
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">Mijozlar fikri</span>
          <h2 className="headline">Shifokorlar nima deydi?</h2>
        </div>
      </div>

      {/* logos */}
      <div className="marquee-wrap" style={{ overflow: "hidden", marginBottom: 28 }}>
        <div className="marquee">
          {[...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS].map((l, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 24, color: "var(--text-secondary)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, opacity: .6, whiteSpace: "nowrap" }}>
              {l} <span style={{ color: "var(--green)" }}>•</span>
            </span>
          ))}
        </div>
      </div>

      {/* quotes */}
      <div className="marquee-wrap" style={{ overflow: "hidden" }}>
        <div className="marquee rev" style={{ gap: 20 }}>
          {[...QUOTES, ...QUOTES].map((t, i) => <QuoteCard key={i} t={t} />)}
        </div>
      </div>
    </section>
  );
}
window.Testimonials = Testimonials;
