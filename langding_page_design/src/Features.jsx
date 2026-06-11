// NMED landing — Features / Services grid
const { GlassCard: FGlassCard, Badge: FBadge } = window.NMED;

const FEATURES = [
  { icon: "activity", title: "EKG Tahlili", body: "12 qoʻrgʻoshinli EKG faylini yuklang — AI 30 soniyada yurak ritmini, ST segment va QTc intervalni tahlil qiladi.", tags: ["AI tahlil"] },
  { icon: "gauge", title: "SMAD Monitoring", body: "24 soatlik qon bosimi monitoring natijalarini AI sutkalik profil va tsirkad indeks bilan tahlil qiladi.", tags: [] },
  { icon: "heart-pulse", title: "Holter Monitoring", body: "48 soatlik yurak monitoringi — aritmiyalar, pauzalar, ST siljishlar AI tomonidan avtomatik aniqlanadi.", tags: [] },
  { icon: "flask-conical", title: "Laboratoriya Tahlili", body: "36 ta parametrni rasmdan ajratib oladi, normadan ogʻish boʻlsa belgilab shifokorga tavsiya beradi.", tags: [] },
  { icon: "microscope", title: "Parazitologiya", body: "Mikroskop rasmi asosida gijja turini aniqlaydi. Oʻzbekiston boʻyicha epidemiologik monitoring.", tags: [] },
  { icon: "video", title: "Online Konsultatsiya", body: "Boshqa klinikadagi mutaxassis shifokor bemor diagnostikasini platforma orqali koʻradi va video qoʻngʻiroq asosida maslahat beradi.", tags: ["Video qoʻngʻiroq", "Masofaviy koʻrik"], highlight: true, isNew: true },
];

function FeatureCard({ f, d }) {
  // pointer-tracking spotlight (polish)
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", (e.clientX - r.left) + "px");
    e.currentTarget.style.setProperty("--my", (e.clientY - r.top) + "px");
  };
  return (
    <div className="reveal" data-d={d} style={{ display: "flex" }}>
      <FGlassCard highlight={f.highlight} radius="xl" className="feature-card" onMouseMove={onMove}
        style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", width: "100%" }}>
        <span aria-hidden="true" style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0, transition: "opacity .3s var(--ease-out)",
          background: "radial-gradient(360px circle at var(--mx,50%) var(--my,0), rgba(42,167,155,0.12), transparent 60%)",
        }} className="spotlight"></span>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="icon-chip"><i data-lucide={f.icon}></i></span>
            {f.isNew && <FBadge variant="new">YANGI</FBadge>}
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-h3)", margin: "20px 0 10px" }}>{f.title}</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6, margin: 0, flex: 1 }}>{f.body}</p>
          {f.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {f.tags.map((t, i) => <FBadge key={i}>{t}</FBadge>)}
            </div>
          )}
        </div>
      </FGlassCard>
    </div>
  );
}

function Features() {
  return (
    <section className="section grid-bg" id="xizmatlar">
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">Xizmatlar</span>
          <h2 className="headline">Nima qila oladi?</h2>
          <p className="sub">6 ta kuchli modul — bitta platformada</p>
        </div>
        <div className="grid-3 features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {FEATURES.map((f, i) => <FeatureCard key={i} f={f} d={(i % 3) + 1} />)}
        </div>
      </div>
      <style>{`.feature-card:hover .spotlight{ opacity:1 }`}</style>
    </section>
  );
}
window.Features = Features;
