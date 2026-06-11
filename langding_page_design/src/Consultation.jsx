// NMED landing — Online Konsultatsiya deep dive (flow + video-call mockup)
const { GlassCard: CGlassCard, StatusDot: CStatusDot, Avatar: CAvatar } = window.NMED;

const STEPS = [
  { icon: "send", title: "Diagnostika yuboriladi", body: "Admin bemor tahlillarini (EKG, Lab, SMAD) tanlagan mutaxassis shifokorga platforma orqali yuboradi." },
  { icon: "monitor", title: "Mutaxassis koʻradi", body: "Boshqa klinikadagi shifokor platformaning oʻz kabinetidan bemorning barcha tahlillarini batafsil koʻradi." },
  { icon: "video", title: "Video muloqot", body: "Shifokor va admin (yonida bemor bilan) platforma ichida video qoʻngʻiroq orqali bevosita gaplashadi." },
];

function VideoMock() {
  return (
    <div className="browser" style={{ position: "relative" }}>
      <div className="browser-bar">
        <span className="dot" style={{ background: "#EF4444" }}></span>
        <span className="dot" style={{ background: "#F59E0B" }}></span>
        <span className="dot" style={{ background: "#2AA79B" }}></span>
        <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>nmed.uz/konsultatsiya</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--error)", padding: "3px 9px", borderRadius: 999 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "nmed-ping 1.8s var(--ease-out) infinite" }}></span>LIVE
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr" }}>
        {/* video panels */}
        <div style={{ padding: 14, display: "grid", gridTemplateRows: "1fr 1fr", gap: 12 }}>
          {[{ n: "Dr. Karimov", r: "Kardiolog · Toshkent", on: true }, { n: "Admin + Bemor", r: "Anor Klinikasi", on: true }].map((p, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 12, height: 132, overflow: "hidden",
              background: i === 0 ? "linear-gradient(135deg,#0c2433,#071828)" : "linear-gradient(135deg,#10202e,#071828)",
              border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CAvatar name={p.n} size={56} />
              <div style={{ position: "absolute", left: 10, bottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{p.n}</span>
                <CStatusDot online={p.on} label="" />
              </div>
              <span style={{ position: "absolute", right: 10, top: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>{p.r}</span>
            </div>
          ))}
        </div>
        {/* diagnostics sidebar */}
        <div style={{ padding: 14, borderLeft: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>Bemor diagnostikasi</div>
          <svg viewBox="0 0 200 50" style={{ width: "100%", height: 50, background: "rgba(42,167,155,0.05)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <path d="M0,25 L60,25 L66,25 L72,10 L78,40 L86,6 L94,44 L100,25 L200,25" fill="none" stroke="var(--green)" strokeWidth="1.6" />
          </svg>
          <div className="col" style={{ gap: 8, marginTop: 10 }}>
            {[["Ritm", "Sinus"], ["QTc", "412 ms"], ["BP", "128/82"]].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>{m[0]}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--green)" }}>{m[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* control bar */}
      <div style={{ display: "flex", justifyContent: "center", gap: 14, padding: "14px 0", borderTop: "1px solid var(--border-subtle)" }}>
        {["mic", "video", "screen-share"].map((ic, i) => (
          <span key={i} className="icon-chip" style={{ width: 42, height: 42, borderRadius: 10 }}><i data-lucide={ic} style={{ width: 18, height: 18 }}></i></span>
        ))}
        <span className="icon-chip" style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(239,68,68,0.15)", borderColor: "var(--error-border)", color: "var(--error)" }}>
          <i data-lucide="phone-off" style={{ width: 18, height: 18 }}></i>
        </span>
      </div>
    </div>
  );
}

function Consultation() {
  const feats = [
    "Platforma ichida toʻliq integratsiya", "Yonida bemor bilan gaplashish",
    "Diagnostika parallel koʻrish", "Har qoʻngʻiroq yozib olinadi",
    "Xulosa yozish imkoniyati", "Masofaviy mutaxassis bilan ishlash",
  ];
  return (
    <section className="section" id="konsultatsiya" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">Online Konsultatsiya</span>
          <h2 className="headline">Masofadan — <span className="grad-text">malaka bilan</span></h2>
          <p className="sub">Boshqa shahardagi mutaxassis shifokor sizning bemoringizga platforma orqali yordam beradi.</p>
        </div>

        {/* 3-step flow */}
        <div className="grid-3 steps-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 72 }}>
          {STEPS.map((s, i) => (
            <div key={i} className="reveal" data-d={i + 1} style={{ position: "relative" }}>
              <CGlassCard radius="xl" style={{ height: "100%" }}>
                <span className="icon-chip"><i data-lucide={s.icon}></i></span>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontSize: 13, marginTop: 16 }}>0{i + 1}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, margin: "6px 0 8px" }}>{s.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </CGlassCard>
              {i < 2 && <div className="step-arrow hide-md" style={{ position: "absolute", right: -16, top: "42%", color: "var(--green)", fontSize: 22, zIndex: 2 }}>→</div>}
            </div>
          ))}
        </div>

        {/* 5b showcase */}
        <div className="consult-showcase" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 44, alignItems: "center" }}>
          <div className="reveal">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-h3)", margin: "0 0 20px" }}>Video qoʻngʻiroq — platforma ichida</h3>
            <div className="col" style={{ gap: 14 }}>
              {feats.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(42,167,155,0.14)", color: "var(--green)" }}>
                    <i data-lucide="check" style={{ width: 13, height: 13 }}></i>
                  </span>
                  <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{f}</span>
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
