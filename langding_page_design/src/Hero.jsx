// NMED landing — Hero
const { Button: HButton, Badge: HBadge } = window.NMED;

function FloatCard({ icon, text, accent, className, style }) {
  return (
    <div className={"glass " + (className || "")} style={{
      padding: "12px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 10,
      fontSize: 14, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap",
      boxShadow: "0 12px 40px rgba(0,0,0,0.35)", animation: "float 6s var(--ease-in-out) infinite",
      ...style,
    }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        background: accent + "22", color: accent }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function HeroMock() {
  return (
    <div className="hero-mock-col hide-sm" style={{ position: "relative", height: 420 }}>
      <div className="mock-ring"></div>
      <div className="browser tilt" style={{ position: "relative", zIndex: 2 }}>
        <div className="browser-bar">
          <span className="dot" style={{ background: "#EF4444" }}></span>
          <span className="dot" style={{ background: "#F59E0B" }}></span>
          <span className="dot" style={{ background: "#2AA79B" }}></span>
          <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>nmed.uz/dashboard</span>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>EKG · Bemor #4471</span>
            <HBadge variant="solid">Tahlil tayyor</HBadge>
          </div>
          <svg viewBox="0 0 360 110" style={{ width: "100%", height: 110, background: "rgba(42,167,155,0.05)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <path d="M0,55 L80,55 L92,55 L100,25 L108,85 L118,15 L128,95 L138,55 L210,55 L300,55 L312,55 L320,30 L328,80 L338,20 L348,90 L360,55"
              fill="none" stroke="var(--green)" strokeWidth="2" style={{ filter: "drop-shadow(0 0 4px var(--green))" }} />
          </svg>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
            {[["Ritm","Sinus"],["QTc","412ms"],["ST","Normal"]].map((m,i)=>(
              <div key={i} className="glass" style={{ padding: "8px 10px", borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{m[0]}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--green)", fontWeight: 600 }}>{m[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* floating mini-cards */}
      <div className="hide-sm" style={{ position: "absolute", left: -30, top: 24, zIndex: 3 }}>
        <FloatCard accent="#2AA79B" icon={<i data-lucide="check" style={{width:16,height:16}}></i>} text="EKG tahlil tayyor" />
      </div>
      <div className="hide-sm" style={{ position: "absolute", right: -20, bottom: 30, zIndex: 3, animationDelay: "1.4s" }}>
        <FloatCard accent="#1E6FBF" icon={<span style={{fontSize:13}}>🤖</span>} text="AI: Normal ritm" style={{ animationDelay: "1.4s" }} />
      </div>
      <div className="hide-md" style={{ position: "absolute", right: -50, top: "44%", zIndex: 3 }}>
        <FloatCard accent="#F59E0B" icon={<span style={{fontSize:13}}>🏥</span>} text="142 ta klinika" style={{ animationDelay: ".7s" }} />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header className="hero grid-bg" id="top">
      <div className="hero-glow"></div>
      {/* EKG waveform */}
      <svg viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, top: "60%", width: "100%", height: 160, opacity: .5, zIndex: 0 }}>
        <path className="ekg-path" d="M0,100 L260,100 L290,100 L310,60 L330,140 L355,40 L380,160 L405,100 L520,100 L700,100 L730,100 L752,55 L772,150 L796,30 L822,168 L848,100 L1000,100 L1200,100 L1230,100 L1252,60 L1272,140 L1297,40 L1322,160 L1347,100 L1440,100"
          fill="none" stroke="var(--green)" strokeWidth="2.5"
          strokeDasharray="2600" strokeDashoffset="2600" style={{ animation: "ekgdraw 4s var(--ease-out) forwards .4s" }} />
      </svg>
      {/* particles */}
      {[[12,30],[24,72],[78,22],[88,64],[55,12],[40,85],[68,48]].map((p,i)=>(
        <span key={i} className="particle hide-sm" style={{ left: p[0]+"%", top: p[1]+"%", animation:`float ${5+i}s var(--ease-in-out) ${i*0.4}s infinite` }} />
      ))}

      <div className="container hero-grid">
        {/* left */}
        <div>
          <div className="reveal in" style={{ display: "inline-flex" }}>
            <HBadge icon={<span>🔬</span>}>Oʻzbekistondagi birinchi AI tibbiy diagnostika platformasi</HBadge>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-display-lg)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "22px 0 0" }}>
            <span style={{ display: "block" }}>Tibbiyotni</span>
            <span className="grad-text shimmer" style={{ display: "block" }}>Aqlli qiling</span>
          </h1>
          <p className="sub" style={{ maxWidth: 520 }}>
            NMED — EKG, SMAD, Holter va laboratoriya tahlillarini sunʼiy intellekt yordamida tahlil qiluvchi va masofaviy konsultatsiya imkoniyatini taqdim etuvchi platforma.
          </p>
          <div className="hero-cta-row" style={{ display: "flex", gap: 16, marginTop: 32, flexWrap: "wrap", alignItems: "center" }}>
            <HButton variant="primary" size="lg" iconRight={<span style={{fontSize:18}}>→</span>}>Platformani koʻrish</HButton>
            <HButton variant="ghost" size="lg" icon={<i data-lucide="play" style={{width:18,height:18}}></i>}>Video koʻrish</HButton>
          </div>
          <div className="hide-sm" style={{ marginTop: 46, color: "var(--green)" }}>
            <i data-lucide="chevron-down" style={{ animation: "float 1.8s ease-in-out infinite" }}></i>
          </div>
        </div>

        {/* right — mockup */}
        <HeroMock />
      </div>
      <style>{`.shimmer{background-size:200% auto;animation:shim 4s linear infinite}@keyframes shim{to{background-position:200% center}}@keyframes ekgdraw{to{stroke-dashoffset:0}}`}</style>
    </header>
  );
}
window.Hero = Hero;
