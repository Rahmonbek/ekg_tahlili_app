// NMED Light — Blog / yangiliklar teaser
const POSTS = [
  { cat: "Texnologiya", icon: "activity", grad: "linear-gradient(135deg,#16B8A6,#0E8C81)", t: "AI EKG tahlilida ST segment va QTc qanday hisoblanadi", date: "12-Iyun, 2026", read: "5 daqiqa" },
  { cat: "Amaliyot", icon: "video", grad: "linear-gradient(135deg,#2E72C8,#155A98)", t: "Online konsultatsiya: 142 klinika tajribasidan 5 saboq", date: "4-Iyun, 2026", read: "7 daqiqa" },
  { cat: "Tadqiqot", icon: "microscope", grad: "linear-gradient(135deg,#16B8A6,#2E72C8)", t: "Parazitologiyada AI va epidemiologik monitoring", date: "28-May, 2026", read: "6 daqiqa" },
];

function Blog() {
  const t = window.useLang();
  return (
    <section className="section" id="blog">
      <div className="container">
        <div className="head-center reveal" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="eyebrow">{t("Blog")}</span>
          <h2 className="headline">{t("Soʻnggi ")}<span className="grad-text">{t("maqolalar")}</span></h2>
          <p className="sub">{t("Tibbiy AI, amaliyot va platforma yangiliklari.")}</p>
        </div>

        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {POSTS.map((p, i) => (
            <a key={i} href="#" className="reveal card lift" data-d={(i % 3) + 1} style={{ display: "flex", flexDirection: "column", textDecoration: "none", overflow: "hidden", padding: 0 }}>
              <div className="blog-thumb" style={{ background: p.grad }}>
                <i data-lucide={p.icon}></i>
                <span className="pill" style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,255,255,0.9)", color: "var(--teal-deep)", fontSize: 11, padding: "5px 11px" }}>{t(p.cat)}</span>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", flex: 1 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, lineHeight: 1.3, margin: "0 0 14px", color: "var(--ink)", flex: 1 }}>{t(p.t)}</h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 13 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i data-lucide="calendar" style={{ width: 14, height: 14 }}></i>{t(p.date)}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i data-lucide="clock" style={{ width: 14, height: 14 }}></i>{p.read.replace("daqiqa", t("daqiqa"))}</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="reveal" data-d="2" style={{ textAlign: "center", marginTop: 44 }}>
          <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--teal-deep)", fontWeight: 700, fontSize: 16, textDecoration: "none" }}>
            {t("Barcha maqolalar")} <i data-lucide="arrow-right" style={{ width: 18, height: 18 }}></i>
          </a>
        </div>
      </div>
    </section>
  );
}
window.Blog = Blog;
