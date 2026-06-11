// NMED Light — FAQ accordion
const FAQS = [
  { q: "NMED qanday tahlillarni qoʻllab-quvvatlaydi?", a: "EKG (12 qoʻrgʻoshinli), SMAD (24 soatlik qon bosimi), Holter monitoring, laboratoriya tahlillari va parazitologiya — barchasi bitta platformada AI yordamida tahlil qilinadi." },
  { q: "AI tahlili qancha vaqt oladi?", a: "Oʻrtacha 30 soniya. Fayl yuklangach AI yurak ritmi, ST segment, QTc interval va boshqa parametrlarni avtomatik hisoblaydi hamda PDF hisobot tayyorlaydi." },
  { q: "Online konsultatsiya qanday ishlaydi?", a: "Admin bemor tahlillarini boshqa klinikadagi mutaxassis shifokorga yuboradi. Shifokor diagnostikani koʻradi va platforma ichidagi video qoʻngʻiroq orqali bevosita maslahat beradi." },
  { q: "Maʼlumotlar xavfsizligi qanday taʼminlanadi?", a: "Barcha bemor maʼlumotlari shifrlangan holda saqlanadi, har bir qoʻngʻiroq yozib olinadi va faqat vakolatli xodimlar kira oladi." },
  { q: "Roʻyxatdan oʻtish qancha vaqt oladi?", a: "Atigi 5 daqiqa. Klinika nomi, INN va manzilni kiritasiz — birinchi oy mutlaqo bepul, kredit karta talab qilinmaydi." },
];

function FaqRow({ item, open, onToggle }) {
  const t = window.NMEDi18n.t;
  return (
    <div className={"faq-item" + (open ? " open" : "")}>
      <button className="faq-q" onClick={onToggle} aria-expanded={open}>
        <span>{t(item.q)}</span>
        <i data-lucide="chevron-down" style={{ width: 20, height: 20 }}></i>
      </button>
      <div className="faq-a"><div className="faq-a-inner">{t(item.a)}</div></div>
    </div>
  );
}

function Faq() {
  const t = window.useLang();
  const [open, setOpen] = React.useState(0);
  return (
    <section className="section section--mint" id="faq">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="head-center reveal">
          <span className="eyebrow">{t("Savol-javob")}</span>
          <h2 className="headline">{t("Koʻp soʻraladigan savollar")}</h2>
        </div>
        <div className="col reveal" data-d="1" style={{ gap: 14 }}>
          {FAQS.map((f, i) => (
            <FaqRow key={i} item={f} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
window.Faq = Faq;
