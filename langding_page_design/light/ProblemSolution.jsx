// NMED Light — Problem → Solution
function PSList({ items, ok }) {
  const t = window.NMEDi18n.t;
  return (
    <div className="col" style={{ gap: 15, marginTop: 22 }}>
      {items.map((tx, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ flexShrink: 0, width: 25, height: 25, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: ok ? "var(--teal-wash)" : "var(--coral-wash)", color: ok ? "var(--teal-deep)" : "var(--coral)" }}>
            <i data-lucide={ok ? "check" : "x"} style={{ width: 14, height: 14 }}></i>
          </span>
          <span style={{ color: "var(--ink)", fontSize: 16, lineHeight: 1.5, fontWeight: 500 }}>{t(tx)}</span>
        </div>
      ))}
    </div>
  );
}

function ProblemSolution() {
  const t = window.useLang();
  return (
    <section className="section">
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Nima oʻzgaradi")}</span>
          <h2 className="headline">{t("Qogʻoz davridan — ")}<span className="grad-text">{t("raqamli davrga")}</span></h2>
        </div>
        <div className="ps-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 30, alignItems: "stretch" }}>
          {/* problem */}
          <div className="reveal card" data-d="1" style={{ padding: 34, background: "linear-gradient(180deg,#FDF3F2,#FFFFFF)", borderColor: "#F3D7D4" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--coral)", fontWeight: 700, fontSize: 14 }}>
              <i data-lucide="file-x" style={{ width: 18, height: 18 }}></i> {t("Bugungi muammo")}
            </span>
            <PSList ok={false} items={[
              "Qogʻoz tahlillar yoʻqoladi",
              "Qayta ishlash 30+ daqiqa",
              "Xato tashxis xavfi",
              "Shifokor vaqtini boy beradi",
              "Masofaviy koʻrik imkonsiz",
            ]} />
          </div>
          {/* arrow */}
          <div className="reveal ps-arrow" data-d="2" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--grad-teal)", color: "#fff", boxShadow: "var(--sh-md)" }}>
              <i className="ps-arrow-h" data-lucide="arrow-right" style={{ width: 24, height: 24 }}></i>
              <i className="ps-arrow-v" data-lucide="arrow-down" style={{ width: 24, height: 24 }}></i>
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--teal-deep)" }}>NMED</span>
          </div>
          {/* solution */}
          <div className="reveal card lift" data-d="3" style={{ padding: 34, background: "linear-gradient(180deg,#E9F7F4,#FFFFFF)", borderColor: "var(--line-strong)", boxShadow: "var(--sh-md)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--teal-deep)", fontWeight: 700, fontSize: 14 }}>
              <i data-lucide="monitor-check" style={{ width: 18, height: 18 }}></i> {t("NMED bilan")}
            </span>
            <PSList ok items={[
              "Tahlil 30 soniyada tayyor",
              "AI xatolikni 95% kamaytiradi",
              "Hamma joydan kirish mumkin",
              "Avto-arxivlash va hisobot",
              "Masofaviy konsultatsiya",
            ]} />
          </div>
        </div>
      </div>
    </section>
  );
}
window.ProblemSolution = ProblemSolution;
