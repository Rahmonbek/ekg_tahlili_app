// ============================================================================
// NMED Design System — core component primitives
// Ported from the design system's React components. Exposed on `window.NMED`
// so every section file can pull them with: const { Button, Badge } = window.NMED
// ============================================================================

/* ---- Button : primary action, gradient / glass / outline / white ---- */
function Button({ variant = "primary", size = "md", children, icon, iconRight, disabled = false, type = "button", onClick, style = {}, ...rest }) {
  const sizes = {
    sm: { padding: "8px 16px", fontSize: 14 },
    md: { padding: "14px 28px", fontSize: 16 },
    lg: { padding: "18px 36px", fontSize: 18 },
  };
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
    fontFamily: "var(--font-body)", fontWeight: "var(--fw-semibold)", borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer", border: "1px solid transparent",
    transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)",
    opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap", lineHeight: 1, ...sizes[size],
  };
  const variants = {
    primary: { background: "var(--grad-brand)", color: "var(--text-on-green)" },
    outline: { background: "transparent", color: "var(--green)", border: "1px solid var(--green)" },
    ghost: { background: "var(--bg-card)", color: "var(--green)", border: "1px solid var(--border-subtle)", backdropFilter: "blur(var(--blur-card))" },
    white: { background: "#FFFFFF", color: "var(--bg-primary)" },
  };
  const hover = {
    primary: (e, on) => { e.currentTarget.style.boxShadow = on ? "var(--glow-green-strong)" : "none"; e.currentTarget.style.transform = on ? "translateY(-2px) scale(1.02)" : "none"; },
    outline: (e, on) => { e.currentTarget.style.background = on ? "rgba(42,167,155,0.1)" : "transparent"; e.currentTarget.style.boxShadow = on ? "0 0 20px rgba(42,167,155,0.2)" : "none"; },
    ghost: (e, on) => { e.currentTarget.style.borderColor = on ? "var(--border-hover)" : "var(--border-subtle)"; e.currentTarget.style.boxShadow = on ? "var(--glow-green-soft)" : "none"; },
    white: (e, on) => { e.currentTarget.style.boxShadow = on ? "0 0 30px rgba(42,167,155,0.45)" : "none"; e.currentTarget.style.transform = on ? "translateY(-2px)" : "none"; },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => !disabled && hover[variant](e, true)} onMouseLeave={(e) => !disabled && hover[variant](e, false)} {...rest}>
      {icon}{children}{iconRight}
    </button>
  );
}

/* ---- Badge : pill chip ---- */
function Badge({ variant = "default", children, icon, style = {}, ...rest }) {
  const variants = {
    default: { background: "rgba(42,167,155,0.1)", border: "1px solid rgba(42,167,155,0.3)", color: "var(--green)" },
    solid: { background: "var(--green)", border: "1px solid var(--green)", color: "var(--text-on-green)" },
    new: { background: "var(--green)", border: "1px solid var(--green)", color: "var(--text-on-green)", letterSpacing: "0.06em" },
    blue: { background: "rgba(30,111,191,0.12)", border: "1px solid rgba(30,111,191,0.35)", color: "#5AA0E8" },
    warning: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", color: "var(--warning)" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-body)", fontSize: "var(--fs-label)", fontWeight: "var(--fw-medium)", lineHeight: 1, ...variants[variant], ...style }} {...rest}>
      {icon}{children}
    </span>
  );
}

/* ---- GlassCard : signature glassmorphism surface, hover lift + glow ---- */
function GlassCard({ highlight = false, interactive = true, radius = "xl", children, style = {}, ...rest }) {
  const radii = { lg: "var(--radius-lg)", xl: "var(--radius-xl)", "2xl": "var(--radius-2xl)" };
  const [hover, setHover] = React.useState(false);
  const base = {
    background: highlight ? "var(--bg-card-bright)" : "var(--bg-card)",
    backdropFilter: "blur(var(--blur-card))", WebkitBackdropFilter: "blur(var(--blur-card))",
    border: `1px solid ${highlight ? "var(--border-strong)" : "var(--border-subtle)"}`,
    borderRadius: radii[radius], padding: "32px", transition: "all var(--dur-base) var(--ease-out)",
    ...(interactive && hover ? { borderColor: "var(--border-hover)", boxShadow: "var(--glow-green-soft)", transform: "translateY(-4px)" } : {}),
  };
  return (
    <div style={{ ...base, ...style }} onMouseEnter={() => interactive && setHover(true)} onMouseLeave={() => interactive && setHover(false)} {...rest}>
      {children}
    </div>
  );
}

/* ---- Avatar : initials with brand-gradient fill ---- */
function Avatar({ name = "", size = 44, src, style = {}, ...rest }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: src ? "transparent" : "var(--grad-brand)",
      display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-on-green)",
      fontFamily: "var(--font-display)", fontWeight: "var(--fw-bold)", fontSize: size * 0.36, flexShrink: 0, overflow: "hidden", ...style }} {...rest}>
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

/* ---- StatusDot : online/offline presence, online pulses ---- */
function StatusDot({ online = true, label, style = {}, ...rest }) {
  const color = online ? "var(--green)" : "var(--text-secondary)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-body)", fontSize: "var(--fs-sm)", color: "var(--text-secondary)", ...style }} {...rest}>
      <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: online ? "0 0 8px var(--green)" : "none" }}>
        {online && <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, animation: "nmed-ping 1.8s var(--ease-out) infinite" }} />}
      </span>
      {label || (online ? "Online" : "Offline")}
    </span>
  );
}

/* ---- NavLink : muted → bright, green + underline when active ---- */
function NavLink({ active = false, children, href = "#", onClick, style = {}, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const color = active ? "var(--green)" : hover ? "var(--text-primary)" : "var(--text-secondary)";
  return (
    <a href={href} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: "relative", textDecoration: "none", color, fontFamily: "var(--font-body)", fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-medium)", padding: "6px 0", transition: "color var(--dur-base) var(--ease-out)", ...style }} {...rest}>
      {children}
      <span style={{ position: "absolute", left: 0, bottom: 0, height: 2, borderRadius: 2, background: "var(--green)",
        width: active || hover ? "100%" : "0%", opacity: active ? 1 : hover ? 0.6 : 0,
        transition: "width var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)" }} />
    </a>
  );
}

window.NMED = { Button, Badge, GlassCard, Avatar, StatusDot, NavLink };
