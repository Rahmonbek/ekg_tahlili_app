using System;
using System.Text;
using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Vipiska (statsionardan chiqarish epikrizi) jadvallari va shikoyatlar
    /// spravochnigining kengaytmasi.
    ///
    /// Qo'lda yozilgan — sababi `20260906000000_AddCombinedAnalyses` da.
    /// `[DbContext]`/`[Migration]` atributlari SHART.
    ///
    /// Shikoyatlar ilgari faqat kardiologik edi (23 ta, EKG yuklash uchun).
    /// Vipiskada shifokor bemorning har qanday shikoyatini tanlashi kerak,
    /// shuning uchun ro'yxat yo'nalishlar bo'yicha to'ldiriladi. Qo'shish
    /// idempotent: ruscha nomi mavjud bo'lsa qayta qo'shilmaydi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261016000000_AddDischargeSummaries")]
    public partial class AddDischargeSummaries : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "discharge_summaries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    patient_id = table.Column<int>(type: "integer", nullable: false),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false),
                    history_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    document_date = table.Column<DateOnly>(type: "date", nullable: false),
                    admission_date = table.Column<DateOnly>(type: "date", nullable: false),
                    discharge_date = table.Column<DateOnly>(type: "date", nullable: false),
                    diagnosis_main = table.Column<string>(type: "text", nullable: true),
                    diagnosis_concomitant = table.Column<string>(type: "text", nullable: true),
                    diagnosis_complications = table.Column<string>(type: "text", nullable: true),
                    complaints_text = table.Column<string>(type: "text", nullable: true),
                    anamnesis = table.Column<string>(type: "text", nullable: true),
                    objective_status = table.Column<string>(type: "text", nullable: true),
                    treatment = table.Column<string>(type: "text", nullable: true),
                    discharge_condition = table.Column<string>(type: "text", nullable: true),
                    recommendations_text = table.Column<string>(type: "text", nullable: true),
                    include_patient_copy = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discharge_summaries", x => x.id);
                    table.ForeignKey(
                        name: "FK_discharge_summaries_patients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "patients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_discharge_summaries_doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_discharge_summaries_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "discharge_summary_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    discharge_summary_id = table.Column<int>(type: "integer", nullable: false),
                    analysis_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    analysis_id = table.Column<int>(type: "integer", nullable: false),
                    snapshot_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discharge_summary_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_discharge_summary_items_discharge_summaries_discharge_summ~",
                        column: x => x.discharge_summary_id,
                        principalTable: "discharge_summaries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "discharge_summary_complaints",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    discharge_summary_id = table.Column<int>(type: "integer", nullable: false),
                    complaint_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discharge_summary_complaints", x => x.id);
                    table.ForeignKey(
                        name: "FK_discharge_summary_complaints_discharge_summaries_discharge~",
                        column: x => x.discharge_summary_id,
                        principalTable: "discharge_summaries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_discharge_summary_complaints_complaints_complaint_id",
                        column: x => x.complaint_id,
                        principalTable: "complaints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "discharge_summary_consultations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    discharge_summary_id = table.Column<int>(type: "integer", nullable: false),
                    consultation_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discharge_summary_consultations", x => x.id);
                    table.ForeignKey(
                        name: "FK_discharge_summary_consultations_discharge_summaries_dischar~",
                        column: x => x.discharge_summary_id,
                        principalTable: "discharge_summaries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_discharge_summary_consultations_consultations_consultation_id",
                        column: x => x.consultation_id,
                        principalTable: "consultations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "discharge_summary_prescriptions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    discharge_summary_id = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    drug_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    dose = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    frequency = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    intake_time = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    duration = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_discharge_summary_prescriptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_discharge_summary_prescriptions_discharge_summaries_dischar~",
                        column: x => x.discharge_summary_id,
                        principalTable: "discharge_summaries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summaries_patient_id",
                table: "discharge_summaries",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summaries_doctor_id",
                table: "discharge_summaries",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summaries_clinic_id",
                table: "discharge_summaries",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summary_items_unique",
                table: "discharge_summary_items",
                columns: new[] { "discharge_summary_id", "analysis_type", "analysis_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summary_complaints_unique",
                table: "discharge_summary_complaints",
                columns: new[] { "discharge_summary_id", "complaint_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summary_complaints_complaint_id",
                table: "discharge_summary_complaints",
                column: "complaint_id");

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summary_consultations_unique",
                table: "discharge_summary_consultations",
                columns: new[] { "discharge_summary_id", "consultation_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summary_consultations_consultation_id",
                table: "discharge_summary_consultations",
                column: "consultation_id");

            migrationBuilder.CreateIndex(
                name: "IX_discharge_summary_prescriptions_discharge_summary_id",
                table: "discharge_summary_prescriptions",
                column: "discharge_summary_id");

            // ── Shikoyatlar spravochnigi ─────────────────────────────────
            migrationBuilder.Sql(
                "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS category character varying(30);");

            // Mavjud 23 ta yozuv EKG yuklash sahifasi uchun yozilgan — ular
            // `cardio` deb belgilanadi va EKG sahifasida faqat shu yo'nalish
            // ko'rsatiladi (aks holda u yerda 160 ta checkbox chiqardi)
            migrationBuilder.Sql(
                "UPDATE complaints SET category = 'cardio' WHERE category IS NULL;");

            // Identity ketma-ketligi qo'lda qo'shilgan ID lardan orqada qolgan
            // bo'lishi mumkin — aks holda INSERT "duplicate key" bilan yiqiladi
            migrationBuilder.Sql(
                "SELECT setval(pg_get_serial_sequence('complaints', 'id'), " +
                "GREATEST((SELECT COALESCE(MAX(id), 0) FROM complaints), 1));");

            migrationBuilder.Sql(BuildComplaintsSeedSql());
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "discharge_summary_prescriptions");
            migrationBuilder.DropTable(name: "discharge_summary_consultations");
            migrationBuilder.DropTable(name: "discharge_summary_complaints");
            migrationBuilder.DropTable(name: "discharge_summary_items");
            migrationBuilder.DropTable(name: "discharge_summaries");

            // Qo'shilgan shikoyatlar ATAYLAB o'chirilmaydi: ular EKG tahlillariga
            // bog'langan bo'lishi mumkin. Faqat ustun olib tashlanadi.
            migrationBuilder.Sql("ALTER TABLE complaints DROP COLUMN IF EXISTS category;");
        }

        private static string BuildComplaintsSeedSql()
        {
            static string Q(string s) => "'" + s.Replace("'", "''") + "'";

            var sb = new StringBuilder();
            sb.Append("INSERT INTO complaints (name_uz, name_ru, name_en, category, created_at, updated_at) ");
            sb.Append("SELECT v.name_uz, v.name_ru, v.name_en, v.category, now(), now() FROM (VALUES ");

            for (var i = 0; i < Complaints.Length; i++)
            {
                var (cat, uz, ru, en) = Complaints[i];
                if (i > 0) sb.Append(',');
                sb.Append('(').Append(Q(uz)).Append(',').Append(Q(ru)).Append(',')
                  .Append(Q(en)).Append(',').Append(Q(cat)).Append(')');
            }

            sb.Append(") AS v(name_uz, name_ru, name_en, category) ");
            sb.Append("WHERE NOT EXISTS (SELECT 1 FROM complaints c WHERE lower(c.name_ru) = lower(v.name_ru));");
            return sb.ToString();
        }

        /// <summary>(yo'nalish, uz, ru, en)</summary>
        private static readonly (string, string, string, string)[] Complaints =
        {
            // ── Umumiy ──
            ("general", "Isitma (tana haroratining ko‘tarilishi)", "Повышение температуры тела", "Fever"),
            ("general", "Et uvishishi, titrash", "Озноб", "Chills"),
            ("general", "Kechasi terlash", "Ночная потливость", "Night sweats"),
            ("general", "Ko‘p terlash", "Повышенная потливость", "Excessive sweating"),
            ("general", "Ishtahaning pasayishi", "Снижение аппетита", "Loss of appetite"),
            ("general", "Vazn yo‘qotish", "Потеря веса", "Weight loss"),
            ("general", "Vazn ortishi", "Прибавка в весе", "Weight gain"),
            ("general", "Tez charchash", "Быстрая утомляемость", "Rapid fatigability"),
            ("general", "Ish qobiliyatining pasayishi", "Снижение работоспособности", "Reduced capacity for work"),
            ("general", "Uyquchanlik", "Сонливость", "Drowsiness"),
            ("general", "Doimiy chanqoq", "Жажда", "Excessive thirst"),
            ("general", "Og‘izda quruqlik", "Сухость во рту", "Dry mouth"),
            ("general", "Umumiy bezovtalik, o‘zini yomon his qilish", "Общее недомогание", "General malaise"),
            ("general", "Limfa tugunlarining kattalashishi", "Увеличение лимфатических узлов", "Swollen lymph nodes"),
            ("general", "Qon ketishga moyillik", "Повышенная кровоточивость", "Tendency to bleed"),

            // ── Yurak-qon tomir ──
            ("cardio", "Arterial bosimning ko‘tarilishi", "Повышение артериального давления", "High blood pressure"),
            ("cardio", "Arterial bosimning pasayishi", "Понижение артериального давления", "Low blood pressure"),
            ("cardio", "Qon bosimi ko‘tarilganda bosh og‘rig‘i", "Головная боль при повышении АД", "Headache with high blood pressure"),
            ("cardio", "Yurak urishini sezish (yurak o‘ynashi)", "Ощущение сердцебиения", "Palpitations"),
            ("cardio", "Yurak ishida uzilishlar", "Перебои в работе сердца", "Skipped heartbeats"),
            ("cardio", "Yurak sohasida sanchiqli og‘riq", "Колющие боли в области сердца", "Stabbing pain in the heart area"),
            ("cardio", "Yurak sohasida og‘irlik hissi", "Тяжесть в области сердца", "Heaviness in the heart area"),
            ("cardio", "To‘sh ortida siqilish hissi", "Чувство сдавления за грудиной", "Retrosternal pressure"),
            ("cardio", "Tinch holatda ko‘krak og‘rig‘i", "Боль в груди в покое", "Chest pain at rest"),
            ("cardio", "Nitroglitserindan keyin o‘tib ketadigan og‘riq", "Боль в груди, купирующаяся нитроглицерином", "Chest pain relieved by nitroglycerin"),
            ("cardio", "Zinapoyadan 1–2 qavatga ko‘tarilganda nafas qisishi", "Одышка при подъёме на 1–2 этажа", "Shortness of breath climbing 1–2 flights of stairs"),
            ("cardio", "Jismoniy yuklamaga chidamlilikning pasayishi", "Снижение толерантности к физической нагрузке", "Reduced exercise tolerance"),
            ("cardio", "Ko‘z oldida «chivinlar» uchishi", "Мелькание «мушек» перед глазами", "Floaters before the eyes"),
            ("cardio", "Yurganda oyoqlarda og‘riq (oqsoqlanish)", "Боли в ногах при ходьбе (перемежающаяся хромота)", "Leg pain when walking (intermittent claudication)"),
            ("cardio", "Oyoq-qo‘llarning sovqotishi", "Зябкость конечностей", "Cold extremities"),
            ("cardio", "Oyoqlarda og‘irlik va charchoq", "Тяжесть и усталость в ногах", "Heavy, tired legs"),
            ("cardio", "Oyoqlarda varikoz kengaygan venalar", "Варикозно расширенные вены на ногах", "Varicose veins"),
            ("cardio", "Oyoq terisi rangining o‘zgarishi", "Изменение цвета кожи ног", "Discoloration of the leg skin"),
            ("cardio", "Bo‘yin venalarining bo‘rtishi", "Набухание шейных вен", "Distended neck veins"),
            ("cardio", "Qorin hajmining kattalashishi (assit)", "Увеличение живота в объёме (асцит)", "Abdominal swelling (ascites)"),

            // ── Nafas tizimi ──
            ("respiratory", "Havo yetishmasligi hissi", "Чувство нехватки воздуха", "Feeling of air hunger"),
            ("respiratory", "Quruq yo‘tal", "Сухой кашель", "Dry cough"),
            ("respiratory", "Balg‘amli yo‘tal", "Кашель с мокротой", "Productive cough"),
            ("respiratory", "Qon aralash balg‘am", "Кровохарканье", "Coughing up blood"),
            ("respiratory", "Bo‘g‘ilish xurujlari", "Приступы удушья", "Choking attacks"),
            ("respiratory", "Hushtakli (xirillagan) nafas", "Свистящее дыхание", "Wheezing"),
            ("respiratory", "Nafas olganda ko‘krakda og‘riq", "Боль в груди при дыхании", "Chest pain on breathing"),
            ("respiratory", "Burun bitishi, tumov", "Насморк, заложенность носа", "Runny or blocked nose"),
            ("respiratory", "Tomoq og‘rig‘i", "Боль в горле", "Sore throat"),
            ("respiratory", "Ovozning bo‘g‘ilishi", "Осиплость голоса", "Hoarseness"),
            ("respiratory", "Aksirish", "Чихание", "Sneezing"),
            ("respiratory", "Xurrak otish, uyquda nafas to‘xtashi", "Храп, остановки дыхания во сне", "Snoring, breathing pauses during sleep"),

            // ── Nevrologik ──
            ("neuro", "Bosh og‘rig‘i", "Головная боль", "Headache"),
            ("neuro", "Ensa sohasida og‘riq", "Боль в затылке", "Occipital headache"),
            ("neuro", "Bosh aylanishi", "Головокружение", "Dizziness"),
            ("neuro", "Boshda shovqin", "Шум в голове", "Noise in the head"),
            ("neuro", "Quloqlarda shang‘illash", "Шум в ушах", "Ringing in the ears"),
            ("neuro", "Xotiraning pasayishi", "Снижение памяти", "Memory impairment"),
            ("neuro", "Diqqatni jamlashning qiyinlashishi", "Снижение концентрации внимания", "Poor concentration"),
            ("neuro", "Uyqusizlik", "Бессонница", "Insomnia"),
            ("neuro", "Yurganda gandiraklash", "Шаткость при ходьбе", "Unsteady gait"),
            ("neuro", "Qo‘l-oyoqlarda uvishish", "Онемение рук и ног", "Numbness of the limbs"),
            ("neuro", "Qo‘l-oyoqlarda «chumoli o‘rmalashi» hissi", "Покалывание («мурашки») в конечностях", "Tingling in the limbs"),
            ("neuro", "Qo‘l-oyoqlarda kuchsizlik", "Слабость в конечностях", "Weakness in the limbs"),
            ("neuro", "Qo‘llarning titrashi", "Дрожание рук", "Hand tremor"),
            ("neuro", "Talvasa (tutqanoq) xurujlari", "Судорожные приступы", "Seizures"),
            ("neuro", "Nutqning buzilishi", "Нарушение речи", "Speech disturbance"),
            ("neuro", "Yuz assimetriyasi", "Асимметрия лица", "Facial asymmetry"),
            ("neuro", "Ob-havo o‘zgarishiga sezgirlik", "Метеочувствительность", "Weather sensitivity"),

            // ── Oshqozon-ichak ──
            ("gastro", "Ko‘ngil aynishi", "Тошнота", "Nausea"),
            ("gastro", "Qusish", "Рвота", "Vomiting"),
            ("gastro", "Jig‘ildon qaynashi", "Изжога", "Heartburn"),
            ("gastro", "Kekirish", "Отрыжка", "Belching"),
            ("gastro", "Qorin og‘rig‘i", "Боль в животе", "Abdominal pain"),
            ("gastro", "To‘sh osti (epigastral) sohasida og‘riq", "Боль в эпигастрии", "Epigastric pain"),
            ("gastro", "O‘ng qovurg‘a ostida og‘riq va og‘irlik", "Боль и тяжесть в правом подреберье", "Pain and heaviness under the right ribs"),
            ("gastro", "Chap qovurg‘a ostida og‘riq", "Боль в левом подреберье", "Pain under the left ribs"),
            ("gastro", "Belbog‘simon qorin og‘rig‘i", "Опоясывающая боль в животе", "Girdle-like abdominal pain"),
            ("gastro", "Kindik atrofida og‘riq", "Боль вокруг пупка", "Pain around the navel"),
            ("gastro", "Qorin dam bo‘lishi", "Вздутие живота", "Bloating"),
            ("gastro", "Ovqatdan keyin og‘irlik hissi", "Тяжесть после еды", "Heaviness after eating"),
            ("gastro", "Ich qotishi", "Запор", "Constipation"),
            ("gastro", "Ich ketishi", "Диарея", "Diarrhea"),
            ("gastro", "Najasda qon", "Кровь в кале", "Blood in the stool"),
            ("gastro", "Qora rangli najas", "Чёрный стул (мелена)", "Black stool (melena)"),
            ("gastro", "Og‘izda achchiq ta’m", "Горечь во рту", "Bitter taste in the mouth"),
            ("gastro", "Yutishning qiyinlashishi", "Затруднённое глотание", "Difficulty swallowing"),
            ("gastro", "Teri va ko‘z oqining sarg‘ayishi", "Желтушность кожи и склер", "Yellowing of the skin and eyes"),
            ("gastro", "Anus sohasida qichishish", "Зуд в области ануса", "Anal itching"),
            ("gastro", "Uyquda tish g‘ijirlatish", "Скрежет зубами во сне", "Teeth grinding during sleep"),

            // ── Siydik-tanosil ──
            ("renal", "Tez-tez siyish", "Учащённое мочеиспускание", "Frequent urination"),
            ("renal", "Kechasi siyishga turish", "Ночное мочеиспускание (никтурия)", "Waking at night to urinate"),
            ("renal", "Siyganda og‘riq va achishish", "Боль и жжение при мочеиспускании", "Painful, burning urination"),
            ("renal", "Siydikda qon", "Кровь в моче", "Blood in the urine"),
            ("renal", "Siydik miqdorining kamayishi", "Уменьшение количества мочи", "Reduced urine output"),
            ("renal", "Siydikni ushlab tura olmaslik", "Недержание мочи", "Urinary incontinence"),
            ("renal", "Siydik chiqarishning qiyinlashishi", "Затруднённое мочеиспускание", "Difficulty urinating"),
            ("renal", "Siydikning loyqalanishi", "Мутная моча", "Cloudy urine"),
            ("renal", "Buyrak (bel) sohasida og‘riq", "Боль в поясничной области (в области почек)", "Kidney area pain"),
            ("renal", "Ertalab yuzda shish", "Отёки на лице по утрам", "Morning facial swelling"),

            // ── Tayanch-harakat ──
            ("musculo", "Bo‘g‘imlarda og‘riq", "Боли в суставах", "Joint pain"),
            ("musculo", "Bo‘g‘imlarda shish", "Припухлость суставов", "Joint swelling"),
            ("musculo", "Bo‘g‘imlarda ertalabki karaxtlik", "Утренняя скованность в суставах", "Morning joint stiffness"),
            ("musculo", "Bel og‘rig‘i", "Боль в пояснице", "Low back pain"),
            ("musculo", "Oyoqqa tarqaluvchi bel og‘rig‘i", "Боль в пояснице с иррадиацией в ногу", "Low back pain radiating to the leg"),
            ("musculo", "Bo‘yin og‘rig‘i", "Боль в шее", "Neck pain"),
            ("musculo", "Ko‘krak umurtqasi sohasida og‘riq", "Боль в грудном отделе позвоночника", "Thoracic back pain"),
            ("musculo", "Mushaklarda og‘riq", "Мышечные боли", "Muscle pain"),
            ("musculo", "Mushaklar tortishishi", "Судороги в мышцах", "Muscle cramps"),
            ("musculo", "Harakatlarning cheklanishi", "Ограничение подвижности", "Limited mobility"),

            // ── Endokrin ──
            ("endocrine", "Ko‘p siyish (poliuriya)", "Обильное мочеиспускание (полиурия)", "Excessive urination (polyuria)"),
            ("endocrine", "Doimiy ochlik hissi", "Постоянное чувство голода", "Constant hunger"),
            ("endocrine", "Issiqni ko‘tara olmaslik", "Непереносимость жары", "Heat intolerance"),
            ("endocrine", "Sovuqni ko‘tara olmaslik", "Непереносимость холода", "Cold intolerance"),
            ("endocrine", "Bo‘yin oldi qismining kattalashishi", "Увеличение передней поверхности шеи (щитовидной железы)", "Swelling at the front of the neck"),
            ("endocrine", "Soch to‘kilishi", "Выпадение волос", "Hair loss"),
            ("endocrine", "Yaralarning sekin bitishi", "Медленное заживление ран", "Slow wound healing"),
            ("endocrine", "Ko‘zlarning bo‘rtib chiqishi", "Пучеглазие", "Bulging eyes"),
            ("endocrine", "Oyoq panjalarida achishish", "Жжение в стопах", "Burning feet"),

            // ── Teri ──
            ("skin", "Terida toshma", "Сыпь на коже", "Skin rash"),
            ("skin", "Teri qichishi", "Кожный зуд", "Itchy skin"),
            ("skin", "Terining qizarishi", "Покраснение кожи", "Skin redness"),
            ("skin", "Terida ko‘karishlar oson paydo bo‘lishi", "Лёгкое появление синяков", "Easy bruising"),
            ("skin", "Terining quruqlashishi", "Сухость кожи", "Dry skin"),
            ("skin", "Terining rangparligi", "Бледность кожи", "Pale skin"),
            ("skin", "Terida yaralar", "Язвы на коже", "Skin ulcers"),
            ("skin", "Eshakem (urtikariya)", "Крапивница", "Hives"),

            // ── Ko‘z, quloq-burun-tomoq ──
            ("eye_ent", "Ko‘rishning pasayishi", "Снижение зрения", "Decreased vision"),
            ("eye_ent", "Ko‘rishning xiralashishi", "Нечёткость зрения", "Blurred vision"),
            ("eye_ent", "Qo‘sh ko‘rish", "Двоение в глазах", "Double vision"),
            ("eye_ent", "Ko‘zda og‘riq", "Боль в глазах", "Eye pain"),
            ("eye_ent", "Ko‘z qizarishi", "Покраснение глаз", "Red eyes"),
            ("eye_ent", "Eshitishning pasayishi", "Снижение слуха", "Hearing loss"),
            ("eye_ent", "Quloq og‘rig‘i", "Боль в ухе", "Ear pain"),
            ("eye_ent", "Burundan qon ketishi", "Носовые кровотечения", "Nosebleeds"),
            ("eye_ent", "Hid bilishning buzilishi", "Нарушение обоняния", "Loss of smell"),
            ("eye_ent", "Ta’m bilishning buzilishi", "Нарушение вкуса", "Loss of taste"),
            ("eye_ent", "Milklarning qonashi", "Кровоточивость дёсен", "Bleeding gums"),

            // ── Ruhiy holat ──
            ("psych", "Xavotir, bezovtalik", "Тревожность", "Anxiety"),
            ("psych", "Jizzakilik, asabiylashish", "Раздражительность", "Irritability"),
            ("psych", "Kayfiyatning tushkunligi", "Подавленное настроение", "Low mood"),
            ("psych", "Vahima xurujlari, o‘lim qo‘rquvi", "Панические атаки, страх смерти", "Panic attacks, fear of death"),
            ("psych", "Emotsional beqarorlik", "Эмоциональная лабильность", "Emotional lability"),

            // ── Ginekologik ──
            ("gyn", "Hayz siklining buzilishi", "Нарушение менструального цикла", "Menstrual irregularities"),
            ("gyn", "Og‘riqli hayz", "Болезненные менструации", "Painful periods"),
            ("gyn", "Ko‘p miqdorda hayz qoni ketishi", "Обильные менструации", "Heavy periods"),
            ("gyn", "Qorinning pastki qismida og‘riq", "Боль внизу живота", "Lower abdominal pain"),
            ("gyn", "Klimakterik issiq bosishlar", "Приливы жара (климактерические)", "Hot flashes"),
            ("gyn", "Jinsiy yo‘llardan g‘ayritabiiy ajralmalar", "Патологические выделения из половых путей", "Abnormal genital discharge"),
        };
    }
}
