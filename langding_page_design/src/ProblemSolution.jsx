// NMED landing — Problem → Solution
function PSList({ items, ok }) {
  return (
    <div className="col" style={{ gap: 14, marginTop: 24 }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: ok ? "rgba(42,167,155,0.14)" : "rgba(239,68,68,0.14)",
            color: ok ? "var(--green)" : "var(--error)",
          }}>
            <i data-lucide={ok ? "check" : "x"} style={{ width: 14, height: 14 }}></i>
          </span>
          <span style={{ color: "var(--text-primary)", fontSize: 16, lineHeight: 1.5 }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

function ProblemSolution() {
  return (
    <section className="section" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">Nima oʻzgaradi?</span>
          <h2 className="headline">Qogʻoz davridan — <span className="grad-text">raqamli davrga</span></h2>
        </div>

        <div className="ps-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 28, alignItems: "center" }}>
          {/* problem */}
          <div className="reveal" data-d="1" style={{
            background: "var(--error-tint)", border: "1px solid var(--error-border)", borderRadius: "var(--radius-2xl)", padding: 32,
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--error)", fontWeight: 600, fontSize: 14 }}>
              <i data-lucide="file-x" style={{ width: 18, height: 18 }}></i> Bugungi muammo
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
          <div className="reveal ps-arrow" data-d="2" style={{ textAlign: "center", color: "var(--green)" }}>
            <div className="ps-arrow-h" style={{ fontSize: 40, fontWeight: 700 }}>→</div>
            <div className="ps-arrow-v" style={{ fontSize: 34, fontWeight: 700 }}>↓</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.02em" }} className="grad-text">NMED</div>
          </div>

          {/* solution */}
          <div className="reveal" data-d="3" style={{
            background: "var(--green-tint)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-2xl)", padding: 32,
            boxShadow: "var(--glow-green-soft)",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--green)", fontWeight: 600, fontSize: 14 }}>
              <i data-lucide="monitor-check" style={{ width: 18, height: 18 }}></i> NMED bilan
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
