// NMED Light — Testimonials (logo marquee + doctor cards marquee)
const { Avatar: TAvatar } = window.UI;

const LOGOS = ["R.Doctor Clinics", "MedCenter Toshkent", "Anor Klinikasi", "Shifobaxsh", "SilkMed"];
const QUOTES = [
  { n: "Dr. Karimov", r: "Kardiolog", q: "EKG tahlili 30 daqiqadan 30 soniyaga tushdi." },
  { n: "Dr. Azimova", r: "Terapevt", q: "Lab natijalarini AI tahlil qilgach bemorlarimga koʻproq vaqt qoldim." },
  { n: "Dr. Yusupov", r: "Kardiolog", q: "Holter xulosasi juda batafsil, AI hatto men koʻrmagan narsalarni topdi." },
  { n: "Dr. Hasanov", r: "GP", q: "Online konsultatsiya orqali Toshkentdan mutaxassis bilan maslahat olyapmiz." },
  { n: "Dr. Rahimova", r: "Laborant", q: "Parazitologiya moduli gijja aniqlikda bizni hayron qoldirdi." },
];

function QuoteCard({ t: q }) {
  const t = window.NMEDi18n.t;
  return (
    <div className="card" style={{ width: 330, flexShrink: 0, padding: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TAvatar name={q.n} size={44} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{q.n}</div>
          <div style={{ color: "var(--ink-3)", fontSize: 13 }}>{t(q.r)}</div>
        </div>
      </div>
      <div style={{ color: "var(--amber)", fontSize: 14, margin: "14px 0 8px", letterSpacing: 2 }}>★★★★★</div>
      <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>“{t(q.q)}”</p>
    </div>
  );
}

function Testimonials() {
  const t = window.useLang();
  return (
    <section className="section section--mint" style={{ overflow: "hidden" }}>
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Mijozlar fikri")}</span>
          <h2 className="headline">{t("Shifokorlar nima deydi?")}</h2>
        </div>
      </div>

      <div className="marquee-wrap" style={{ marginBottom: 26 }}>
        <div className="marquee">
          {[...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS].map((l, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 22, color: "var(--ink-3)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, whiteSpace: "nowrap" }}>
              {l} <span style={{ color: "var(--teal)" }}>•</span>
            </span>
          ))}
        </div>
      </div>

      <div className="marquee-wrap">
        <div className="marquee rev" style={{ gap: 20 }}>
          {[...QUOTES, ...QUOTES].map((t, i) => <QuoteCard key={i} t={t} />)}
        </div>
      </div>
    </section>
  );
}
window.Testimonials = Testimonials;
