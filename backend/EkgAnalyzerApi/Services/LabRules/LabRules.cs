using System.Globalization;

namespace EkgAnalyzerApi.Services.LabRules;

/// <summary>
/// "NMED — laboratoriya tahlillarining vaqt bo'yicha o'zgarishiga asoslangan
/// klinik qoidalar" spetsifikatsiyasi (v1.0, 2026-11-01) — bizdagi
/// ko'rsatkichlar bilan bajariladigan qoidalar.
///
/// MUHIM:
///  * Natija hech qachon yakuniy tashxis emas — shifokor tasdiqlaydi.
///  * Foizdagi "kasallik ehtimoli" qaytarilmaydi (spetsifikatsiya taqiqlaydi);
///    o'rniga holat, dalil va keyingi qadam beriladi.
///  * Ishlab chiqarishda tibbiy ekspert tasdig'idan keyin diagnostik xizmat
///    sifatida yoqiladi; hozircha shifokorga signal (pilot).
///  * Bizda tahlilning faqat SANASI bor (soati yo'q) — "48 soat" kun
///    aniqligida (≤ 2 kun) hisoblanadi.
///  * Homiladorlik, simptomlar, dorilar tizimda yo'q — bunday qoidalar
///    `Missing` da aytadi.
/// </summary>
public static class LabRules
{
    /// <summary>Qoidalar versiyasi — o'zgarsa worker barcha bemorlarni qayta baholaydi.</summary>
    /// <remarks>
    /// 1.1.0 (2026-11-02): REN-01 faqat yaqindagi epizod uchun CRITERIA_MET
    /// (eskisi — MONITOR); GLU-02 oxirgi 12 oyda patologik qiymat talab
    /// qiladi; GLU-01 oraliqlari yarim ochiq (bo'shliqlar yopildi); ELE-02
    /// Na &lt;120 / &gt;160 — CRITICAL; jinsi noma'lum bemorda katalog me'yori
    /// birlashmasi bir jinsda chegara bo'lmasa — chegarasiz.
    /// </remarks>
    public const string Version = "1.1.0-2026-11-02";

    /// <summary>REN-01: juftning keyingi qiymati oxirgi kreatinindan shuncha kun ichida bo'lsa — o'tkir.</summary>
    internal const double AkiRecentDays = 14;

    /// <summary>GLU-02: kamida bitta patologik qiymat bemorning oxirgi tahlilidan shuncha oy ichida bo'lsin.</summary>
    internal const int DiabetesRecentMonths = 12;

    /// <summary>Qoida ID si va funksiyasi (GLU-01 alohida — GLU-02 ga bog'liq).</summary>
    private static readonly (string Id, Func<PatientLabContext, RuleSignal?> Fn)[] Rules =
    {
        ("REN-01", Ren01), ("ELE-01", Ele01), ("CAR-01", Car01),                       // P0
        ("GLU-02", Glu02), ("REN-02", Ren02), ("HEM-01", Hem01), ("HEM-02", Hem02),
        ("HEM-03", Hem03), ("HEM-04", Hem04), ("HEM-05", Hem05),
        ("THY-01", Thy01), ("THY-02", Thy02), ("LIV-01", Liv01), ("LIV-02", Liv02), ("PAN-01", Pan01), // P1
        ("CAR-02", Car02), ("LIP-01", Lip01), ("ELE-02", Ele02), ("INF-01", Inf01), ("INF-02", Inf02),
        ("COA-01", Coa01), ("UR-01", Ur01), ("ONC-01", Onc01), ("MET-01", Met01),   // P2
    };

    /// <summary>Barcha qoidalar natijasi (xato bergan qoidalar tashlab ketiladi).</summary>
    public static IEnumerable<RuleSignal> Evaluate(PatientLabContext c) => EvaluateSafe(c, null).Signals;

    /// <summary>
    /// Har bir qoida ALOHIDA bajariladi: bittasidagi istisno qolganlarini
    /// to'xtatmaydi (L-11). Xato bergan qoidalar <c>Failed</c> da qaytadi —
    /// chaqiruvchi ularning eski signalini o'chirmasligi kerak.
    /// </summary>
    public static (List<RuleSignal> Signals, List<string> Failed) EvaluateSafe(
        PatientLabContext c, Action<string, Exception>? onError)
    {
        var results = new List<RuleSignal>();
        var failed = new List<string>();

        void Run(string id, Func<PatientLabContext, RuleSignal?> fn)
        {
            try
            {
                var s = fn(c);
                if (s != null) results.Add(s);
            }
            catch (Exception ex)
            {
                failed.Add(id);
                onError?.Invoke(id, ex);
            }
        }

        foreach (var (id, fn) in Rules) Run(id, fn);
        // GLU-01 faqat GLU-02 ishlamaganda (prediabet ≠ diabet). GLU-02 xato
        // bergan bo'lsa GLU-01 ham baholanmaydi — eski signallar saqlanadi.
        // GLU-02 faqat tarixda (MONITOR) bo'lsa hozirgi prediabet ham ko'rsatiladi.
        if (failed.Contains("GLU-02")) failed.Add("GLU-01");
        else if (results.All(r => r.RuleId != "GLU-02" || r.Status == RuleStatus.Monitor)) Run("GLU-01", Glu01);
        return (results, failed);
    }

    // ═══ P0 ═══════════════════════════════════════════════════════════════

    /// <summary>REN-01 — O'tkir buyrak shikastlanishi (KDIGO AKI).</summary>
    private static RuleSignal? Ren01(PatientLabContext c)
    {
        var s = c.Series("creatinine");
        if (s.Count < 2) return null;
        var latest = s[^1];
        for (var j = s.Count - 1; j >= 1; j--)
        {
            var cur = s[j];
            for (var i = j - 1; i >= 0; i--)
            {
                var prev = s[i];
                var days = (cur.Date - prev.Date).TotalDays;
                if (days > 7.5) break;
                var delta = cur.Value!.Value - prev.Value!.Value;
                var byAbs = days <= 2.5 && delta >= 26.5m;
                var byRatio = prev.Value > 0 && cur.Value >= prev.Value * 1.5m;
                if (!byAbs && !byRatio) continue;
                var change = $"Kreatinin {D(prev.Date)}: {N(prev.Value)} → {D(cur.Date)}: {N(cur.Value)} µmol/L " +
                             $"({Math.Round(days)} kunda {(byAbs ? $"+{N(delta)} µmol/L" : $"{N(cur.Value / prev.Value)} baravar")}).";
                var evidence = new List<Evidence>
                {
                    c.Ev(prev), c.Ev(cur, byAbs ? prev.Value + 26.5m : prev.Value * 1.5m, "≥", "criterion"),
                };

                // AKI — o'tkir holat: faqat oxirgi kreatinin (yoki undan
                // AkiRecentDays ichidagi qiymat) epizodi "shoshilinch". Eski
                // epizoddan keyin yangi o'lchovlar bor — u tarix (L-12).
                if ((latest.Date - cur.Date).TotalDays > AkiRecentDays + 0.5)
                {
                    // Dalil — faqat epizod juftligi: keyingi har bir kreatinin
                    // shifokor bahosini `pending` ga qaytarmasin
                    return new RuleSignal
                    {
                        RuleId = "REN-01",
                        Status = RuleStatus.Monitor,
                        Severity = 1,
                        Title = $"Tarixda AKI epizodi ({D(cur.Date)})",
                        Message = $"Tarixda AKI epizodi ({D(cur.Date)}): {change} " +
                                  $"Oxirgi kreatinin {N(latest.Value)} µmol/L ({D(latest.Date)}).",
                        Recommendation = "Buyrak funksiyasini dinamikada kuzating (kreatinin, eGFR); " +
                                         "AKI epizodi surunkali buyrak kasalligi xavfini oshiradi.",
                        Evidence = evidence,
                        Temporal = Temporal(days, delta, prev.Value),
                        LatestAnalysisId = cur.AnalysisId,
                        ObservedAt = cur.Date,
                    };
                }

                return new RuleSignal
                {
                    RuleId = "REN-01",
                    Status = RuleStatus.CriteriaMet,
                    Severity = 3,
                    Title = "O'tkir buyrak shikastlanishi (AKI) mezoni",
                    Message = change + " KDIGO: 48 soatda ≥26.5 µmol/L yoki 7 kunda ≥1.5 baravar oshish.",
                    Recommendation = "Shoshilinch klinik baholash: diurez, nefrotoksik dorilar, qayta kreatinin va elektrolitlar. " +
                                     "Bazal kreatininni klinik algoritm bilan tanlang.",
                    Evidence = evidence,
                    Temporal = Temporal(days, delta, prev.Value),
                    Missing = { "Tahlil soati (48 soat kun aniqligida hisoblandi)", "Diurez" },
                    LatestAnalysisId = cur.AnalysisId,
                    ObservedAt = cur.Date,
                };
            }
        }
        return null;
    }

    /// <summary>ELE-01 — Giperkalemiya.</summary>
    private static RuleSignal? Ele01(PatientLabContext c)
    {
        var k = c.Latest("potassium");
        if (k?.Value is not { } v || v < 5.5m) return null;
        var (status, sev, level) = v >= 6.5m ? (RuleStatus.Critical, (short)3, "og'ir")
            : v >= 6.0m ? (RuleStatus.Suspected, (short)3, "o'rtacha")
            : (RuleStatus.Suspected, (short)2, "yengil");
        return new RuleSignal
        {
            RuleId = "ELE-01",
            Status = status,
            Severity = sev,
            Title = $"Giperkalemiya ({level})",
            Message = $"Kaliy {N(v)} mmol/L ({D(k.Date)}). Mezon: ≥5.5 — giperkalemiya, ≥6.0 — tez ko'rib chiqish, ≥6.5 — og'ir.",
            Recommendation = v >= 6.0m
                ? "Shoshilinch klinik baholash va EKG; gemoliz sababli soxta oshishni tekshiring, lekin yordamni kechiktirmang."
                : "Qayta tekshiring (gemoliz?), dorilar va buyrak funksiyasini baholang.",
            Evidence = { c.Ev(k, v >= 6.5m ? 6.5m : v >= 6.0m ? 6.0m : 5.5m, "≥", "criterion") },
            LatestAnalysisId = k.AnalysisId,
            ObservedAt = k.Date,
        };
    }

    /// <summary>CAR-01 — Miokard shikastlanishiga shubha (troponin &gt; assay 99-persentili).</summary>
    private static RuleSignal? Car01(PatientLabContext c)
    {
        var t = c.Latest("troponin_i");
        if (t?.Value is not { } v) return null;
        var uln = c.Uln(t);
        if (uln is null || v <= uln) return null;
        var missing = new List<string> { "Simptomlar", "EKG" };
        if (t.RefHigh is null) missing.Insert(0, "Assayga xos 99-persentil (laboratoriya me'yori) — katalog chegarasi ishlatildi");
        var series = c.Series("troponin_i").Where(o => (t.Date - o.Date).TotalDays <= 1.5).ToList();
        Dictionary<string, object?>? temporal = null;
        if (series.Count >= 2)
        {
            var first = series[0];
            temporal = Temporal((t.Date - first.Date).TotalDays, v - first.Value!.Value, first.Value);
        }
        return new RuleSignal
        {
            RuleId = "CAR-01",
            Status = RuleStatus.Critical,
            Severity = 3,
            Title = "Troponin oshgan — miokard shikastlanishi",
            Message = $"Troponin I {N(v)} ng/mL > {N(uln)} ({(t.RefHigh.HasValue ? "laboratoriya 99-persentili" : "katalog")}), {D(t.Date)}. " +
                      "Bu infarkt tashxisi emas: o'tkir shikastlanish uchun o'sish/pasayish, infarkt uchun ishemiya dalili kerak.",
            Recommendation = "Tez klinik va EKG ko'rigi; seriyali troponin (0/1 yoki 0/2 soat — faqat yuqori sezgir assay bilan).",
            Evidence = { c.Ev(t, uln, ">", c.RefSource(t, true)) },
            Temporal = temporal,
            Missing = missing,
            LatestAnalysisId = t.AnalysisId,
            ObservedAt = t.Date,
        };
    }

    // ═══ P1 ═══════════════════════════════════════════════════════════════

    /// <summary>GLU-01 — Prediabet (ADA 2026).</summary>
    private static RuleSignal? Glu01(PatientLabContext c)
    {
        var g = c.Latest("glucose");
        var h = c.Latest("hba1c");
        var ev = new List<Evidence>();
        // Yarim ochiq oraliqlar: GLU-02 chegarasigacha (6.95 / 6.45 bo'shlig'i yo'q — L-27)
        if (g?.Value is { } gv && gv >= 5.6m && gv < 7.0m) ev.Add(c.Ev(g, 5.6m, "≥", "criterion"));
        if (h?.Value is { } hv && hv >= 5.7m && hv < 6.5m) ev.Add(c.Ev(h, 5.7m, "≥", "criterion"));
        if (ev.Count == 0) return null;
        var last = ev.OrderBy(e => e.Date).Last();
        if (c.AgeAt(last.Date) is < 18) return null;
        return new RuleSignal
        {
            RuleId = "GLU-01",
            Status = RuleStatus.Suspected,
            Severity = 1,
            Title = "Prediabet diapazoni",
            Message = string.Join("; ", ev.Select(e => $"{e.Name} {N(e.Value)} {e.Unit} ({D(e.Date)})")) +
                      ". Mezon: och qoringa glyukoza 5.6 – <7.0 mmol/L yoki HbA1c 5.7 – <6.5%.",
            Recommendation = "3–6 oyda qayta tekshirish (individual qaror); turmush tarzi bo'yicha maslahat. " +
                             "HbA1c anemiya va gemoglobinopatiyada ishonchsiz bo'lishi mumkin.",
            Evidence = ev,
            Missing = MissingAdult(c, last.Date, pregnancy: true),
            LatestAnalysisId = last.AnalysisId,
            ObservedAt = last.Date,
        };
    }

    /// <summary>GLU-02 — Qandli diabetga mos mezon (ADA 2026).</summary>
    private static RuleSignal? Glu02(PatientLabContext c)
    {
        var path = c.Series("glucose").Where(o => o.Value >= 7.0m).Select(o => (o, thr: 7.0m))
            .Concat(c.Series("hba1c").Where(o => o.Value >= 6.5m).Select(o => (o, thr: 6.5m)))
            .OrderBy(x => x.o.Date).ToList();
        if (path.Count == 0) return null;
        var shown = path.TakeLast(3).ToList();
        var last = shown.Last().o;

        // Kamida bitta patologik qiymat bemorning OXIRGI tahlilidan 12 oy
        // ichida bo'lsin (L-12). Mos yozuv "hozir"ga emas, bemor tarixiga
        // nisbatan — natija vaqt o'tishi bilan o'zgarmaydi (worker faqat
        // ma'lumot o'zgarganda qayta baholaydi).
        var reference = c.LatestDate ?? last.Date;
        if (last.Date < reference.AddMonths(-DiabetesRecentMonths))
        {
            return new RuleSignal
            {
                RuleId = "GLU-02",
                Status = RuleStatus.Monitor,
                Severity = 1,
                Title = "Tarixda qandli diabet mezoniga mos natijalar",
                Message = string.Join("; ", shown.Select(x => $"{c.Name(x.o.Col)} {N(x.o.Value)} {c.Unit(x.o.Col)} ({D(x.o.Date)})")) +
                          $". Oxirgi {DiabetesRecentMonths} oyda glyukoza ≥7.0 mmol/L yoki HbA1c ≥6.5% qayd etilmagan.",
                Recommendation = "Anamnezda diabet bo'lsa — HbA1c bilan nazorat; bo'lmasa — skrining (HbA1c yoki och qoringa glyukoza).",
                Evidence = shown.Select(x => c.Ev(x.o, x.thr, "≥", "criterion")).ToList(),
                Missing = MissingAdult(c, last.Date, pregnancy: true),
                LatestAnalysisId = last.AnalysisId,
                ObservedAt = last.Date,
            };
        }

        var confirmed = path.Count >= 2;
        return new RuleSignal
        {
            RuleId = "GLU-02",
            Status = confirmed ? RuleStatus.CriteriaMet : RuleStatus.Suspected,
            Severity = 2,
            Title = confirmed ? "Qandli diabetga mos laboratoriya mezoni" : "Qandli diabetga shubha (bitta patologik natija)",
            Message = string.Join("; ", shown.Select(x => $"{c.Name(x.o.Col)} {N(x.o.Value)} {c.Unit(x.o.Col)} ({D(x.o.Date)})")) +
                      ". Mezon: och qoringa glyukoza ≥7.0 mmol/L yoki HbA1c ≥6.5%; simptomsiz holatda 2 ta patologik natija bilan tasdiqlanadi.",
            Recommendation = confirmed
                ? "Endokrinolog ko'rigi; diabet turini bu tahlillar bilan ajratmang (C-peptid — yordamchi)."
                : "Tasdiqlash uchun takroriy test (HbA1c yoki och qoringa glyukoza).",
            Evidence = shown.Select(x => c.Ev(x.o, x.thr, "≥", "criterion")).ToList(),
            Missing = MissingAdult(c, last.Date, pregnancy: true),
            LatestAnalysisId = last.AnalysisId,
            ObservedAt = last.Date,
        };
    }

    /// <summary>REN-02 — Surunkali buyrak kasalligi ehtimoli (eGFR &lt;60, ≥3 oy).</summary>
    private static RuleSignal? Ren02(PatientLabContext c)
    {
        var cr = c.Series("creatinine");
        if (cr.Count == 0) return null;
        var last = cr[^1];
        var egfrs = cr.Select(o => (o, egfr: c.Egfr(o))).ToList();
        if (egfrs[^1].egfr is null)
        {
            // Yosh/jinssiz eGFR hisoblanmaydi — faqat kreatinin yuqori bo'lsa aytamiz
            var uln = c.Uln(last);
            if (uln is null || last.Value <= uln) return null;
            var missing = new List<string>();
            if (c.Male is null) missing.Add("Bemor jinsi");
            if (c.AgeAt(last.Date) is null) missing.Add("Bemor yoshi (tug'ilgan sana)");
            return new RuleSignal
            {
                RuleId = "REN-02",
                Status = RuleStatus.InsufficientData,
                Severity = 1,
                Title = "Kreatinin yuqori — eGFR hisoblab bo'lmadi",
                Message = $"Kreatinin {N(last.Value)} µmol/L > {N(uln)} ({D(last.Date)}). eGFR (CKD-EPI 2021) uchun yosh va jins kerak.",
                Recommendation = "Bemor kartasida tug'ilgan sana va jinsni to'ldiring.",
                Evidence = { c.Ev(last, uln, ">", c.RefSource(last, true)) },
                Missing = missing,
                LatestAnalysisId = last.AnalysisId,
                ObservedAt = last.Date,
            };
        }
        var lastEgfr = egfrs[^1].egfr!.Value;
        if (lastEgfr >= 60) return null;
        // ≥3 oy davomida barcha eGFR <60
        var chronic = false;
        DateTime? since = null;
        for (var i = egfrs.Count - 1; i >= 0; i--)
        {
            if (egfrs[i].egfr is not { } e || e >= 60) break;
            since = egfrs[i].o.Date;
        }
        if (since.HasValue && (last.Date - since.Value).TotalDays >= 90) chronic = true;
        Dictionary<string, object?>? temporal = null;
        if (egfrs.Count >= 2 && egfrs[^2].egfr is { } prevE)
        {
            temporal = new()
            {
                ["previous_egfr"] = prevE,
                ["egfr"] = lastEgfr,
                ["delta_pct"] = prevE > 0 ? Math.Round((lastEgfr - prevE) / prevE * 100, 1) : null,
                ["window_days"] = Math.Round((last.Date - egfrs[^2].o.Date).TotalDays),
                ["since"] = since,
            };
        }
        var sev = lastEgfr < 15 ? (short)3 : (short)2;
        return new RuleSignal
        {
            RuleId = "REN-02",
            Status = chronic ? RuleStatus.CriteriaMet : RuleStatus.Suspected,
            Severity = sev,
            Title = chronic ? "Surunkali buyrak kasalligiga mos (eGFR <60 ≥3 oy)" : "eGFR pasaygan — SBK ehtimoli",
            Message = $"eGFR {F(lastEgfr)} ml/min/1.73m² (kreatinin {N(last.Value)} µmol/L, {D(last.Date)}, CKD-EPI 2021)" +
                      (chronic ? $"; {D(since!.Value)} dan beri <60." : ". Bir martalik past eGFR — faqat shubha, ≥3 oy davomiylik kerak."),
            Recommendation = "UACR (siydik albumin/kreatinin) va qayta eGFR; nefrolog bilan maslahat. " +
                             (temporal?["delta_pct"] is double d && Math.Abs(d) > 20 ? "eGFR >20% o'zgargan — tekshiruv signali. " : ""),
            Evidence = { c.Ev(last, 60, "eGFR <", "criterion") },
            Temporal = temporal,
            Missing = { "UACR (tizimda yo'q)" },
            LatestAnalysisId = last.AnalysisId,
            ObservedAt = last.Date,
        };
    }

    /// <summary>HEM-01 — Anemiya (WHO 2024).</summary>
    private static RuleSignal? Hem01(PatientLabContext c)
    {
        var hb = c.Latest("hb");
        if (hb?.Value is not { } v) return null;
        var age = c.AgeAt(hb.Date);
        decimal? thr = age switch
        {
            < 5 => null, // 6–59 oylik bolalar — oy aniqligi kerak
            < 12 => 115m,
            < 15 => 120m,
            _ => c.Male switch { true => 130m, false => 120m, null => null },
        };
        if (age is null && c.Male is not null) thr = c.Male == true ? 130m : 120m;
        if (thr is null)
        {
            if (v >= 130m || age is < 5) return null;
            return new RuleSignal
            {
                RuleId = "HEM-01",
                Status = RuleStatus.InsufficientData,
                Severity = 1,
                Title = "Gemoglobin past bo'lishi mumkin — jins noma'lum",
                Message = $"Hb {N(v)} g/L ({D(hb.Date)}). WHO chegarasi jinsga bog'liq (erkak <130, ayol <120).",
                Recommendation = "Bemor kartasida jins va tug'ilgan sanani to'ldiring.",
                Evidence = { c.Ev(hb) },
                Missing = { "Bemor jinsi" },
                LatestAnalysisId = hb.AnalysisId,
                ObservedAt = hb.Date,
            };
        }
        if (v >= thr) return null;
        var missing = MissingAdult(c, hb.Date, pregnancy: c.Male == false);
        if (age is > 65) missing.Add("65 yoshdan katta — mahalliy standart bilan tasdiqlang");
        return new RuleSignal
        {
            RuleId = "HEM-01",
            Status = RuleStatus.CriteriaMet,
            Severity = v < 70 ? (short)3 : (short)2,
            Title = "Anemiya ko'rsatkichi",
            Message = $"Hb {N(v)} g/L < {N(thr)} ({D(hb.Date)}, WHO 2024). Etiologiyasi noma'lum.",
            Recommendation = "Ferritin, MCV/MCH, retikulotsitlar, B12/folat; sababini aniqlang (qon yo'qotish va boshqalar).",
            Evidence = { c.Ev(hb, thr, "<", "criterion") },
            Missing = missing,
            LatestAnalysisId = hb.AnalysisId,
            ObservedAt = hb.Date,
        };
    }

    /// <summary>HEM-02 — Temir tanqisligi anemiyasi (AGA: anemiya + ferritin &lt;45 µg/L).</summary>
    private static RuleSignal? Hem02(PatientLabContext c)
    {
        var anemia = Hem01(c);
        if (anemia is not { Status: RuleStatus.CriteriaMet }) return null;
        var hb = c.Latest("hb")!;
        var fer = c.Near("ferritin", hb.Date, 30);
        if (fer?.Value is not { } fv || fv >= 45m) return null;
        var ev = new List<Evidence> { c.Ev(hb), c.Ev(fer, 45m, "<", "criterion") };
        var mcv = c.Near("mcv", hb.Date, 0);
        if (mcv != null && c.Lln(mcv) is { } ml && mcv.Value < ml) ev.Add(c.Ev(mcv, ml, "<", c.RefSource(mcv, false)));
        var mch = c.Near("mch", hb.Date, 0);
        if (mch != null && c.Lln(mch) is { } hl && mch.Value < hl) ev.Add(c.Ev(mch, hl, "<", c.RefSource(mch, false)));
        string? tsatText = null;
        var iron = c.Near("iron", hb.Date, 0);
        var tibc = c.Near("tibc", hb.Date, 0);
        if (iron?.Value is { } fe && tibc?.Value is { } tb && tb > 0)
        {
            var tsat = Math.Round(fe / tb * 100, 1);
            tsatText = $" TSAT {N(tsat)}%{(tsat < 20 ? " (<20% — qo'shimcha dalil)" : "")}.";
        }
        var missing = new List<string>();
        if (c.Near("crp", hb.Date, 7) == null) missing.Add("CRP (yallig'lanish ferritinni yolg'on normal ko'rsatadi)");
        return new RuleSignal
        {
            RuleId = "HEM-02",
            Status = RuleStatus.Suspected,
            Severity = 2,
            Title = "Temir tanqisligi anemiyasiga shubha",
            Message = $"Anemiya (Hb {N(hb.Value)} g/L) va ferritin {N(fv)} µg/L < 45 ({D(fer.Date)}).{tsatText}",
            Recommendation = "Klinik tasdiq; sababni tekshiring (qon yo'qotish, oshqozon-ichak).",
            Evidence = ev,
            Missing = missing,
            LatestAnalysisId = fer.AnalysisId,
            ObservedAt = fer.Date,
        };
    }

    /// <summary>HEM-03 — B12 yetishmovchiligi (NICE NG239).</summary>
    private static RuleSignal? Hem03(PatientLabContext c)
    {
        var b = c.Latest("vitamin_b12");
        if (b?.Value is not { } v || v > 350m) return null;
        var low = v < 180m;
        return new RuleSignal
        {
            RuleId = "HEM-03",
            Status = low ? RuleStatus.CriteriaMet : RuleStatus.Suspected,
            Severity = low ? (short)2 : (short)1,
            Title = low ? "B12 tanqisligiga mos" : "B12 noaniq diapazonda",
            Message = $"Vitamin B12 {N(v)} pg/mL ({D(b.Date)}). NICE: <180 — tanqislikka mos, 180–350 — noaniq.",
            Recommendation = "Simptomlarni baholang; zarur bo'lsa MMA. Normal MCV tanqislikni inkor etmaydi.",
            Evidence = { c.Ev(b, low ? 180m : 350m, low ? "<" : "≤", "criterion") },
            Missing = { "MMA (tizimda yo'q)" },
            LatestAnalysisId = b.AnalysisId,
            ObservedAt = b.Date,
        };
    }

    /// <summary>HEM-04 — Folat tanqisligiga shubha (faqat laboratoriya LLN; global chegara yo'q).</summary>
    private static RuleSignal? Hem04(PatientLabContext c)
    {
        var f = c.Latest("folate");
        if (f?.Value is not { } v || f.RefLow is not { } lln || v >= lln) return null;
        return new RuleSignal
        {
            RuleId = "HEM-04",
            Status = RuleStatus.Suspected,
            Severity = 1,
            Title = "Folat tanqisligiga shubha",
            Message = $"Folat {N(v)} ng/mL < laboratoriya pastki chegarasi {N(lln)} ({D(f.Date)}).",
            Recommendation = "B12 tanqisligini ham tekshiring; makrotsitoz va anemiyani baholang.",
            Evidence = { c.Ev(f, lln, "<", "lab") },
            LatestAnalysisId = f.AnalysisId,
            ObservedAt = f.Date,
        };
    }

    /// <summary>HEM-05 — Trombotsitopeniya va neytropeniya.</summary>
    private static RuleSignal? Hem05(PatientLabContext c)
    {
        var ev = new List<Evidence>();
        var parts = new List<string>();
        short sev = 0;
        var status = RuleStatus.Suspected;
        Obs? lastObs = null;
        var plt = c.Latest("plt");
        if (plt?.Value is { } pv && pv < 150m)
        {
            ev.Add(c.Ev(plt, 150m, "<", "criterion"));
            parts.Add($"PLT {N(pv)} ×10⁹/L <150");
            sev = Math.Max(sev, pv < 50m ? (short)3 : (short)2);
            lastObs = plt;
        }
        var anc = c.Latest("neutrophils_abs");
        if (anc?.Value is { } av && av < 1.5m)
        {
            ev.Add(c.Ev(anc, av < 0.5m ? 0.5m : 1.5m, "<", "criterion"));
            parts.Add($"ANC {N(av)} ×10⁹/L {(av < 0.5m ? "<0.5 (og'ir)" : "<1.5")}");
            if (av < 0.5m) { sev = 3; status = RuleStatus.Critical; }
            else sev = Math.Max(sev, (short)2);
            if (lastObs == null || anc.Date > lastObs.Date) lastObs = anc;
        }
        if (ev.Count == 0) return null;
        return new RuleSignal
        {
            RuleId = "HEM-05",
            Status = status,
            Severity = sev,
            Title = string.Join(" va ", new[] { plt?.Value < 150m ? "Trombotsitopeniya" : null, anc?.Value < 1.5m ? "neytropeniya" : null }.Where(x => x != null)),
            Message = string.Join("; ", parts) + ".",
            Recommendation = status == RuleStatus.Critical
                ? "ANC <0.5 — og'ir infeksiya xavfi bo'yicha shoshilinch baholash."
                : "PLT past bo'lsa EDTA-artefaktni tekshiring; trend va klinik kontekst bilan baholang.",
            Evidence = ev,
            LatestAnalysisId = lastObs!.AnalysisId,
            ObservedAt = lastObs.Date,
        };
    }

    /// <summary>THY-01 — Birlamchi gipotireoz (NICE NG145).</summary>
    private static RuleSignal? Thy01(PatientLabContext c)
    {
        var tsh = c.Latest("tsh");
        if (tsh?.Value is not { } tv || c.Uln(tsh) is not { } uln || tv <= uln) return null;
        var ft4 = c.Near("free_t4", tsh.Date, 30);
        var ev = new List<Evidence> { c.Ev(tsh, uln, ">", c.RefSource(tsh, true)) };
        string status, title;
        short sev;
        var missing = new List<string>();
        if (ft4 == null)
        {
            (status, title, sev) = (RuleStatus.Suspected, "TSH yuqori — erkin T4 yo'q", (short)1);
            missing.Add("Erkin T4");
        }
        else if (c.Lln(ft4) is { } lln && ft4.Value < lln)
        {
            ev.Add(c.Ev(ft4, lln, "<", c.RefSource(ft4, false)));
            (status, title, sev) = (RuleStatus.CriteriaMet, "Birlamchi gipotireozga mos gormonal profil", (short)2);
        }
        else
        {
            ev.Add(c.Ev(ft4));
            (status, title, sev) = (RuleStatus.Suspected, "Subklinik gipotireozga mos", (short)1);
        }
        // TSH ≥10 3 oy farq bilan ikki marta
        var high10 = c.Series("tsh").Where(o => o.Value >= 10m).ToList();
        Dictionary<string, object?>? temporal = null;
        if (high10.Count >= 2 && (high10[^1].Date - high10[0].Date).TotalDays >= 90)
            temporal = new() { ["tsh_ge_10_twice_3m"] = true, ["first"] = high10[0].Date, ["last"] = high10[^1].Date };
        missing.Add("Homiladorlik, gipofiz kasalligi, biotin va dorilar");
        return new RuleSignal
        {
            RuleId = "THY-01",
            Status = status,
            Severity = sev,
            Title = title,
            Message = $"TSH {N(tv)} µIU/mL > {N(uln)} ({D(tsh.Date)})" +
                      (ft4 != null ? $", erkin T4 {N(ft4.Value)} pmol/L" : "") + "." +
                      (temporal != null ? " TSH ≥10 — 3 oy farq bilan ikki marta (NICE: davolashni ko'rib chiqish)." : ""),
            Recommendation = "Endokrinolog bilan baholang; TSH va FT4 ni laboratoriya referensi bilan qayta tekshiring.",
            Evidence = ev,
            Temporal = temporal,
            Missing = missing,
            LatestAnalysisId = tsh.AnalysisId,
            ObservedAt = tsh.Date,
        };
    }

    /// <summary>THY-02 — Gipertireoz / tireotoksikoz.</summary>
    private static RuleSignal? Thy02(PatientLabContext c)
    {
        var tsh = c.Latest("tsh");
        if (tsh?.Value is not { } tv || c.Lln(tsh) is not { } lln || tv >= lln) return null;
        var ev = new List<Evidence> { c.Ev(tsh, lln, "<", c.RefSource(tsh, false)) };
        var high = false;
        foreach (var col in new[] { "free_t4", "free_t3" })
        {
            var o = c.Near(col, tsh.Date, 30);
            if (o == null) continue;
            if (c.Uln(o) is { } u && o.Value > u) { ev.Add(c.Ev(o, u, ">", c.RefSource(o, true))); high = true; }
            else ev.Add(c.Ev(o));
        }
        var low01 = c.Series("tsh").Where(o => o.Value < 0.1m).ToList();
        Dictionary<string, object?>? temporal = null;
        if (low01.Count >= 2 && (low01[^1].Date - low01[0].Date).TotalDays >= 60)
            temporal = new() { ["tsh_lt_0_1_persistent"] = true, ["first"] = low01[0].Date, ["last"] = low01[^1].Date };
        return new RuleSignal
        {
            RuleId = "THY-02",
            Status = RuleStatus.Suspected,
            Severity = high ? (short)2 : (short)1,
            Title = high ? "Biokimyoviy tireotoksikozga shubha" : "Subklinik tireotoksikozga shubha",
            Message = $"TSH {N(tv)} µIU/mL < {N(lln)} ({D(tsh.Date)})" +
                      (high ? ", erkin T4/T3 yuqori." : ev.Count > 1 ? ", erkin T4/T3 me'yorda." : ", erkin T4/T3 tekshirilmagan.") +
                      (temporal != null ? " TSH <0.1 qayta past saqlanmoqda." : ""),
            Recommendation = "Sababini tekshiring (Graves kasalligini avtomatik qo'ymang; TRAb tizimda yo'q). Davolanayotgan bemorda qoidalar boshqacha.",
            Evidence = ev,
            Temporal = temporal,
            Missing = ev.Count == 1 ? new List<string> { "Erkin T4 / T3" } : new List<string>(),
            LatestAnalysisId = tsh.AnalysisId,
            ObservedAt = tsh.Date,
        };
    }

    /// <summary>LIV-01 — Jigar fermentlari oshishi.</summary>
    private static RuleSignal? Liv01(PatientLabContext c)
    {
        var ev = new List<Evidence>();
        var ratios = new List<string>();
        decimal maxRatio = 0;
        Obs? latest = null;
        foreach (var col in new[] { "alt", "ast" })
        {
            var o = c.Latest(col);
            if (o?.Value is not { } v || c.Uln(o) is not { } u || u <= 0 || v <= u) continue;
            var r = Math.Round(v / u, 1);
            maxRatio = Math.Max(maxRatio, r);
            ev.Add(c.Ev(o, u, ">", c.RefSource(o, true)));
            ratios.Add($"{c.Name(col)} {N(v)} U/L ({N(r)}×ULN)");
            if (latest == null || o.Date > latest.Date) latest = o;
        }
        var alp = c.Latest("alp");
        var ggt = c.Latest("ggt");
        var cholestatic = alp?.Value is { } av && c.Uln(alp) is { } au && av > au
                          && ggt?.Value is { } gv && c.Uln(ggt) is { } gu && gv > gu;
        if (cholestatic)
        {
            ev.Add(c.Ev(alp!, c.Uln(alp!), ">", c.RefSource(alp!, true)));
            ev.Add(c.Ev(ggt!, c.Uln(ggt!), ">", c.RefSource(ggt!, true)));
            if (latest == null || alp!.Date > latest.Date) latest = alp;
        }
        if (ev.Count == 0) return null;
        // Davomiylik: ALT yoki AST ketma-ket yuqori bo'lgan davr
        DateTime? since = null;
        var alt = c.Series("alt");
        for (var i = alt.Count - 1; i >= 0; i--)
        {
            if (c.Uln(alt[i]) is not { } u || alt[i].Value <= u) break;
            since = alt[i].Date;
        }
        var persistent = since.HasValue && latest != null && (latest.Date - since.Value).TotalDays >= 180;
        var hepato = ratios.Count > 0;
        return new RuleSignal
        {
            RuleId = "LIV-01",
            Status = RuleStatus.Suspected,
            Severity = maxRatio >= 10 ? (short)3 : maxRatio >= 3 || persistent ? (short)2 : (short)1,
            Title = hepato && cholestatic ? "Aralash jigar shikastlanish profili"
                  : hepato ? "Gepatotsellyulyar shikastlanish signali" : "Xolestatik profil ehtimoli",
            Message = string.Join("; ", ratios) + (cholestatic ? $"{(hepato ? "; " : "")}ALP va GGT ULN dan yuqori" : "") + "." +
                      (persistent ? $" ALT {D(since!.Value)} dan beri (>6 oy) yuqori — mutaxassisga yo'llash signali." : ""),
            Recommendation = "INR, albumin, trombotsit, virusli gepatit markerlari va anamnez bilan baholang; ALT oshishi gepatit yoki sirrozni tasdiqlamaydi.",
            Evidence = ev,
            Temporal = since.HasValue ? new() { ["elevated_since"] = since, ["persistent_6m"] = persistent } : null,
            LatestAnalysisId = latest!.AnalysisId,
            ObservedAt = latest.Date,
        };
    }

    /// <summary>LIV-02 — Jigar fibrozi xavfi (FIB-4).</summary>
    private static RuleSignal? Liv02(PatientLabContext c)
    {
        var ast = c.Latest("ast");
        if (ast == null) return null;
        var alt = c.Near("alt", ast.Date, 0);
        var plt = c.Near("plt", ast.Date, 7);
        var age = c.AgeAt(ast.Date);
        if (alt?.Value is not { } altV || plt?.Value is not { } pltV || age is null || altV <= 0 || pltV <= 0) return null;
        var fib4 = Math.Round(age.Value * (double)ast.Value!.Value / ((double)pltV * Math.Sqrt((double)altV)), 2);
        var low = age >= 65 ? 2.0 : 1.3;
        if (fib4 < low) return null;
        var high = fib4 > 2.67;
        var missing = new List<string> { "Metabolik xavf omillari (2-tur diabet, semizlik)", "Elastografiya" };
        if (age < 35) missing.Insert(0, "<35 yoshda FIB-4 aniqligi past");
        return new RuleSignal
        {
            RuleId = "LIV-02",
            Status = high ? RuleStatus.Suspected : RuleStatus.Monitor,
            Severity = high ? (short)2 : (short)1,
            Title = high ? "Ilg'or jigar fibrozi xavfi yuqori (FIB-4)" : "Jigar fibrozi — oraliq xavf (FIB-4)",
            Message = $"FIB-4 = {F(fib4)} (yosh {age}, AST {N(ast.Value)}, ALT {N(altV)}, PLT {N(pltV)}; {D(ast.Date)}). " +
                      $"<{F(low)} past, {F(low)}–2.67 oraliq, >2.67 yuqori xavf.",
            Recommendation = "Elastografiya; o'tkir jigar kasalligida FIB-4 ishlatilmaydi. Xavf omillari bo'lsa 1–2 yilda qayta baholash.",
            Evidence = { c.Ev(ast), c.Ev(alt), c.Ev(plt) },
            Temporal = new() { ["fib4"] = fib4 },
            Missing = missing,
            LatestAnalysisId = ast.AnalysisId,
            ObservedAt = ast.Date,
        };
    }

    /// <summary>PAN-01 — O'tkir pankreatitga shubha (ferment &gt;3×ULN).</summary>
    private static RuleSignal? Pan01(PatientLabContext c)
    {
        foreach (var col in new[] { "lipase", "amylase" })
        {
            var o = c.Latest(col);
            if (o?.Value is not { } v || c.Uln(o) is not { } u || u <= 0 || v <= 3 * u) continue;
            return new RuleSignal
            {
                RuleId = "PAN-01",
                Status = RuleStatus.Suspected,
                Severity = 2,
                Title = "O'tkir pankreatitga shubha (laboratoriya mezoni)",
                Message = $"{c.Name(col)} {N(v)} U/L > 3×ULN ({N(3 * u)}), {D(o.Date)}. O'tkir pankreatit uchun tipik og'riq, ferment >3×ULN va tasviriy tekshiruvdan kamida 2 tasi kerak.",
                Recommendation = "Klinik baholash va tasviriy tekshiruv; lipaza mustaqil tashxis emas.",
                Evidence = { c.Ev(o, 3 * u, ">", c.RefSource(o, true)) },
                Missing = { "Simptomlar (qorin og'rig'i)", "Tasviriy tekshiruv" },
                LatestAnalysisId = o.AnalysisId,
                ObservedAt = o.Date,
            };
        }
        return null;
    }

    // ═══ P2 ═══════════════════════════════════════════════════════════════

    /// <summary>CAR-02 — Yurak yetishmovchiligi ehtimoli (NICE NG106).</summary>
    private static RuleSignal? Car02(PatientLabContext c)
    {
        var o = c.Latest("nt_probnp");
        if (o?.Value is not { } v || v < 400m) return null;
        var urgent = v > 2000m;
        return new RuleSignal
        {
            RuleId = "CAR-02",
            Status = RuleStatus.Suspected,
            Severity = urgent ? (short)3 : (short)2,
            Title = "Yurak yetishmovchiligi ehtimoli (NT-proBNP)",
            Message = $"NT-proBNP {N(v)} pg/mL ({D(o.Date)}). NICE: <400 — ehtimoli kam, 400–2000 — 6 haftada EXOKG, >2000 — 2 haftada mutaxassis/EXOKG.",
            Recommendation = urgent ? "2 hafta ichida mutaxassis ko'rigi va EXOKG." : "6 hafta ichida EXOKG.",
            Evidence = { c.Ev(o, urgent ? 2000m : 400m, urgent ? ">" : "≥", "criterion") },
            Missing = { "Simptomlar", "Buyrak funksiyasi, AF, semizlik va davolanish natijaga ta'sir qiladi" },
            LatestAnalysisId = o.AnalysisId,
            ObservedAt = o.Date,
        };
    }

    /// <summary>LIP-01 — Gipertrigliseridemiya va pankreatit xavfi.</summary>
    private static RuleSignal? Lip01(PatientLabContext c)
    {
        var o = c.Latest("triglycerides");
        if (o?.Value is not { } v || v < 1.7m) return null;
        var (sev, title, thr) = v >= 11.3m ? ((short)3, "Jiddiy gipertrigliseridemiya — pankreatit xavfi", 11.3m)
            : v >= 5.6m ? ((short)2, "Yuqori gipertrigliseridemiya — pankreatit xavfi", 5.6m)
            : ((short)1, "Triglitseridlar oshgan", 1.7m);
        return new RuleSignal
        {
            RuleId = "LIP-01",
            Status = RuleStatus.Suspected,
            Severity = sev,
            Title = title,
            Message = $"Triglitseridlar {N(v)} mmol/L ({D(o.Date)}). ≥1.7 — oshgan, ≥5.6 — pankreatit xavfi, ≥11.3 — jiddiy xavf.",
            Recommendation = v >= 11.3m ? "Tez tibbiy baholash." : "Qayta och qoringa test va ikkilamchi sabablar bahosi; ASCVD xavfini alohida hisoblang.",
            Evidence = { c.Ev(o, thr, "≥", "criterion") },
            LatestAnalysisId = o.AnalysisId,
            ObservedAt = o.Date,
        };
    }

    /// <summary>ELE-02 — Giponatremiya / gipernatremiya.</summary>
    private static RuleSignal? Ele02(PatientLabContext c)
    {
        var o = c.Latest("sodium");
        if (o?.Value is not { } v || (v >= 135m && v <= 145m)) return null;
        var hypo = v < 135m;
        var severe = v <= 125m || v >= 155m;
        // Na <120 yoki >160 — hayot uchun xavfli (L-27)
        var critical = v < 120m || v > 160m;
        return new RuleSignal
        {
            RuleId = "ELE-02",
            Status = critical ? RuleStatus.Critical : RuleStatus.Suspected,
            Severity = severe || critical ? (short)3 : (short)2,
            Title = (hypo ? "Giponatremiya" : "Gipernatremiya") + (critical ? " (og'ir)" : ""),
            Message = $"Natriy {N(v)} mmol/L ({D(o.Date)}). <135 — giponatremiya, >145 — gipernatremiya; " +
                      "<120 yoki >160 — og'ir (kritik).",
            Recommendation = critical
                ? "Shoshilinch klinik baholash: nevrologik simptomlar, volemik holat; korreksiya tezligini nazorat qiling " +
                  "(osmotik demiyelinizatsiya xavfi). Gemoliz/giperglikemiya sababli soxta qiymatni istisno qiling."
                : "Og'irlik, simptomlar, rivojlanish tezligi, glyukoza va osmolyarlik bilan baholang; " +
                  "akut (<48 soat) va surunkali holatni anamnez va eski tahlillar bilan ajrating.",
            Evidence = { critical
                ? c.Ev(o, hypo ? 120m : 160m, hypo ? "<" : ">", "criterion")
                : c.Ev(o, hypo ? 135m : 145m, hypo ? "<" : ">", "criterion") },
            Missing = { "Simptomlar", "Qon osmolyarligi" },
            LatestAnalysisId = o.AnalysisId,
            ObservedAt = o.Date,
        };
    }

    /// <summary>INF-01 — Yallig'lanish / infeksiyaga shubha (referensdan oshish).</summary>
    private static RuleSignal? Inf01(PatientLabContext c)
    {
        var ev = new List<Evidence>();
        Obs? latest = null;
        foreach (var col in new[] { "crp", "procalcitonin", "wbc" })
        {
            var o = c.Latest(col);
            if (o?.Value is not { } v || c.Uln(o) is not { } u || v <= u) continue;
            ev.Add(c.Ev(o, u, ">", c.RefSource(o, true)));
            if (latest == null || o.Date > latest.Date) latest = o;
        }
        if (ev.Count == 0) return null;
        return new RuleSignal
        {
            RuleId = "INF-01",
            Status = RuleStatus.Suspected,
            Severity = 1,
            Title = "Yallig'lanish profili",
            Message = string.Join("; ", ev.Select(e => $"{e.Name} {N(e.Value)} {e.Unit} > {N(e.Threshold)}")) +
                      ". Barcha infeksiyalar uchun yagona CRP/PCT tashxis chegarasi yo'q.",
            Recommendation = "Simptom va manba bilan baholang; PCT ni antibiotik yoki sepsis qarori uchun yakka ishlatmang.",
            Evidence = ev,
            LatestAnalysisId = latest!.AnalysisId,
            ObservedAt = latest.Date,
        };
    }

    /// <summary>
    /// INF-02 — Gepatit B, C va OIV skrining signali. Faqat `result_kind`
    /// (NEGATIVE/POSITIVE/EQUIVOCAL) bo'yicha — "0/1" kodlashga tayanilmaydi
    /// (spetsifikatsiyadagi quality-gate).
    /// </summary>
    private static RuleSignal? Inf02(PatientLabContext c)
    {
        var ev = new List<Evidence>();
        var parts = new List<string>();
        var positive = false;
        Obs? latest = null;
        foreach (var (col, label, next) in new[]
                 {
                     ("hbsag", "HBsAg", "HBV tekshiruv algoritmi"),
                     ("anti_hcv", "Anti-HCV", "HCV RNA bilan tasdiqlash"),
                     ("hiv", "OIV skrining", "tasdiqlovchi algoritm"),
                 })
        {
            var o = c.LatestAny(col);
            if (o?.Kind is not ("POSITIVE" or "EQUIVOCAL")) continue;
            positive |= o.Kind == "POSITIVE";
            ev.Add(c.Ev(o));
            parts.Add($"{label} {(o.Kind == "POSITIVE" ? "REAKTIV" : "SHUBHALI")} ({o.Text ?? o.Kind}, {D(o.Date)}) — {next}");
            if (latest == null || o.Date > latest.Date) latest = o;
        }
        if (ev.Count == 0) return null;
        return new RuleSignal
        {
            RuleId = "INF-02",
            Status = RuleStatus.Suspected,
            Severity = positive ? (short)2 : (short)1,
            Title = positive ? "Skrining reaktiv (gepatit/OIV)" : "Skrining natijasi shubhali",
            Message = string.Join("; ", parts) + ". Bu infeksiya tasdig'i EMAS.",
            Recommendation = "Takroriy yoki tasdiqlovchi tahlillarni test protokoliga ko'ra o'tkazing.",
            Evidence = ev,
            LatestAnalysisId = latest!.AnalysisId,
            ObservedAt = latest.Date,
        };
    }

    /// <summary>COA-01 — Koagulyatsiya buzilishiga shubha.</summary>
    private static RuleSignal? Coa01(PatientLabContext c)
    {
        var ev = new List<Evidence>();
        var parts = new List<string>();
        Obs? latest = null;
        foreach (var col in new[] { "inr", "prothrombin_time", "aptt", "fibrinogen" })
        {
            var o = c.Latest(col);
            if (o?.Value is not { } v) continue;
            var u = c.Uln(o);
            var l = c.Lln(o);
            if (u.HasValue && v > u) { ev.Add(c.Ev(o, u, ">", c.RefSource(o, true))); parts.Add($"{c.Name(col)} {N(v)} > {N(u)}"); }
            else if (l.HasValue && v < l) { ev.Add(c.Ev(o, l, "<", c.RefSource(o, false))); parts.Add($"{c.Name(col)} {N(v)} < {N(l)}"); }
            else continue;
            if (latest == null || o.Date > latest.Date) latest = o;
        }
        var dd = c.Latest("d_dimer");
        if (dd?.Value is { } dv && c.Uln(dd) is { } du && dv > du)
        {
            ev.Add(c.Ev(dd, du, ">", c.RefSource(dd, true)));
            parts.Add($"D-dimer {N(dv)} mg/L > {N(du)} (tromboz tashxisi emas)");
            if (latest == null || dd.Date > latest.Date) latest = dd;
        }
        if (ev.Count == 0) return null;
        return new RuleSignal
        {
            RuleId = "COA-01",
            Status = RuleStatus.Suspected,
            Severity = 1,
            Title = "Koagulogrammada chetlanish",
            Message = string.Join("; ", parts) + ".",
            Recommendation = "Antikoagulyant terapiya, homiladorlik va yoshni hisobga olib baholang; qat'iy cutoff bilan TELA/TChVT qo'ymang.",
            Evidence = ev,
            Missing = { "Antikoagulyant (warfarin/DOAC) qabul qilishi" },
            LatestAnalysisId = latest!.AnalysisId,
            ObservedAt = latest.Date,
        };
    }

    /// <summary>UR-01 — Proteinuriya (24 soatlik oqsil).</summary>
    private static RuleSignal? Ur01(PatientLabContext c)
    {
        var o = c.Latest("daily_protein");
        if (o?.Value is not { } v || v < 150m) return null;
        var nephrotic = v >= 3500m;
        return new RuleSignal
        {
            RuleId = "UR-01",
            Status = RuleStatus.Suspected,
            Severity = nephrotic ? (short)2 : (short)1,
            Title = nephrotic ? "Nefrotik diapazondagi proteinuriya" : "Proteinuriya",
            Message = $"Sutkalik oqsil {N(v)} mg/24 soat ({D(o.Date)}). ≥150 — ortiqcha ajralish, ≥3500 — nefrotik diapazon.",
            Recommendation = "UACR va eGFR; yig'ish to'liqligini tekshiring. Doimiylik (≥3 oy) SBK bahosi uchun muhim.",
            Evidence = { c.Ev(o, nephrotic ? 3500m : 150m, "≥", "criterion") },
            Missing = { "UACR (tizimda yo'q)" },
            LatestAnalysisId = o.AnalysisId,
            ObservedAt = o.Date,
        };
    }

    /// <summary>ONC-01 — Prostata va tuxumdon markerlaridagi og'ish.</summary>
    private static RuleSignal? Onc01(PatientLabContext c)
    {
        var ev = new List<Evidence>();
        Obs? latest = null;
        foreach (var col in new[] { "psa_total", "ca125", "he4" })
        {
            var o = c.Latest(col);
            if (o?.Value is not { } v || c.Uln(o) is not { } u || v <= u) continue;
            ev.Add(c.Ev(o, u, ">", c.RefSource(o, true)));
            if (latest == null || o.Date > latest.Date) latest = o;
        }
        if (ev.Count == 0) return null;
        return new RuleSignal
        {
            RuleId = "ONC-01",
            Status = RuleStatus.Suspected,
            Severity = 1,
            Title = "Onkomarker oshgan",
            Message = string.Join("; ", ev.Select(e => $"{e.Name} {N(e.Value)} {e.Unit} > {N(e.Threshold)}")) +
                      ". Ko'tarilish yoki trend saratonni yakka o'zi tasdiqlamaydi.",
            Recommendation = "Tegishli mutaxassis ko'rigi; PSA yoshga bog'liq, ROMA — menopauza holati bilan.",
            Evidence = ev,
            LatestAnalysisId = latest!.AnalysisId,
            ObservedAt = latest.Date,
        };
    }

    /// <summary>MET-01 — Vitamin D va mineral buzilishlar (laboratoriya referensi bilan).</summary>
    private static RuleSignal? Met01(PatientLabContext c)
    {
        var ev = new List<Evidence>();
        Obs? latest = null;
        foreach (var col in new[] { "vitamin_d", "calcium", "magnesium", "phosphorus" })
        {
            var o = c.Latest(col);
            if (o?.Value is not { } v) continue;
            if (c.Lln(o) is { } l && v < l) ev.Add(c.Ev(o, l, "<", c.RefSource(o, false)));
            else if (c.Uln(o) is { } u && v > u) ev.Add(c.Ev(o, u, ">", c.RefSource(o, true)));
            else continue;
            if (latest == null || o.Date > latest.Date) latest = o;
        }
        if (ev.Count == 0) return null;
        return new RuleSignal
        {
            RuleId = "MET-01",
            Status = RuleStatus.Monitor,
            Severity = 1,
            Title = "Vitamin D / mineral almashinuvi",
            Message = string.Join("; ", ev.Select(e => $"{e.Name} {N(e.Value)} {e.Unit} {e.Comparator} {N(e.Threshold)}")) + ".",
            Recommendation = "Trend va davolashga javobni kuzating; umumiy kalsiyni albumin bilan talqin qiling.",
            Evidence = ev,
            LatestAnalysisId = latest!.AnalysisId,
            ObservedAt = latest.Date,
        };
    }

    // ═══ Yordamchilar ═════════════════════════════════════════════════════

    private static List<string> MissingAdult(PatientLabContext c, DateTime date, bool pregnancy)
    {
        var m = new List<string>();
        if (c.AgeAt(date) is null) m.Add("Bemor yoshi");
        if (pregnancy && c.Male != true) m.Add("Homiladorlik holati");
        return m;
    }

    private static Dictionary<string, object?> Temporal(double days, decimal delta, decimal? previous) => new()
    {
        ["window_days"] = Math.Round(days, 1),
        ["delta_abs"] = Math.Round(delta, 2),
        ["delta_pct"] = previous is > 0 ? Math.Round(delta / previous.Value * 100, 1) : null,
        ["previous_value"] = previous,
    };

    /// <summary>Sana (klinika mintaqasida).</summary>
    private static string D(DateTime utc) => AppTime.ToLocal(utc).ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

    /// <summary>Haqiqiy son (eGFR, FIB-4): nuqtali, ortiqcha nolsiz.</summary>
    private static string F(double v) => v.ToString("0.##", CultureInfo.InvariantCulture);

    /// <summary>Son: ortiqcha nolsiz.</summary>
    private static string N(decimal? v) =>
        v.HasValue ? v.Value.ToString("0.###", CultureInfo.InvariantCulture) : "—";
}
