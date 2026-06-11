// NMED Light — navigation
const { Button: NBtn, NavLink: NLink } = window.UI;

const NAV_LINKS = [
  { label: "Platforma", href: "#top", active: true },
  { label: "Xizmatlar", href: "#xizmatlar" },
  { label: "Konsultatsiya", href: "#konsultatsiya" },
  { label: "Statistika", href: "#statistika" },
  { label: "Bogʻlanish", href: "#footer" },
];

function Logo() {
  return (
    <a href="#top" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--grad-teal)", color: "#fff", boxShadow: "var(--sh-md)" }}>
        <i data-lucide="activity" style={{ width: 22, height: 22 }}></i>
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 23, letterSpacing: "-0.02em", color: "var(--ink)" }}>NMED</span>
    </a>
  );
}

function LangToggle({ compact }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  const cur = window.NMEDi18n.lang;
  const set = (l) => { window.NMEDi18n.set(l); force(); };
  const opt = (l, lbl) => (
    <button key={l} onClick={() => set(l)} style={{
      border: 0, cursor: "pointer", padding: compact ? "7px 14px" : "5px 11px", borderRadius: 999,
      fontFamily: "var(--font-body)", fontWeight: 700, fontSize: compact ? 15 : 13,
      background: cur === l ? "var(--grad-teal)" : "transparent", color: cur === l ? "#fff" : "var(--ink-2)",
      transition: "all .25s var(--ease)" }}>{lbl}</button>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: 3, borderRadius: 999,
      background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--sh-sm)" }}>
      {opt("uz", "UZ")}{opt("ru", "RU")}
    </div>
  );
}

function Nav() {
  const t = window.useLang();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState("#top");
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // scroll-spy: highlight the section currently in view
  React.useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive("#" + e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  React.useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return (
    <React.Fragment>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "var(--nav-h)", zIndex: 130, display: "flex", alignItems: "center",
        background: scrolled ? "rgba(255,255,255,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none", WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        transition: "all .35s var(--ease)",
      }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 24 }}>
          <div style={{ justifySelf: "start" }}><Logo /></div>
          <div className="hide-md" style={{ display: "flex", gap: 32, justifySelf: "center" }}>
            {NAV_LINKS.map((l, i) => <NLink key={i} active={active === l.href} href={l.href}>{t(l.label)}</NLink>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifySelf: "end" }}>
            <div className="hide-md"><LangToggle /></div>
            <div className="hide-md" style={{ display: "flex", gap: 10 }}>
              <NBtn variant="outline" size="sm">{t("Kirish")}</NBtn>
              <NBtn variant="primary" size="sm" iconRight={<span style={{ fontSize: 16 }}>→</span>}>{t("Boshlash")}</NBtn>
            </div>
            <button className="burger" aria-label="menu" onClick={() => setOpen(true)}><i data-lucide="menu" style={{ width: 20, height: 20 }}></i></button>
          </div>
        </div>
      </nav>

      <div className={"drawer" + (open ? " open" : "")}>
        <button aria-label="close" onClick={() => setOpen(false)} style={{ position: "absolute", top: 22, right: 28, width: 44, height: 44,
          borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)",
          border: "1px solid var(--line)", color: "var(--ink)", cursor: "pointer", boxShadow: "var(--sh-sm)" }}><i data-lucide="x"></i></button>
        {NAV_LINKS.map((l, i) => (
          <a key={i} href={l.href} onClick={() => setOpen(false)}>
            {t(l.label)}<i data-lucide="arrow-up-right" style={{ width: 22, height: 22, color: "var(--teal)" }}></i>
          </a>
        ))}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}><LangToggle compact /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
          <NBtn variant="outline" size="md" style={{ width: "100%" }} onClick={() => setOpen(false)}>{t("Kirish")}</NBtn>
          <NBtn variant="primary" size="md" style={{ width: "100%" }} onClick={() => setOpen(false)}>{t("Boshlash")}</NBtn>
        </div>
      </div>
    </React.Fragment>
  );
}
window.Nav = Nav;
