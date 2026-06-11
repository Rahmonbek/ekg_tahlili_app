// NMED Light — app mount + scroll-reveal + scroll progress + back-to-top
function ScrollProgress() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      if (ref.current) ref.current.style.width = Math.max(0, Math.min(100, pct)) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="scroll-progress" ref={ref}></div>;
}

function BackToTop() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button className={"to-top" + (show ? " show" : "")} aria-label="yuqoriga" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
      <i data-lucide="arrow-up" style={{ width: 20, height: 20 }}></i>
    </button>
  );
}

function App() {
  React.useEffect(() => {
    // Scroll-driven reveal — robust across browsers & capture environments.
    // (IntersectionObserver proved flaky for tall/late-mounted nodes here.)
    let raf = 0;
    const reveal = () => {
      raf = 0;
      const vh = window.innerHeight;
      document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.88 && r.bottom > 0) el.classList.add("in");
      });
    };
    // Call directly (rAF can be paused in background/capture contexts).
    const onScroll = () => reveal();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reveal();
    // safety passes while late content (fonts/icons) settles layout
    const timers = [120, 400, 900, 1600].map((d) => setTimeout(reveal, d));
    const icons = setTimeout(() => window.lucide && window.lucide.createIcons(), 80);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      timers.forEach(clearTimeout); clearTimeout(icons);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const { Nav, Hero, ProblemSolution, BeforeAfter, Features, Consultation, HowItWorks, Stats, Security, Testimonials, Blog, Faq, CtaFooter, ThemeTweaks } = window;
  return (
    <React.Fragment>
      <ScrollProgress />
      <Nav />
      <Hero />
      <ProblemSolution />
      <BeforeAfter />
      <Features />
      <Consultation />
      <HowItWorks />
      <Stats />
      <Security />
      <Testimonials />
      <Blog />
      <Faq />
      <CtaFooter />
      <BackToTop />
      <ThemeTweaks />
    </React.Fragment>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
setInterval(() => window.lucide && window.lucide.createIcons(), 1000);
