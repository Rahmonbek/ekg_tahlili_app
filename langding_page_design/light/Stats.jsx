// NMED Light — Statistics (counters + bar chart)
function useCounter(target, run) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    if (!run) return;
    const dur = 1600, t0 = performance.now();
    const id = setInterval(() => {
      const p = Math.min((performance.now() - t0) / dur, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [run, target]);
  return v;
}

const STATS = [
  { icon: "building-2", target: 142, suffix: "+", fmt: (v) => Math.round(v).toLocaleString(), label: "Faol klinikalar" },
  { icon: "bar-chart-3", target: 50000, suffix: "+", fmt: (v) => Math.round(v).toLocaleString(), label: "Amalga oshirilgan tahlillar" },
  { icon: "map", target: 14, suffix: "", fmt: (v) => Math.round(v), label: "Viloyat boʻyicha xizmat" },
  { icon: "target", target: 99.2, suffix: "%", fmt: (v) => v.toFixed(1), label: "AI aniqlik darajasi" },
];

function Stat({ s, run }) {
  const v = useCounter(s.target, run);
  return (
    <div className="reveal in card stat-card" style={{ padding: 30, textAlign: "left" }}>
      <span className="icon-chip" style={{ width: 46, height: 46 }}><i data-lucide={s.icon} style={{ width: 21, height: 21 }}></i></span>
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--fs-stat)", lineHeight: 1, color: "var(--ink)", marginTop: 18, letterSpacing: "-0.03em" }}>
        <span className="grad-text">{s.fmt(v)}{s.suffix}</span>
      </div>
      <div style={{ color: "var(--ink-2)", fontSize: 15, marginTop: 10, fontWeight: 500 }}>{window.NMEDi18n.t(s.label)}</div>
    </div>
  );
}

const MONTHS = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
const VALS = [42,55,61,58,73,80,77,88,92,99,108,120];

// Stylized coverage cartogram — 14 regions positioned ~geographically (x,y,w,h in %)
const REGIONS = [
  { n: "Qoraqalpogʻiston", c: 6, x: 3, y: 6, w: 24, h: 42 },
  { n: "Xorazm", c: 4, x: 3, y: 50, w: 17, h: 20 },
  { n: "Navoiy", c: 6, x: 29, y: 8, w: 21, h: 38 },
  { n: "Buxoro", c: 8, x: 23, y: 52, w: 22, h: 30 },
  { n: "Sirdaryo", c: 3, x: 52, y: 6, w: 10, h: 13 },
  { n: "Jizzax", c: 3, x: 52, y: 21, w: 13, h: 18 },
  { n: "Toshkent", c: 20, x: 64, y: 4, w: 16, h: 15 },
  { n: "Toshkent sh.", c: 38, x: 66, y: 21, w: 11, h: 10 },
  { n: "Samarqand", c: 14, x: 49, y: 43, w: 16, h: 18 },
  { n: "Qashqadaryo", c: 7, x: 47, y: 63, w: 19, h: 22 },
  { n: "Surxondaryo", c: 3, x: 52, y: 87, w: 16, h: 11 },
  { n: "Namangan", c: 9, x: 82, y: 8, w: 16, h: 11 },
  { n: "Andijon", c: 10, x: 86, y: 21, w: 12, h: 11 },
  { n: "Fargʻona", c: 11, x: 80, y: 34, w: 14, h: 13 },
];

function CoverageMap() {
  const t = window.NMEDi18n.t;
  const [tip, setTip] = React.useState(null);
  const wrap = React.useRef(null);
  const max = Math.max(...REGIONS.map((r) => r.c));
  const updTip = (r, e) => {
    const box = wrap.current.getBoundingClientRect();
    setTip({ n: r.n, c: r.c, x: e.clientX - box.left, y: e.clientY - box.top });
  };
  return (
    <div className="card" style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, margin: 0, color: "var(--ink)" }}>{t("Hududlar boʻyicha qamrov")}</h3>
        <span className="pill"><i data-lucide="map-pin" style={{ width: 14, height: 14 }}></i> {t("14 viloyat")}</span>
      </div>
      <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "0 0 20px" }}>{t("Rang qoraygan sari — klinikalar zichligi yuqori. Hudud ustiga olib boring.")}</p>
      <div ref={wrap} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", minHeight: 220 }} onMouseLeave={() => setTip(null)}>
        {REGIONS.map((r, i) => {
          const a = 0.14 + 0.82 * (r.c / max);
          const dark = a > 0.5;
          return (
            <div key={i} className="map-region" onMouseMove={(e) => updTip(r, e)}
              style={{ position: "absolute", left: r.x + "%", top: r.y + "%", width: r.w + "%", height: r.h + "%",
                background: `rgba(17,148,136,${a})`, border: "1px solid rgba(255,255,255,0.6)", borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 4, textAlign: "center", overflow: "hidden" }}>
              <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.15, color: dark ? "#fff" : "var(--teal-deep)" }}>{t(r.n)}</span>
            </div>
          );
        })}
        {tip && <div className="map-tip show" style={{ left: tip.x, top: tip.y }}>{t(tip.n)} · <span>{tip.c}</span> {t("klinika ")}</div>}
      </div>
    </div>
  );
}

function BarChart({ run }) {
  const t = window.NMEDi18n.t;
  const max = Math.max(...VALS);
  return (
    <div className="card" style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, margin: 0, color: "var(--ink)" }}>{t("Oylik tahlillar soni (2026)")}</h3>
        <span className="pill"><i data-lucide="trending-up" style={{ width: 14, height: 14 }}></i> {t("+186% oʻsish")}</span>
      </div>
      <div className="bar-wrap">
        <div className="bar-inner" style={{ display: "grid", gridTemplateColumns: `repeat(${MONTHS.length},1fr)`, gap: 10, alignItems: "end", height: 200 }}>
          {VALS.map((val, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
              <div title={val + " ming"} style={{ width: "100%", borderRadius: "7px 7px 0 0", background: "var(--grad-teal)",
                height: run ? (val / max) * 100 + "%" : "0%", transition: `height .9s var(--ease) ${i * 55}ms` }}></div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const t = window.useLang();
  const ref = React.useRef(null);
  const [run, setRun] = React.useState(false);
  React.useEffect(() => {
    if (run) return;
    const check = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      // fire as soon as the section's top crosses 75% of the viewport
      if (r.top < window.innerHeight * 0.75 && r.bottom > 0) { setRun(true); return true; }
      return false;
    };
    if (check()) return;
    const onScroll = () => check() && window.removeEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [run]);

  return (
    <section className="section section--mint" id="statistika" ref={ref}>
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Statistika")}</span>
          <h2 className="headline">{t("Raqamlarda NMED")}</h2>
          <svg viewBox="0 0 600 40" preserveAspectRatio="none" style={{ width: "min(420px,80%)", height: 34, margin: "18px auto 0", display: "block", opacity: .9 }}>
            <path className={"ekg-draw" + (run ? " in" : "")} d="M0,20 L150,20 L165,20 L175,6 L185,34 L196,2 L207,36 L218,20 L300,20 L450,20 L462,20 L472,8 L482,32 L492,4 L502,34 L512,20 L600,20"
              fill="none" stroke="var(--teal)" strokeWidth="2.2" strokeLinecap="round" style={{ filter: "drop-shadow(0 2px 5px rgba(17,148,136,0.3))" }} />
          </svg>
        </div>
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 24 }}>
          {STATS.map((s, i) => <Stat key={i} s={s} run={run} />)}
        </div>
        <div className="grid-2 reveal in" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
          <BarChart run={run} />
          <CoverageMap />
        </div>
      </div>
    </section>
  );
}
window.Stats = Stats;
