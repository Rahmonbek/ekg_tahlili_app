// NMED landing — Statistics (counters + bar chart)
function useCounter(target, run) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    if (!run) return;
    let raf, start;
    const dur = 1600;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, target]);
  return v;
}

const STATS = [
  { emoji: "🏥", target: 142, suffix: "+", fmt: (v) => Math.round(v).toLocaleString(), label: "Faol klinikalar", green: true },
  { emoji: "📊", target: 50000, suffix: "+", fmt: (v) => Math.round(v).toLocaleString(), label: "Amalga oshirilgan tahlillar", green: false },
  { emoji: "🗺️", target: 14, suffix: "", fmt: (v) => Math.round(v), label: "Viloyat boʻyicha xizmat", green: true },
  { emoji: "🎯", target: 99.2, suffix: "%", fmt: (v) => v.toFixed(1), label: "AI aniqlik darajasi", green: false },
];

function Stat({ s, run }) {
  const v = useCounter(s.target, run);
  return (
    <div className="reveal in glass stat-card" style={{ padding: 32, borderRadius: "var(--radius-xl)", textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--fs-stat)", lineHeight: 1, color: s.green ? "var(--green)" : "var(--text-primary)" }}>
        {s.fmt(v)}{s.suffix}
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 15, marginTop: 12 }}>{s.label}</div>
    </div>
  );
}

const MONTHS = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
const VALS = [42,55,61,58,73,80,77,88,92,99,108,120];

function BarChart({ run }) {
  const max = Math.max(...VALS);
  return (
    <div className="glass" style={{ padding: 32, borderRadius: "var(--radius-2xl)" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, margin: "0 0 24px" }}>Oylik tahlillar soni (2026)</h3>
      <div className="bar-wrap">
        <div className="bar-inner" style={{ display: "grid", gridTemplateColumns: `repeat(${MONTHS.length},1fr)`, gap: 10, alignItems: "end", height: 200 }}>
          {VALS.map((val, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
              <div title={val + " ming"} style={{
                width: "100%", borderRadius: "6px 6px 0 0", background: "var(--grad-brand)",
                height: run ? (val / max) * 100 + "%" : "0%",
                transition: `height .9s var(--ease-out) ${i * 60}ms`,
              }}></div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const ref = React.useRef(null);
  const [run, setRun] = React.useState(false);
  React.useEffect(() => {
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setRun(true)), { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="section" id="statistika" ref={ref} style={{ background: "var(--grad-section)" }}>
      <div className="container">
        <div className="head-center reveal">
          <h2 className="headline">Raqamlarda NMED</h2>
        </div>
        <div className="grid-2 stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 720, margin: "0 auto 32px" }}>
          {STATS.map((s, i) => <Stat key={i} s={s} run={run} />)}
        </div>
        <div className="reveal in"><BarChart run={run} /></div>
      </div>
    </section>
  );
}
window.Stats = Stats;
