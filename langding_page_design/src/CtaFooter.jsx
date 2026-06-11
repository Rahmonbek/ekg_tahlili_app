// NMED landing — CTA + Footer
const { Button: FtButton, Badge: FtBadge } = window.NMED;

function FootCol({ title, items }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>{title}</div>
      <div className="col" style={{ gap: 11 }}>
        {items.map((it, i) => (
          <a key={i} href="#" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {it[0]}{it[1] && <FtBadge variant="new" style={{ padding: "2px 8px", fontSize: 10 }}>YANGI</FtBadge>}
          </a>
        ))}
      </div>
    </div>
  );
}

function CtaFooter() {
  return (
    <React.Fragment>
      {/* CTA */}
      <section className="section" style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "var(--grad-cta)", backgroundSize: "200% 200%", animation: "ctarot 12s ease infinite", zIndex: 0 }}></div>
        <div style={{ position: "absolute", inset: 0, background: "rgba(3,15,26,0.72)", zIndex: 1 }}></div>
        {/* faint wireframe shapes */}
        <svg viewBox="0 0 100 100" className="hide-sm" style={{ position: "absolute", left: "8%", top: "20%", width: 120, opacity: .12, zIndex: 1, animation: "spin 26s linear infinite" }}>
          <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="var(--green)" strokeWidth="1" />
          <polygon points="50,25 72,38 72,62 50,75 28,62 28,38" fill="none" stroke="var(--green)" strokeWidth="1" />
        </svg>
        <svg viewBox="0 0 100 100" className="hide-sm" style={{ position: "absolute", right: "8%", bottom: "16%", width: 100, opacity: .12, zIndex: 1, animation: "spin 34s linear infinite reverse" }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--green)" strokeWidth="1" />
          <ellipse cx="50" cy="50" rx="40" ry="16" fill="none" stroke="var(--green)" strokeWidth="1" />
          <ellipse cx="50" cy="50" rx="16" ry="40" fill="none" stroke="var(--green)" strokeWidth="1" />
        </svg>

        <div className="container reveal" style={{ position: "relative", zIndex: 2 }}>
          <span className="eyebrow">Bugundan boshlang</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-display-xl)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "16px 0 0" }}>
            <span style={{ display: "block" }}>Oʻz klinikangizni</span>
            <span className="grad-text shimmer" style={{ display: "block" }}>raqamlashtiring</span>
          </h2>
          <p className="sub" style={{ maxWidth: 540, margin: "20px auto 0" }}>5 daqiqada roʻyxatdan oʻting. Birinchi oy bepul.</p>
          <div style={{ marginTop: 32 }}>
            <FtButton variant="white" size="lg" iconRight={<span style={{ fontSize: 18 }}>→</span>}>Hoziroq boshlash</FtButton>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 18 }}>Kredit karta talab qilinmaydi • Sozlash 5 daqiqa • Istalgan vaqt bekor qilish</p>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" style={{ background: "var(--bg-primary)", borderTop: "1px solid var(--border-subtle)", paddingTop: 64 }}>
        <div className="container">
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 40, paddingBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span className="icon-chip" style={{ width: 36, height: 36, borderRadius: 9 }}><i data-lucide="activity"></i></span>
                <span className="grad-text" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>NMED</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, maxWidth: 260, margin: "0 0 16px" }}>Oʻzbekistondagi tibbiy diagnostika platformasi.</p>
              <div style={{ display: "flex", gap: 12 }}>
                {["send", "git-branch", "camera"].map((ic, i) => (
                  <a key={i} href="#" className="icon-chip" style={{ width: 36, height: 36, borderRadius: 9, color: "var(--text-secondary)" }}><i data-lucide={ic} style={{ width: 17, height: 17 }}></i></a>
                ))}
              </div>
            </div>
            <FootCol title="Platforma" items={[["Platforma haqida"], ["Xizmatlar"], ["Online Konsultatsiya", true], ["Narxlar"], ["Blog"]]} />
            <FootCol title="Yordam" items={[["Foydalanuvchi qoʻllanmasi"], ["FAQ"], ["Bogʻlanish"], ["Texnik yordam"]]} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Kontakt</div>
              <div className="col" style={{ gap: 12, color: "var(--text-secondary)", fontSize: 14 }}>
                <span>📍 Toshkent, Oʻzbekiston</span>
                <span>📧 info@nmed.uz</span>
                <span>🌐 nmed.uz</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom" style={{ borderTop: "1px solid var(--border-subtle)", padding: "22px 0", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, color: "var(--text-secondary)", fontSize: 13 }}>
            <span>© 2026 NMED. Barcha huquqlar himoyalangan.</span>
            <span>Maxfiylik siyosati • Foydalanish shartlari</span>
          </div>
        </div>
      </footer>
      <style>{`@keyframes ctarot{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </React.Fragment>
  );
}
window.CtaFooter = CtaFooter;
