// ============================================================================
// NMED "Clinical Daylight" — core UI primitives. Exposed on window.UI.
// Shadow-based (no neon glow). Components lean on theme.css utility classes.
// ============================================================================

function Button({ variant = "primary", size = "lg", children, icon, iconRight, onClick, style = {}, className = "", ...rest }) {
  const sizeCls = { sm: "btn-sm", md: "btn-md", lg: "btn-lg" }[size];
  const handle = (e) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const rip = document.createElement("span");
    rip.className = "ripple";
    rip.style.width = rip.style.height = d + "px";
    rip.style.left = (e.clientX - r.left - d / 2) + "px";
    rip.style.top = (e.clientY - r.top - d / 2) + "px";
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 600);
    if (onClick) onClick(e);
  };
  return (
    <button className={`btn btn-${variant} ${sizeCls} ${className}`} onClick={handle} style={style} {...rest}>
      {icon}{children}{iconRight}
    </button>
  );
}

function Pill({ variant = "default", children, icon, style = {}, className = "", ...rest }) {
  const cls = { default: "pill", ghost: "pill pill--ghost", solid: "pill pill--solid" }[variant];
  return <span className={`${cls} ${className}`} style={style} {...rest}>{icon}{children}</span>;
}

function Card({ lift = true, children, className = "", style = {}, ...rest }) {
  return <div className={`card ${lift ? "lift" : ""} ${className}`} style={style} {...rest}>{children}</div>;
}

function Avatar({ name = "", size = 44, style = {} }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--grad-teal)", display: "flex",
      alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 600,
      fontSize: size * 0.38, flexShrink: 0, ...style }}>{initials}</div>
  );
}

function StatusDot({ online = true, label }) {
  const color = online ? "var(--teal)" : "var(--ink-3)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
      <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: color }}>
        {online && <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, animation: "pulse-ring 1.8s var(--ease) infinite" }} />}
      </span>
      {label != null ? label : (online ? "Online" : "Offline")}
    </span>
  );
}

function NavLink({ active = false, children, href = "#", onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a href={href} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: "relative", textDecoration: "none", fontSize: 15, fontWeight: 500, padding: "6px 0",
        color: active ? "var(--teal-deep)" : hover ? "var(--ink)" : "var(--ink-2)", transition: "color .3s var(--ease)" }}>
      {children}
      <span style={{ position: "absolute", left: 0, bottom: 0, height: 2, borderRadius: 2, background: "var(--teal)",
        width: active || hover ? "100%" : "0%", opacity: active ? 1 : hover ? .6 : 0, transition: "all .3s var(--ease)" }} />
    </a>
  );
}

window.UI = { Button, Pill, Card, Avatar, StatusDot, NavLink };
