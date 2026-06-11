// NMED landing — app mount + scroll-reveal + scroll progress + back-to-top
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
    <button className={"to-top" + (show ? " show" : "")} aria-label="yuqoriga"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
      <i data-lucide="arrow-up" style={{ width: 20, height: 20 }}></i>
    </button>
  );
}

function App() {
  React.useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); else e.target.classList.remove("in"); });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => obs.observe(el));
    const t = setTimeout(() => window.lucide && window.lucide.createIcons(), 80);
    return () => { obs.disconnect(); clearTimeout(t); };
  });

  const { Nav, Hero, ProblemSolution, Features, Consultation, HowItWorks, Stats, Testimonials, Faq, CtaFooter } = window;
  return (
    <React.Fragment>
      <ScrollProgress />
      <Nav />
      <Hero />
      <ProblemSolution />
      <Features />
      <Consultation />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <Faq />
      <CtaFooter />
      <BackToTop />
    </React.Fragment>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
// re-run icon factory after each render pass (covers state changes: drawer, faq, etc.)
setInterval(() => window.lucide && window.lucide.createIcons(), 1000);
