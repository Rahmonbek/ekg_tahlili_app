// NMED Light — How It Works (vertical timeline)
const { Card: WCard } = window.UI;

const TLSTEPS = [
  { n: "01", icon: "building-2", title: "Klinikani roʻyxatdan oʻtkazing", body: "5 daqiqa. Klinika nomi, INN, manzil — hammasini onlaynda kiriting." },
  { n: "02", icon: "user-plus", title: "Bemorni qoʻshing", body: "Passport seriyasi va tugʻilgan sana — tizim bemorni topadi yoki yangi roʻyxat yaratadi." },
  { n: "03", icon: "upload-cloud", title: "Tahlil faylini yuklang", body: "EKG, SMAD, Holter, laboratoriya rasmi — drag & drop yoki fayl tanlash." },
  { n: "04", icon: "sparkles", title: "AI natijani tayyorlaydi", body: "30 soniyada toʻliq tahlil, PDF hisobot va shifokorga tavsiya." },
];

function HowItWorks() {
  const t = window.useLang();
  const lineRef = React.useRef(null);
  const fillRef = React.useRef(null);
  React.useEffect(() => {
    const onScroll = () => {
      const el = lineRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height + vh * 0.4;
      const passed = Math.min(Math.max(vh * 0.7 - r.top, 0), total);
      if (fillRef.current) fillRef.current.style.height = Math.min((passed / total) * 100, 100) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Qanday ishlaydi")}</span>
          <h2 className="headline">{t("4 qadamda boshlang")}</h2>
        </div>
        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto" }}>
          <div className="tl-line" ref={lineRef}><div className="tl-fill" ref={fillRef}></div></div>
          <div className="col" style={{ gap: 40 }}>
            {TLSTEPS.map((s, i) => {
              const right = i % 2 === 0;
              return (
                <div key={i} className="reveal tl-row" data-d={(i % 2) + 1}>
                  <span className="tl-node" aria-hidden="true"></span>
                  {right ? <div className="hide-md"></div> : null}
                  <div className="tl-card" style={{ gridColumn: right ? 2 : 1 }}>
                    <WCard style={{ padding: 28 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span className="icon-chip"><i data-lucide={s.icon}></i></span>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 44, color: "var(--surface-3)", lineHeight: 1 }}>{s.n}</span>
                      </div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, margin: "18px 0 8px", color: "var(--ink)" }}>{t(s.title)}</h3>
                      <p style={{ color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{t(s.body)}</p>
                    </WCard>
                  </div>
                  {!right ? <div className="hide-md"></div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
window.HowItWorks = HowItWorks;
