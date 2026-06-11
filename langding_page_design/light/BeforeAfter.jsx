// NMED Light — Before / After draggable comparison (Qogʻoz vs NMED)
function BeforeAfter() {
  const t = window.useLang();
  const wrapRef = React.useRef(null);
  const [x, setX] = React.useState(52);
  const dragging = React.useRef(false);

  const move = (clientX) => {
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setX(Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100)));
  };
  React.useEffect(() => {
    const mm = (e) => dragging.current && move(e.touches ? e.touches[0].clientX : e.clientX);
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mm); window.addEventListener("touchmove", mm);
    window.addEventListener("mouseup", up); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("touchmove", mm); window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); };
  }, []);

  return (
    <section className="section section--mint">
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Solishtiring")}</span>
          <h2 className="headline">{t("Qogʻoz davri ")}<span className="grad-text">{t("vs")}</span>{t(" NMED")}</h2>
          <p className="sub">{t("Tutqichni suring — farqni oʻzingiz koʻring.")}</p>
        </div>

        <div className="reveal ba" ref={wrapRef}
          onMouseDown={(e) => { dragging.current = true; move(e.clientX); }}
          onTouchStart={(e) => { dragging.current = true; move(e.touches[0].clientX); }}>

          {/* AFTER — NMED (under) */}
          <div className="ba-pane ba-after" style={{ background: "linear-gradient(135deg, var(--teal-wash), #fff)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <span className="ba-tag pill pill--solid" style={{ right: 16 }}>NMED</span>
            <div className="card" style={{ width: "min(420px, 78%)", padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>EKG · #4471</span>
                <span className="pill pill--solid" style={{ fontSize: 11, padding: "4px 10px" }}>{t("30 soniya")}</span>
              </div>
              <div className="tile" style={{ padding: 10 }}>
                <svg viewBox="0 0 320 56" style={{ width: "100%", height: 56, display: "block" }}>
                  <path d="M0,28 L70,28 L80,28 L88,10 L96,46 L106,4 L116,52 L126,28 L200,28 L300,28 L308,14 L314,42 L320,28" fill="none" stroke="var(--teal)" strokeWidth="2.2" />
                </svg>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {["Sinus", "412 ms", "Normal"].map((t, i) => (
                  <span key={i} className="pill" style={{ fontSize: 11, padding: "5px 10px" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* BEFORE — paper (top, clipped) */}
          <div className="ba-pane ba-before" style={{ background: "#E9ECEC", alignItems: "center", justifyContent: "center", padding: 24,
            clipPath: `inset(0 ${100 - x}% 0 0)` }}>
            <span className="ba-tag" style={{ left: 16, background: "#fff", color: "#7C8A88", boxShadow: "var(--sh-sm)" }}>{t("Qogʻoz")}</span>
            <div style={{ position: "relative", width: "min(360px, 70%)", height: 150, filter: "grayscale(0.4)" }}>
              {[[-8, 8, 0], [4, -4, 14], [0, 2, -8]].map((p, i) => (
                <div key={i} style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: 6, boxShadow: "0 8px 20px rgba(40,50,50,0.12)",
                  transform: `translate(${p[0]}px, ${p[1]}px) rotate(${p[2]}deg)`, padding: 16 }}>
                  {[80, 60, 92, 50].map((w, j) => <div key={j} style={{ height: 7, width: w + "%", background: "#D6DBDB", borderRadius: 4, margin: "0 0 9px" }}></div>)}
                </div>
              ))}
              <span style={{ position: "absolute", right: -6, bottom: -6, width: 40, height: 40, borderRadius: "50%", background: "var(--coral-wash)", color: "var(--coral)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--sh-sm)" }}>
                <i data-lucide="clock" style={{ width: 20, height: 20 }}></i>
              </span>
            </div>
          </div>

          {/* handle */}
          <div className="ba-handle" style={{ left: `${x}%` }}>
            <span className="ba-knob"><i data-lucide="chevrons-left-right" style={{ width: 22, height: 22 }}></i></span>
          </div>
        </div>
      </div>
    </section>
  );
}
window.BeforeAfter = BeforeAfter;
