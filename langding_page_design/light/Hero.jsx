// NMED Light — Hero (live demo + cursor-follow glow)
const { Button: HBtn, Pill: HPill } = window.UI;

// Inline SVGs (React-owned) — used inside the auto-cycling LiveDemo so the
// lucide DOM-mutation never collides with React re-renders.
const Svg = {
  check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12" /></svg>,
  spin: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>,
  upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>,
  sparkles: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" /></svg>,
};

function FloatChip({ svg, title, sub, accent, show, style }) {
  return (
    <div className="card" style={{ padding: "12px 15px", borderRadius: 16, display: "flex", alignItems: "center", gap: 11,
      boxShadow: "var(--sh-lg)", animation: "float 6s var(--ease) infinite", opacity: show ? 1 : 0,
      transition: "opacity .5s var(--ease)", ...style }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: accent + "1f", color: accent }}>{svg}</span>
      <div style={{ whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{sub}</div>
      </div>
    </div>
  );
}

function LiveDemo() {
  const t = window.useLang();
  const [step, setStep] = React.useState(0); // 0 upload · 1 analyzing · 2 result
  React.useEffect(() => {
    const dur = [2100, 2300, 3400][step];
    const id = setTimeout(() => setStep((step + 1) % 3), dur);
    return () => clearTimeout(id);
  }, [step]);

  const badge = step === 2
    ? { t: t("Tahlil tayyor"), cls: "pill pill--solid" }
    : step === 1
    ? { t: t("Tahlil qilinmoqda"), cls: "pill" }
    : { t: t("Yuklanmoqda"), cls: "pill pill--ghost" };

  return (
    <div className="hero-mock" style={{ position: "relative" }}>
      <div style={{ position: "absolute", width: 380, height: 380, right: -30, top: "50%", transform: "translateY(-50%)",
        borderRadius: "50%", background: "radial-gradient(circle, rgba(22,184,166,0.16), transparent 65%)", zIndex: 0 }}></div>

      <div className="frame tilt" style={{ position: "relative", zIndex: 2 }}>
        <div className="frame-bar">
          <span className="dot" style={{ background: "#E2574C" }}></span>
          <span className="dot" style={{ background: "#E2952E" }}></span>
          <span className="dot" style={{ background: "#16B8A6" }}></span>
          <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>nmed.uz/dashboard</span>
        </div>
        <div style={{ padding: 20, minHeight: 250 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>EKG · Bemor #4471</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{t("Kardiologiya · 10:24")}</div>
            </div>
            <span className={badge.cls} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {step === 1 && <Svg.spin className="spin" style={{ width: 13, height: 13 }} />}
              {step === 2 && <Svg.check style={{ width: 13, height: 13 }} />}
              {badge.t}
            </span>
          </div>

          {/* step content (keyed → fade on change) */}
          <div className="demo-fade" key={step}>
            {step === 0 && (
              <div style={{ border: "2px dashed var(--line-strong)", borderRadius: 14, padding: "26px 18px", textAlign: "center", background: "var(--surface-2)" }}>
                <span style={{ color: "var(--teal)", display: "inline-flex" }}><Svg.upload style={{ width: 30, height: 30 }} /></span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-2)", margin: "10px 0 12px" }}>ekg_4471.dcm</div>
                <div style={{ height: 7, borderRadius: 6, background: "var(--surface-3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 6, background: "var(--grad-teal)", width: 0, animation: "fillbar 1.9s var(--ease) forwards" }}></div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--teal-deep)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  <Svg.spin className="spin" style={{ width: 18, height: 18 }} /> {t("AI parametrlarni tahlil qilmoqda…")}
                </div>
                <div className="sk" style={{ height: 70, marginBottom: 12 }}></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[0, 1, 2].map((i) => <div key={i} className="sk" style={{ height: 48 }}></div>)}
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="tile" style={{ padding: 12 }}>
                  <svg viewBox="0 0 360 70" style={{ width: "100%", height: 70, display: "block" }}>
                    <path d="M0,35 L78,35 L90,35 L98,14 L106,58 L116,6 L126,64 L136,35 L210,35 L300,35 L312,35 L320,18 L328,54 L338,10 L348,60 L360,35"
                      fill="none" stroke="var(--teal)" strokeWidth="2.4" />
                  </svg>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                  {[["Ritm", "Sinus"], ["QTc", "412 ms"], ["ST", "Normal"]].map((m, i) => (
                    <div key={i} className="tile" style={{ padding: "11px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m[0]}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--teal-deep)", fontWeight: 600, marginTop: 2, letterSpacing: "-0.03em" }}>{m[1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hide-sm" style={{ position: "absolute", left: -38, top: 150, zIndex: 3 }}>
        <FloatChip accent="#119488" show={step === 2} svg={<Svg.check style={{ width: 17, height: 17 }} />} title={t("EKG tahlil tayyor")} sub={t("30 soniyada")} />
      </div>
      <div className="hide-sm" style={{ position: "absolute", right: -34, top: 210, zIndex: 3 }}>
        <FloatChip accent="#2E72C8" show={step === 2} svg={<Svg.sparkles style={{ width: 17, height: 17 }} />} title={t("AI: Normal ritm")} sub={t("Ishonch 99.2%")} style={{ animationDelay: "1.4s" }} />
      </div>
      <style>{`@keyframes fillbar{to{width:100%}}.demo-fade{animation:demofade .5s var(--ease)}@keyframes demofade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function Hero() {
  const t = window.useLang();
  const glowRef = React.useRef(null);
  const onMove = (e) => {
    const g = glowRef.current; if (!g) return;
    const r = e.currentTarget.getBoundingClientRect();
    g.style.left = (e.clientX - r.left) + "px";
    g.style.top = (e.clientY - r.top) + "px";
    g.style.opacity = "1";
  };
  const onLeave = () => { if (glowRef.current) glowRef.current.style.opacity = "0"; };

  const trust = [["142+", "klinika"], ["50K+", "tahlil"], ["99.2%", "aniqlik"]];
  return (
    <header className="hero dots" id="top" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="hero-mesh"></div>
      <div className="cursor-glow hide-sm" ref={glowRef}></div>
      <div className="container hero-grid" style={{ position: "relative", zIndex: 1 }}>
        <div>
          <div className="reveal in"><HPill variant="ghost" icon={<span>🔬</span>}>{t("Oʻzbekistondagi birinchi AI tibbiy platforma")}</HPill></div>
          <h1 className="reveal in" data-d="1" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--fs-display)",
            lineHeight: 1.04, letterSpacing: "-0.015em", wordSpacing: "0.02em", margin: "22px 0 0", color: "var(--ink)" }}>
            <span style={{ display: "block" }}>{t("Tibbiyotni")}</span>
            <span className="grad-text" style={{ display: "block" }}>{t("aqlli qiling")}</span>
          </h1>
          <p className="sub reveal in" data-d="2" style={{ maxWidth: 500 }}>
            {t("EKG, SMAD, Holter va laboratoriya tahlillarini sunʼiy intellekt 30 soniyada tahlil qiladi — hamda masofaviy mutaxassis konsultatsiyasini bitta platformada birlashtiradi.")}
          </p>
          <div className="hero-cta reveal in" data-d="3" style={{ display: "flex", gap: 14, marginTop: 34, alignItems: "center", flexWrap: "wrap" }}>
            <HBtn variant="primary" size="lg" iconRight={<span style={{ fontSize: 18 }}>→</span>}>{t("Platformani koʻrish")}</HBtn>
            <HBtn variant="ghost" size="lg" icon={<i data-lucide="play" style={{ width: 18, height: 18 }}></i>}>{t("Video koʻrish")}</HBtn>
          </div>
          <div className="reveal in" data-d="4" style={{ display: "flex", gap: 0, marginTop: 44, flexWrap: "wrap" }}>
            {trust.map((tr, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <span style={{ width: 1, height: 34, background: "var(--line-strong)", margin: "0 22px" }}></span>}
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 24, color: "var(--teal-deep)", letterSpacing: "-0.03em" }}>{tr[0]}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{t(tr[1])}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="reveal in" data-d="2"><LiveDemo /></div>
      </div>
    </header>
  );
}
window.Hero = Hero;
