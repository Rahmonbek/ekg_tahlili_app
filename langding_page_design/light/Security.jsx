// NMED Light — Xavfsizlik & sertifikatlar (trust signals)
const SEC = [
  { icon: "lock", t: "AES-256 shifrlash", b: "Barcha bemor maʼlumotlari saqlashda va uzatishda uchdan-uchgacha shifrlanadi." },
  { icon: "badge-check", t: "Rasmiy litsenziya", b: "Sogʻliqni saqlash vazirligi talablariga muvofiq faoliyat yuritadi." },
  { icon: "server", t: "Maʼlumotlar Oʻzbekistonda", b: "Serverlar mamlakat hududida joylashgan — maʼlumot chegaradan chiqmaydi." },
  { icon: "users", t: "Rolga asoslangan kirish", b: "Har bir xodim faqat oʻz vakolati doirasidagi maʼlumotni koʻradi." },
  { icon: "scroll-text", t: "Toʻliq audit jurnali", b: "Har bir koʻrish, tahrir va qoʻngʻiroq vaqt belgisi bilan qayd etiladi." },
  { icon: "shield-check", t: "99.9% ishonchlilik", b: "Kunlik avtomatik zaxira nusxa va uzluksiz monitoring." },
];

const CERTS = ["ISO 27001", "HIPAA-mos", "GDPR-mos", "OʻzStandart"];

function Security() {
  const t = window.useLang();
  return (
    <section className="section" id="xavfsizlik">
      <div className="container">
        <div className="head-center reveal">
          <span className="eyebrow">{t("Xavfsizlik")}</span>
          <h2 className="headline">{t("Maʼlumot ishonchli ")}<span className="grad-text">{t("qoʻllarda")}</span></h2>
          <p className="sub">{t("Tibbiy maʼlumot eng nozik maʼlumot. NMED uni bank darajasida himoya qiladi.")}</p>
        </div>

        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
          {SEC.map((s, i) => (
            <div key={i} className="reveal" data-d={(i % 3) + 1} style={{ display: "flex" }}>
              <div className="card lift" style={{ padding: 28, width: "100%" }}>
                <span className="icon-chip"><i data-lucide={s.icon}></i></span>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, margin: "18px 0 8px", color: "var(--ink)" }}>{t(s.t)}</h3>
                <p style={{ color: "var(--ink-2)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{t(s.b)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reveal" data-d="2" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 44 }}>
          <span style={{ color: "var(--ink-3)", fontSize: 13, fontWeight: 600 }}>{t("Standartlarga mos:")}</span>
          {CERTS.map((c, i) => (
            <span key={i} className="pill pill--ghost" style={{ gap: 8, padding: "10px 16px", fontWeight: 700 }}>
              <i data-lucide="shield" style={{ width: 15, height: 15, color: "var(--teal)" }}></i>{t(c)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Security = Security;
