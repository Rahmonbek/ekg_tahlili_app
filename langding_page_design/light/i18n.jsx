// NMED Light — i18n. UZ is the source language (strings live inline in components).
// t(uz) returns the Russian translation when lang==='ru', else the Uzbek string.
// Components call useLang() so they re-render when the language toggles.

window.__lang = window.__lang || (localStorage.getItem("nmed_lang") || "uz");

const RU = {
  // ---- Nav ----
  "Platforma": "Платформа",
  "Xizmatlar": "Услуги",
  "Konsultatsiya": "Консультация",
  "Statistika": "Статистика",
  "Bogʻlanish": "Контакты",
  "Kirish": "Войти",
  "Boshlash": "Начать",

  // ---- Hero ----
  "Oʻzbekistondagi birinchi AI tibbiy platforma": "Первая AI медицинская платформа в Узбекистане",
  "Tibbiyotni": "Сделайте медицину",
  "aqlli qiling": "умной",
  "EKG, SMAD, Holter va laboratoriya tahlillarini sunʼiy intellekt 30 soniyada tahlil qiladi — hamda masofaviy mutaxassis konsultatsiyasini bitta platformada birlashtiradi.":
    "Искусственный интеллект анализирует ЭКГ, СМАД, Холтер и лабораторные анализы за 30 секунд — и объединяет дистанционную консультацию специалистов на одной платформе.",
  "Platformani koʻrish": "Посмотреть платформу",
  "Video koʻrish": "Смотреть видео",
  "klinika": "клиник",
  "tahlil": "анализов",
  "aniqlik": "точность",
  "EKG tahlil tayyor": "ЭКГ анализ готов",
  "30 soniyada": "за 30 секунд",
  "AI: Normal ritm": "AI: Нормальный ритм",
  "Ishonch 99.2%": "Уверенность 99.2%",
  "Yuklanmoqda": "Загрузка",
  "Tahlil qilinmoqda": "Анализируется",
  "Tahlil tayyor": "Анализ готов",
  "AI parametrlarni tahlil qilmoqda…": "AI анализирует параметры…",
  "Kardiologiya · 10:24": "Кардиология · 10:24",

  // ---- Problem / Solution ----
  "Nima oʻzgaradi": "Что меняется",
  "Qogʻoz davridan — ": "От бумажной эры — ",
  "raqamli davrga": "к цифровой эре",
  "Bugungi muammo": "Сегодняшняя проблема",
  "NMED bilan": "С NMED",
  "Qogʻoz tahlillar yoʻqoladi": "Бумажные анализы теряются",
  "Qayta ishlash 30+ daqiqa": "Обработка 30+ минут",
  "Xato tashxis xavfi": "Риск ошибочного диагноза",
  "Shifokor vaqtini boy beradi": "Врач теряет время",
  "Masofaviy koʻrik imkonsiz": "Дистанционный осмотр невозможен",
  "Tahlil 30 soniyada tayyor": "Анализ готов за 30 секунд",
  "AI xatolikni 95% kamaytiradi": "AI снижает ошибки на 95%",
  "Hamma joydan kirish mumkin": "Доступ из любого места",
  "Avto-arxivlash va hisobot": "Авто-архивация и отчёты",
  "Masofaviy konsultatsiya": "Дистанционная консультация",

  // ---- Before / After ----
  "Solishtiring": "Сравните",
  "Qogʻoz davri ": "Бумажная эра ",
  "vs": "vs",
  " NMED": " NMED",
  "Tutqichni suring — farqni oʻzingiz koʻring.": "Потяните ползунок — увидите разницу сами.",
  "Qogʻoz": "Бумага",
  "30 soniya": "30 секунд",

  // ---- Features ----
  "Bitta platforma — ": "Одна платформа — ",
  "6 ta modul": "6 модулей",
  "Diagnostikadan masofaviy konsultatsiyagacha — barchasi sunʼiy intellekt bilan.":
    "От диагностики до дистанционной консультации — всё с искусственным интеллектом.",
  "EKG Tahlili": "ЭКГ Анализ",
  "12 qoʻrgʻoshinli EKG faylini yuklang — AI 30 soniyada yurak ritmini, ST segment va QTc intervalni tahlil qiladi.":
    "Загрузите 12-канальный файл ЭКГ — AI за 30 секунд проанализирует сердечный ритм, ST-сегмент и интервал QTc.",
  "SMAD Monitoring": "СМАД Мониторинг",
  "24 soatlik qon bosimi monitoring natijalarini AI sutkalik profil va tsirkad indeks bilan tahlil qiladi.":
    "AI анализирует результаты 24-часового мониторинга давления с суточным профилем и циркадным индексом.",
  "Holter Monitoring": "Холтер Мониторинг",
  "48 soatlik yurak monitoringi — aritmiyalar, pauzalar, ST siljishlar avtomatik aniqlanadi.":
    "48-часовой мониторинг сердца — аритмии, паузы, смещения ST определяются автоматически.",
  "Laboratoriya": "Лаборатория",
  "36 ta parametrni rasmdan ajratib oladi, normadan ogʻish boʻlsa belgilab shifokorga tavsiya beradi.":
    "Распознаёт 36 параметров со снимка, отмечает отклонения от нормы и даёт рекомендации врачу.",
  "Parazitologiya": "Паразитология",
  "Mikroskop rasmi asosida gijja turini aniqlaydi. Oʻzbekiston boʻyicha epidemiologik monitoring.":
    "Определяет вид гельминтов по снимку микроскопа. Эпидемиологический мониторинг по Узбекистану.",
  "Online Konsultatsiya": "Онлайн Консультация",
  "Boshqa klinikadagi mutaxassis shifokor bemor diagnostikasini koʻradi va video qoʻngʻiroq orqali maslahat beradi.":
    "Врач-специалист из другой клиники просматривает диагностику пациента и консультирует через видеозвонок.",
  "Video qoʻngʻiroq": "Видеозвонок",
  "Masofaviy": "Дистанционно",
  "YANGI": "НОВОЕ",

  // ---- Consultation ----
  "Masofadan — ": "Дистанционно — ",
  "malaka bilan": "с квалификацией",
  "Boshqa shahardagi mutaxassis shifokor bemoringizga platforma orqali yordam beradi.":
    "Врач-специалист из другого города помогает вашему пациенту через платформу.",
  "Diagnostika yuboriladi": "Диагностика отправляется",
  "Admin bemor tahlillarini (EKG, Lab, SMAD) tanlagan mutaxassis shifokorga platforma orqali yuboradi.":
    "Админ отправляет анализы пациента (ЭКГ, Лаб, СМАД) выбранному врачу-специалисту через платформу.",
  "Mutaxassis koʻradi": "Специалист просматривает",
  "Boshqa klinikadagi shifokor oʻz kabinetidan bemorning barcha tahlillarini batafsil koʻradi.":
    "Врач из другой клиники из своего кабинета детально просматривает все анализы пациента.",
  "Video muloqot": "Видеообщение",
  "Shifokor va admin (yonida bemor bilan) platforma ichida video qoʻngʻiroq orqali bevosita gaplashadi.":
    "Врач и админ (с пациентом рядом) напрямую общаются через видеозвонок внутри платформы.",
  "Video qoʻngʻiroq — platforma ichida": "Видеозвонок — внутри платформы",
  "Platforma ichida toʻliq integratsiya": "Полная интеграция внутри платформы",
  "Yonida bemor bilan gaplashish": "Общение с пациентом рядом",
  "Diagnostika parallel koʻrish": "Параллельный просмотр диагностики",
  "Har qoʻngʻiroq yozib olinadi": "Каждый звонок записывается",
  "Xulosa yozish imkoniyati": "Возможность написать заключение",
  "Masofaviy mutaxassis bilan ishlash": "Работа с удалённым специалистом",
  "Bemor diagnostikasi": "Диагностика пациента",
  "Kardiolog · Toshkent": "Кардиолог · Ташкент",
  "Admin + Bemor": "Админ + Пациент",
  "Anor Klinikasi": "Клиника Anor",

  // ---- How It Works ----
  "Qanday ishlaydi": "Как это работает",
  "4 qadamda boshlang": "Начните за 4 шага",
  "Klinikani roʻyxatdan oʻtkazing": "Зарегистрируйте клинику",
  "5 daqiqa. Klinika nomi, INN, manzil — hammasini onlaynda kiriting.":
    "5 минут. Название клиники, ИНН, адрес — введите всё онлайн.",
  "Bemorni qoʻshing": "Добавьте пациента",
  "Passport seriyasi va tugʻilgan sana — tizim bemorni topadi yoki yangi roʻyxat yaratadi.":
    "Серия паспорта и дата рождения — система найдёт пациента или создаст новую запись.",
  "Tahlil faylini yuklang": "Загрузите файл анализа",
  "EKG, SMAD, Holter, laboratoriya rasmi — drag & drop yoki fayl tanlash.":
    "ЭКГ, СМАД, Холтер, снимок лаборатории — drag & drop или выбор файла.",
  "AI natijani tayyorlaydi": "AI готовит результат",
  "30 soniyada toʻliq tahlil, PDF hisobot va shifokorga tavsiya.":
    "За 30 секунд полный анализ, PDF-отчёт и рекомендация врачу.",

  // ---- Stats ----
  "Raqamlarda NMED": "NMED в цифрах",
  "Faol klinikalar": "Активных клиник",
  "Amalga oshirilgan tahlillar": "Проведённых анализов",
  "Viloyat boʻyicha xizmat": "Областей охвачено",
  "AI aniqlik darajasi": "Точность AI",
  "Oylik tahlillar soni (2026)": "Анализов в месяц (2026)",
  "+186% oʻsish": "+186% рост",
  "Hududlar boʻyicha qamrov": "Охват по регионам",
  "14 viloyat": "14 областей",
  "Rang qoraygan sari — klinikalar zichligi yuqori. Hudud ustiga olib boring.":
    "Чем темнее — тем выше плотность клиник. Наведите на регион.",
  "klinika ": "клиник ",
  "Qoraqalpogʻiston": "Каракалпакстан",
  "Xorazm": "Хорезм",
  "Navoiy": "Навои",
  "Buxoro": "Бухара",
  "Sirdaryo": "Сырдарья",
  "Jizzax": "Джизак",
  "Toshkent": "Ташкент",
  "Toshkent sh.": "г. Ташкент",
  "Samarqand": "Самарканд",
  "Qashqadaryo": "Кашкадарья",
  "Surxondaryo": "Сурхандарья",
  "Namangan": "Наманган",
  "Andijon": "Андижан",
  "Fargʻona": "Фергана",

  // ---- Security ----
  "Xavfsizlik": "Безопасность",
  "Maʼlumot ishonchli ": "Данные в надёжных ",
  "qoʻllarda": "руках",
  "Tibbiy maʼlumot eng nozik maʼlumot. NMED uni bank darajasida himoya qiladi.":
    "Медицинские данные — самые чувствительные. NMED защищает их на банковском уровне.",
  "AES-256 shifrlash": "Шифрование AES-256",
  "Barcha bemor maʼlumotlari saqlashda va uzatishda uchdan-uchgacha shifrlanadi.":
    "Все данные пациентов шифруются сквозным образом при хранении и передаче.",
  "Rasmiy litsenziya": "Официальная лицензия",
  "Sogʻliqni saqlash vazirligi talablariga muvofiq faoliyat yuritadi.":
    "Работает в соответствии с требованиями Министерства здравоохранения.",
  "Maʼlumotlar Oʻzbekistonda": "Данные в Узбекистане",
  "Serverlar mamlakat hududida joylashgan — maʼlumot chegaradan chiqmaydi.":
    "Серверы расположены на территории страны — данные не покидают границы.",
  "Rolga asoslangan kirish": "Доступ по ролям",
  "Har bir xodim faqat oʻz vakolati doirasidagi maʼlumotni koʻradi.":
    "Каждый сотрудник видит только данные в рамках своих полномочий.",
  "Toʻliq audit jurnali": "Полный журнал аудита",
  "Har bir koʻrish, tahrir va qoʻngʻiroq vaqt belgisi bilan qayd etiladi.":
    "Каждый просмотр, правка и звонок фиксируются с отметкой времени.",
  "99.9% ishonchlilik": "99.9% надёжность",
  "Kunlik avtomatik zaxira nusxa va uzluksiz monitoring.":
    "Ежедневное авто-резервирование и непрерывный мониторинг.",
  "Standartlarga mos:": "Соответствует стандартам:",
  "mos": "совмест.",

  // ---- Testimonials ----
  "Mijozlar fikri": "Отзывы клиентов",
  "Shifokorlar nima deydi?": "Что говорят врачи?",
  "Kardiolog": "Кардиолог",
  "Terapevt": "Терапевт",
  "Laborant": "Лаборант",
  "EKG tahlili 30 daqiqadan 30 soniyaga tushdi.": "Анализ ЭКГ сократился с 30 минут до 30 секунд.",
  "Lab natijalarini AI tahlil qilgach bemorlarimga koʻproq vaqt qoldim.":
    "После анализа лаб-результатов AI у меня появилось больше времени на пациентов.",
  "Holter xulosasi juda batafsil, AI hatto men koʻrmagan narsalarni topdi.":
    "Заключение по Холтеру очень детальное, AI нашёл то, чего не заметил даже я.",
  "Online konsultatsiya orqali Toshkentdan mutaxassis bilan maslahat olyapmiz.":
    "Через онлайн-консультацию получаем советы специалиста из Ташкента.",
  "Parazitologiya moduli gijja aniqlikda bizni hayron qoldirdi.":
    "Модуль паразитологии поразил нас точностью определения гельминтов.",

  // ---- Blog ----
  "Blog": "Блог",
  "Soʻnggi ": "Последние ",
  "maqolalar": "статьи",
  "Tibbiy AI, amaliyot va platforma yangiliklari.": "Новости медицинского AI, практики и платформы.",
  "Texnologiya": "Технологии",
  "Amaliyot": "Практика",
  "Tadqiqot": "Исследования",
  "AI EKG tahlilida ST segment va QTc qanday hisoblanadi":
    "Как AI рассчитывает ST-сегмент и QTc при анализе ЭКГ",
  "Online konsultatsiya: 142 klinika tajribasidan 5 saboq":
    "Онлайн-консультация: 5 уроков из опыта 142 клиник",
  "Parazitologiyada AI va epidemiologik monitoring":
    "AI в паразитологии и эпидемиологический мониторинг",
  "12-Iyun, 2026": "12 июня 2026",
  "4-Iyun, 2026": "4 июня 2026",
  "28-May, 2026": "28 мая 2026",
  "daqiqa": "мин",
  "Barcha maqolalar": "Все статьи",

  // ---- FAQ ----
  "Savol-javob": "Вопрос-ответ",
  "Koʻp soʻraladigan savollar": "Часто задаваемые вопросы",
  "NMED qanday tahlillarni qoʻllab-quvvatlaydi?": "Какие анализы поддерживает NMED?",
  "EKG (12 qoʻrgʻoshinli), SMAD (24 soatlik qon bosimi), Holter monitoring, laboratoriya tahlillari va parazitologiya — barchasi bitta platformada AI yordamida tahlil qilinadi.":
    "ЭКГ (12-канальная), СМАД (24-часовое давление), Холтер-мониторинг, лабораторные анализы и паразитология — всё анализируется с помощью AI на одной платформе.",
  "AI tahlili qancha vaqt oladi?": "Сколько времени занимает анализ AI?",
  "Oʻrtacha 30 soniya. Fayl yuklangach AI yurak ritmi, ST segment, QTc interval va boshqa parametrlarni avtomatik hisoblaydi hamda PDF hisobot tayyorlaydi.":
    "В среднем 30 секунд. После загрузки файла AI автоматически рассчитывает сердечный ритм, ST-сегмент, интервал QTc и другие параметры, а также готовит PDF-отчёт.",
  "Online konsultatsiya qanday ishlaydi?": "Как работает онлайн-консультация?",
  "Admin bemor tahlillarini boshqa klinikadagi mutaxassis shifokorga yuboradi. Shifokor diagnostikani koʻradi va platforma ichidagi video qoʻngʻiroq orqali bevosita maslahat beradi.":
    "Админ отправляет анализы пациента врачу-специалисту из другой клиники. Врач просматривает диагностику и консультирует напрямую через видеозвонок внутри платформы.",
  "Maʼlumotlar xavfsizligi qanday taʼminlanadi?": "Как обеспечивается безопасность данных?",
  "Barcha bemor maʼlumotlari shifrlangan holda saqlanadi, har bir qoʻngʻiroq yozib olinadi va faqat vakolatli xodimlar kira oladi.":
    "Все данные пациентов хранятся в зашифрованном виде, каждый звонок записывается, а доступ имеют только уполномоченные сотрудники.",
  "Roʻyxatdan oʻtish qancha vaqt oladi?": "Сколько времени занимает регистрация?",
  "Atigi 5 daqiqa. Klinika nomi, INN va manzilni kiritasiz — birinchi oy mutlaqo bepul, kredit karta talab qilinmaydi.":
    "Всего 5 минут. Вводите название клиники, ИНН и адрес — первый месяц совершенно бесплатно, кредитная карта не требуется.",

  // ---- CTA / Footer ----
  "Bugundan boshlang": "Начните сегодня",
  "Oʻz klinikangizni": "Оцифруйте свою",
  "raqamlashtiring": "клинику",
  "5 daqiqada roʻyxatdan oʻting. Birinchi oy bepul.": "Зарегистрируйтесь за 5 минут. Первый месяц бесплатно.",
  "Hoziroq boshlash": "Начать сейчас",
  "Kredit karta talab qilinmaydi • Sozlash 5 daqiqa • Istalgan vaqt bekor qilish":
    "Кредитная карта не требуется • Настройка 5 минут • Отмена в любое время",
  "Oʻzbekistondagi tibbiy diagnostika platformasi.": "Платформа медицинской диагностики в Узбекистане.",
  "Platforma haqida": "О платформе",
  "Narxlar": "Цены",
  "Yordam": "Помощь",
  "Foydalanuvchi qoʻllanmasi": "Руководство пользователя",
  "FAQ": "FAQ",
  "Texnik yordam": "Техподдержка",
  "Kontakt": "Контакты",
  "© 2026 NMED. Barcha huquqlar himoyalangan.": "© 2026 NMED. Все права защищены.",
  "Maxfiylik siyosati • Foydalanish shartlari": "Политика конфиденциальности • Условия использования",
};

window.NMEDi18n = {
  t(uz) { return window.__lang === "ru" ? (RU[uz] || uz) : uz; },
  get lang() { return window.__lang; },
  set(lang) {
    window.__lang = lang;
    try { localStorage.setItem("nmed_lang", lang); } catch (e) {}
    window.dispatchEvent(new Event("nmed-lang"));
    document.documentElement.setAttribute("lang", lang);
  },
};

// Hook: subscribe to language changes so the component re-renders.
window.useLang = function useLang() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    window.addEventListener("nmed-lang", force);
    return () => window.removeEventListener("nmed-lang", force);
  }, []);
  return window.NMEDi18n.t;
};
