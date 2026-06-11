// NMED Light — Features / Services
const { Pill: FPill } = window.UI;

const FEATURES = [
  { icon: "activity", title: "EKG Tahlili", body: "12 qoʻrgʻoshinli EKG faylini yuklang — AI 30 soniyada yurak ritmini, ST segment va QTc intervalni tahlil qiladi.", tags: ["AI tahlil"] },
  { icon: "gauge", title: "SMAD Monitoring", body: "24 soatlik qon bosimi monitoring natijalarini AI sutkalik profil va tsirkad indeks bilan tahlil qiladi.", tags: [] },
  { icon: "heart-pulse", title: "Holter Monitoring", body: "48 soatlik yurak monitoringi — aritmiyalar, pauzalar, ST siljishlar avtomatik aniqlanadi.", tags: [] },
  { icon: "flask-conical", title: "Laboratoriya", body: "36 ta parametrni rasmdan ajratib oladi, normadan ogʻish boʻlsa belgilab shifokorga tavsiya beradi.", tags: [] },
  { icon: "microscope", title: "Parazitologiya", body: "Mikroskop rasmi asosida gijja turini aniqlaydi. Oʻzbekiston boʻyicha epidemiologik monitoring.", tags: [] },
  { icon: "video", title: "Online Konsultatsiya", body: "Boshqa klinikadagi mutaxassis shifokor bemor diagnostikasini koʻradi va video qoʻngʻiroq orqali maslahat beradi.", tags: ["Video qoʻngʻiroq", "Masofaviy"], highlight: true, isNew: true },
];

function FeatureCard({ f, d }) {
  const t = window.NMEDi18n.t;
  const ref = React.useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
    el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 7}deg) rotateX(${(0.5 - py) * 7}deg) translateY(-6px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <div className="reveal" data-d={d} style={{ display: "flex" }}>
      <div ref={ref} className="card lift feature-card" onMouseMove={onMove} onMouseLeave={onLeave} style={{ position: "relative", overflow: "hidden", padding: 30,
        display: "flex", flexDirection: "column", width: "100%", transformStyle: "preserve-3d",
        background: f.highlight ? "linear-gradient(180deg,#E7F6F3,#FFFFFF)" : "var(--surface)",
        borderColor: f.highlight ? "var(--line-strong)" : "var(--line)" }}>
        <span aria-hidden="true" className="spot" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0,
          transition: "opacity .3s var(--ease)", background: "radial-gradient(340px circle at var(--mx,50%) var(--my,0), rgba(22,184,166,0.10), transparent 60%)" }}></span>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="icon-chip"><i data-lucide={f.icon}></i></span>
            {f.isNew && <FPill variant="solid" style={{ fontSize: 11, padding: "5px 11px" }}>{t("YANGI")}</FPill>}
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--fs-h3)", margin: "22px 0 9px", color: "var(--ink)" }}>{t(f.title)}</h3>
          <p style={{ color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6, margin: 0, flex: 1 }}>{t(f.body)}</p>
          {f.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
              {f.tags.map((tg, i) => <FPill key={i}>{t(tg)}</FPill>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Features() {
  const t = window.useLang();
  return (
    <section className="section" id="xizmatlar">
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Xizmatlar")}</span>
          <h2 className="headline">{t("Bitta platforma — ")}<span className="grad-text">{t("6 ta modul")}</span></h2>
          <p className="sub">{t("Diagnostikadan masofaviy konsultatsiyagacha — barchasi sunʼiy intellekt bilan.")}</p>
        </div>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
          {FEATURES.map((f, i) => <FeatureCard key={i} f={f} d={(i % 3) + 1} />)}
        </div>
      </div>
      <style>{`.feature-card{transition:transform .12s ease-out, box-shadow .35s var(--ease), border-color .35s var(--ease)}.feature-card:hover .spot{opacity:1}`}</style>
    </section>
  );
}
window.Features = Features;
