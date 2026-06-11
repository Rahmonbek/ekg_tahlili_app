// NMED Light — CTA (bold gradient moment) + light Footer
const { Button: FtBtn } = window.UI;

function FootCol({ title, items }) {
  const t = window.NMEDi18n.t;
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "var(--ink)" }}>{t(title)}</div>
      <div className="col" style={{ gap: 11 }}>
        {items.map((it, i) => (
          <a key={i} href="#" style={{ color: "var(--ink-2)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {t(it[0])}{it[1] && <span className="pill pill--solid" style={{ fontSize: 10, padding: "2px 8px" }}>{t("YANGI")}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

function CtaFooter() {
  const t = window.useLang();
  return (
    <React.Fragment>
      {/* CTA — saturated gradient block */}
      <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="container">
          <div className="reveal" style={{ position: "relative", overflow: "hidden", borderRadius: 32, textAlign: "center",
            padding: "84px 32px", boxShadow: "var(--sh-xl)" }}>
            <div style={{ position: "absolute", inset: 0, background: "var(--grad-cta)", backgroundSize: "200% 200%", animation: "ctarot 14s ease infinite", zIndex: 0 }}></div>
            {/* wireframe shapes */}
            <svg viewBox="0 0 100 100" className="hide-sm" style={{ position: "absolute", left: "6%", top: "18%", width: 120, opacity: .18, zIndex: 1, animation: "spin 30s linear infinite" }}>
              <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#fff" strokeWidth="1" />
              <polygon points="50,25 72,38 72,62 50,75 28,62 28,38" fill="none" stroke="#fff" strokeWidth="1" />
            </svg>
            <svg viewBox="0 0 100 100" className="hide-sm" style={{ position: "absolute", right: "7%", bottom: "14%", width: 104, opacity: .18, zIndex: 1, animation: "spin 38s linear infinite reverse" }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth="1" />
              <ellipse cx="50" cy="50" rx="40" ry="16" fill="none" stroke="#fff" strokeWidth="1" />
              <ellipse cx="50" cy="50" rx="16" ry="40" fill="none" stroke="#fff" strokeWidth="1" />
            </svg>
            <div style={{ position: "relative", zIndex: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>{t("Bugundan boshlang")}</span>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--fs-display)", lineHeight: 1.05, letterSpacing: "-0.015em", wordSpacing: "0.02em", margin: "16px 0 0", color: "#fff" }}>
                <span style={{ display: "block" }}>{t("Oʻz klinikangizni")}</span>
                <span style={{ display: "block", color: "rgba(255,255,255,0.78)" }}>{t("raqamlashtiring")}</span>
              </h2>
              <p style={{ maxWidth: 520, margin: "20px auto 0", color: "rgba(255,255,255,0.9)", fontSize: "var(--fs-lead)", lineHeight: 1.6 }}>{t("5 daqiqada roʻyxatdan oʻting. Birinchi oy bepul.")}</p>
              <div style={{ marginTop: 34 }}>
                <FtBtn variant="white" size="lg" iconRight={<span style={{ fontSize: 18 }}>→</span>}>{t("Hoziroq boshlash")}</FtBtn>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 18 }}>{t("Kredit karta talab qilinmaydi • Sozlash 5 daqiqa • Istalgan vaqt bekor qilish")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", paddingTop: 64 }}>
        <div className="container">
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 40, paddingBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--grad-teal)", color: "#fff" }}><i data-lucide="activity" style={{ width: 20, height: 20 }}></i></span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, color: "var(--ink)" }}>NMED</span>
              </div>
              <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6, maxWidth: 260, margin: "0 0 18px" }}>{t("Oʻzbekistondagi tibbiy diagnostika platformasi.")}</p>
              <div style={{ display: "flex", gap: 10 }}>
                {["send", "git-branch", "camera"].map((ic, i) => (
                  <a key={i} href="#" style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink-2)" }}><i data-lucide={ic} style={{ width: 17, height: 17 }}></i></a>
                ))}
              </div>
            </div>
            <FootCol title="Platforma" items={[["Platforma haqida"], ["Xizmatlar"], ["Online Konsultatsiya", true], ["Narxlar"], ["Blog"]]} />
            <FootCol title="Yordam" items={[["Foydalanuvchi qoʻllanmasi"], ["FAQ"], ["Bogʻlanish"], ["Texnik yordam"]]} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "var(--ink)" }}>{t("Kontakt")}</div>
              <div className="col" style={{ gap: 12, color: "var(--ink-2)", fontSize: 14 }}>
                <span>📍 {t("Toshkent")}, {window.__lang === "ru" ? "Узбекистан" : "Oʻzbekiston"}</span>
                <span>📧 info@nmed.uz</span>
                <span>🌐 nmed.uz</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom" style={{ borderTop: "1px solid var(--line)", padding: "22px 0", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, color: "var(--ink-3)", fontSize: 13 }}>
            <span>{t("© 2026 NMED. Barcha huquqlar himoyalangan.")}</span>
            <span>{t("Maxfiylik siyosati • Foydalanish shartlari")}</span>
          </div>
        </div>
      </footer>
      <style>{`@keyframes ctarot{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </React.Fragment>
  );
}
window.CtaFooter = CtaFooter;
