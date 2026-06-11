// NMED landing — fixed top navigation + mobile drawer
const { Button: NButton, NavLink: NNavLink } = window.NMED;

const NAV_LINKS = [
  { label: "Platforma haqida", href: "#top", active: true },
  { label: "Xizmatlar", href: "#xizmatlar" },
  { label: "Online Konsultatsiya", href: "#konsultatsiya" },
  { label: "Statistika", href: "#statistika" },
  { label: "Bogʻlanish", href: "#footer" },
];

function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll while drawer open
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <React.Fragment>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "var(--nav-height)", zIndex: 130,
        display: "flex", alignItems: "center",
        background: scrolled ? "rgba(3,15,26,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
        transition: "all .3s var(--ease-out)",
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* brand */}
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span className="icon-chip" style={{ width: 38, height: 38, borderRadius: 10 }}><i data-lucide="activity"></i></span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }} className="grad-text">NMED</span>
          </a>

          {/* center links — desktop only */}
          <div className="hide-md" style={{ display: "flex", gap: 30 }}>
            {NAV_LINKS.map((l, i) => <NNavLink key={i} active={l.active} href={l.href}>{l.label}</NNavLink>)}
          </div>

          {/* right */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button aria-label="theme" className="hide-sm" style={{
              width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "pointer",
            }}><i data-lucide="moon" style={{ width: 18, height: 18 }}></i></button>
            <div className="hide-md" style={{ display: "flex", gap: 12 }}>
              <NButton variant="outline" size="sm">Kirish</NButton>
              <NButton variant="primary" size="sm">Boshlash</NButton>
            </div>
            <button className="burger" aria-label="menu" onClick={() => setOpen(true)}>
              <i data-lucide="menu" style={{ width: 20, height: 20 }}></i>
            </button>
          </div>
        </div>
      </nav>

      {/* mobile drawer */}
      <div className={"mobile-drawer" + (open ? " open" : "")}>
        <button aria-label="close" onClick={() => setOpen(false)} style={{
          position: "absolute", top: 20, right: 24, width: 42, height: 42, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", cursor: "pointer",
        }}><i data-lucide="x"></i></button>
        {NAV_LINKS.map((l, i) => (
          <a key={i} href={l.href} onClick={() => setOpen(false)}>
            {l.label}<i data-lucide="arrow-up-right" style={{ width: 20, height: 20, color: "var(--green)" }}></i>
          </a>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
          <NButton variant="outline" size="md" style={{ width: "100%" }} onClick={() => setOpen(false)}>Kirish</NButton>
          <NButton variant="primary" size="md" style={{ width: "100%" }} onClick={() => setOpen(false)}>Boshlash</NButton>
        </div>
      </div>
    </React.Fragment>
  );
}
window.Nav = Nav;
