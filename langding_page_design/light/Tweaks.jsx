// NMED Light — Tweaks: live color / font / corner-shape variants.
// Drives the theme's CSS custom properties on :root.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#119488", "#16B8A6", "#0B6B62", "#DCF0ED", "#2E72C8"],
  "fontPair": "Clash / Jakarta",
  "corners": "Yumshoq"
}/*EDITMODE-END*/;

// palette = [teal, bright, deep, wash, blue]
const PALETTES = [
  ["#119488", "#16B8A6", "#0B6B62", "#DCF0ED", "#2E72C8"], // Teal (default)
  ["#1F76C4", "#2E90E0", "#155A98", "#DCEBF7", "#14A89A"], // Ocean
  ["#0E9F6E", "#14C786", "#0A7553", "#D7F2E6", "#2E72C8"], // Emerald
  ["#6D4BD6", "#8A6BF0", "#523AA8", "#ECE6FB", "#C0407A"], // Violet (AI)
];

const FONT_PAIRS = {
  "Clash / Jakarta": { display: '"Clash Display", system-ui, sans-serif', body: '"Plus Jakarta Sans", system-ui, sans-serif' },
  "Sora / Inter": { display: '"Sora", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  "Space Grotesk / Manrope": { display: '"Space Grotesk", system-ui, sans-serif', body: '"Manrope", system-ui, sans-serif' },
};

const CORNERS = {
  "Tik":     { sm: "6px",  md: "9px",  lg: "13px", xl: "18px" },
  "Yumshoq": { sm: "12px", md: "16px", lg: "22px", xl: "28px" },
  "Yumaloq": { sm: "16px", md: "22px", lg: "30px", xl: "40px" },
};

function applyTheme(t) {
  const root = document.documentElement;
  const [teal, bright, deep, wash, blue] = t.palette || PALETTES[0];
  root.style.setProperty("--teal", teal);
  root.style.setProperty("--teal-bright", bright);
  root.style.setProperty("--teal-deep", deep);
  root.style.setProperty("--teal-wash", wash);
  root.style.setProperty("--blue", blue);
  root.style.setProperty("--grad-teal", `linear-gradient(135deg, ${bright}, ${deep})`);
  root.style.setProperty("--grad-text", `linear-gradient(115deg, ${teal} 0%, ${blue} 100%)`);
  root.style.setProperty("--grad-cta", `linear-gradient(125deg, ${deep} 0%, ${teal} 45%, ${blue} 100%)`);
  root.style.setProperty("--grad-mesh",
    `radial-gradient(60% 55% at 18% 12%, ${bright}2e, transparent 70%),` +
    `radial-gradient(50% 50% at 90% 25%, ${blue}1f, transparent 70%),` +
    `radial-gradient(45% 60% at 70% 95%, ${bright}1a, transparent 70%)`);

  const fp = FONT_PAIRS[t.fontPair] || FONT_PAIRS["Clash / Jakarta"];
  root.style.setProperty("--font-display", fp.display);
  root.style.setProperty("--font-body", fp.body);

  const c = CORNERS[t.corners] || CORNERS["Yumshoq"];
  root.style.setProperty("--r-sm", c.sm);
  root.style.setProperty("--r-md", c.md);
  root.style.setProperty("--r-lg", c.lg);
  root.style.setProperty("--r-xl", c.xl);
}

function ThemeTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTheme(t); }, [t]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Rang sxemasi" />
      <TweakColor label="Brend rangi" value={t.palette} options={PALETTES} onChange={(v) => setTweak("palette", v)} />
      <TweakSection label="Tipografika" />
      <TweakSelect label="Shrift jufti" value={t.fontPair} options={Object.keys(FONT_PAIRS)} onChange={(v) => setTweak("fontPair", v)} />
      <TweakSection label="Forma" />
      <TweakRadio label="Burchaklar" value={t.corners} options={Object.keys(CORNERS)} onChange={(v) => setTweak("corners", v)} />
    </TweaksPanel>
  );
}
window.ThemeTweaks = ThemeTweaks;
