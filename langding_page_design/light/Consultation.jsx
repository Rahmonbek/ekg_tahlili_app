// NMED Light — Online Konsultatsiya (flow + video-call mockup)
const { Card: CCard, Avatar: CAvatar, StatusDot: CDot } = window.UI;

const STEPS = [
  { icon: "send", title: "Diagnostika yuboriladi", body: "Admin bemor tahlillarini (EKG, Lab, SMAD) tanlagan mutaxassis shifokorga platforma orqali yuboradi." },
  { icon: "monitor", title: "Mutaxassis koʻradi", body: "Boshqa klinikadagi shifokor oʻz kabinetidan bemorning barcha tahlillarini batafsil koʻradi." },
  { icon: "video", title: "Video muloqot", body: "Shifokor va admin (yonida bemor bilan) platforma ichida video qoʻngʻiroq orqali bevosita gaplashadi." },
];

function VideoMock() {
  const t = window.NMEDi18n.t;
  return (
    <div className="frame" style={{ position: "relative" }}>
      <div className="frame-bar">
        <span className="dot" style={{ background: "#E2574C" }}></span>
        <span className="dot" style={{ background: "#E2952E" }}></span>
        <span className="dot" style={{ background: "#16B8A6" }}></span>
        <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>nmed.uz/konsultatsiya</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--coral)", padding: "3px 9px", borderRadius: 999 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse-ring 1.8s var(--ease) infinite" }}></span>LIVE
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr" }}>
        <div style={{ padding: 14, display: "grid", gridTemplateRows: "1fr 1fr", gap: 12 }}>
          {[{ n: "Dr. Karimov", r: t("Kardiolog · Toshkent") }, { n: t("Admin + Bemor"), r: t("Anor Klinikasi") }].map((p, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 12, height: 128, overflow: "hidden",
              background: i === 0 ? "linear-gradient(135deg,#0E3A40,#0B6B62)" : "linear-gradient(135deg,#14323D,#1F5A8C)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CAvatar name={p.n} size={54} style={{ border: "2px solid rgba(255,255,255,0.5)" }} />
              <div style={{ position: "absolute", left: 10, bottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{p.n}</span>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3DE0C8", boxShadow: "0 0 6px #3DE0C8" }}></span>
              </div>
              <span style={{ position: "absolute", right: 10, top: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{p.r}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 14, borderLeft: "1px solid var(--line)", background: "#FBFEFD" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8, fontWeight: 600 }}>{t("Bemor diagnostikasi")}</div>
          <div className="tile" style={{ padding: 8 }}>
            <svg viewBox="0 0 200 44" style={{ width: "100%", height: 44, display: "block" }}>
              <path d="M0,22 L60,22 L66,22 L72,8 L78,36 L86,4 L94,40 L100,22 L200,22" fill="none" stroke="var(--teal)" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="col" style={{ gap: 9, marginTop: 12 }}>
            {[["Ritm", "Sinus"], ["QTc", "412 ms"], ["BP", "128/82"]].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--ink-3)" }}>{m[0]}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--teal-deep)", fontWeight: 600 }}>{m[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "14px 0", borderTop: "1px solid var(--line)" }}>
        {["mic", "video", "screen-share"].map((ic, i) => (
          <span key={i} className="icon-chip" style={{ width: 42, height: 42, borderRadius: 12 }}><i data-lucide={ic} style={{ width: 18, height: 18 }}></i></span>
        ))}
        <span className="icon-chip" style={{ width: 42, height: 42, borderRadius: 12, background: "var(--coral-wash)", color: "var(--coral)" }}>
          <i data-lucide="phone-off" style={{ width: 18, height: 18 }}></i>
        </span>
      </div>
    </div>
  );
}

function Consultation() {
  const t = window.useLang();
  const feats = [
    "Platforma ichida toʻliq integratsiya", "Yonida bemor bilan gaplashish",
    "Diagnostika parallel koʻrish", "Har qoʻngʻiroq yozib olinadi",
    "Xulosa yozish imkoniyati", "Masofaviy mutaxassis bilan ishlash",
  ];
  return (
    <section className="section section--mint" id="konsultatsiya">
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Online Konsultatsiya")}</span>
          <h2 className="headline">{t("Masofadan — ")}<span className="grad-text">{t("malaka bilan")}</span></h2>
          <p className="sub">{t("Boshqa shahardagi mutaxassis shifokor bemoringizga platforma orqali yordam beradi.")}</p>
        </div>

        <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 72 }}>
          {STEPS.map((s, i) => (
            <div key={i} className="reveal" data-d={i + 1} style={{ position: "relative" }}>
              <CCard style={{ height: "100%", padding: 28 }}>
                <span className="icon-chip"><i data-lucide={s.icon}></i></span>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--teal)", fontSize: 13, marginTop: 16, fontWeight: 600 }}>0{i + 1}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, margin: "6px 0 8px", color: "var(--ink)" }}>{t(s.title)}</h3>
                <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{t(s.body)}</p>
              </CCard>
              {i < 2 && <div className="step-arrow hide-md" style={{ position: "absolute", right: -15, top: "44%", color: "var(--teal)", zIndex: 2 }}>
                <i data-lucide="arrow-right" style={{ width: 22, height: 22 }}></i>
              </div>}
            </div>
          ))}
        </div>

        <div className="consult-showcase" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 48, alignItems: "center" }}>
          <div className="reveal">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--fs-h3)", margin: "0 0 22px", color: "var(--ink)" }}>{t("Video qoʻngʻiroq — platforma ichida")}</h3>
            <div className="col" style={{ gap: 15 }}>
              {feats.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--teal-wash)", color: "var(--teal-deep)" }}>
                    <i data-lucide="check" style={{ width: 14, height: 14 }}></i>
                  </span>
                  <span style={{ fontSize: 15, color: "var(--ink)", fontWeight: 500 }}>{t(f)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal" data-d="2"><VideoMock /></div>
        </div>
      </div>
    </section>
  );
}
window.Consultation = Consultation;
