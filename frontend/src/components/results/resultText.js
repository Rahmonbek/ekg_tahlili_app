/**
 * AI natija matnini o'qishga qulay bo'laklarga ajratish.
 *
 * AI xulosasi va tavsiyalari bitta uzun paragraf bo'lib kelardi —
 * shifokor 5–6 ta topilmani bitta matndan ajratib o'qishga majbur edi.
 * Bu yerdagi funksiyalar matnni o'zgartirmaydi, faqat bo'laklarga
 * ajratadi; ajratib bo'lmasa matn butunligicha qaytadi.
 */

// Vaqt yoki vaqt oralig'i: "03:02", "10:27–11:27", "10.27-11.27"
const TIME = String.raw`\d{1,2}[:.]\d{2}(?:\s*[–—-]\s*\d{1,2}[:.]\d{2})?`;
const TIME_RE = new RegExp(TIME);
const TIME_RE_G = new RegExp(TIME, 'g');

// Bo'laklarni ajratuvchilar: vergul, nuqtali vergul, "va" / "и" / "and"
const PART_SEPARATOR = /\s*[,;]\s+|\s+(?:va|hamda|и|and)\s+/i;

/**
 * Matnni gaplarga ajratadi. Gap oxiri — `.`, `!` yoki `?` dan keyin
 * bo'sh joy va katta harf (yoki raqam/qo'shtirnoq). Kasr sonlar
 * ("5.5 mg/dL") va qisqartmalar ichida bo'sh joy bo'lmagani uchun
 * bo'linmaydi. Qator ko'chishi ham ajratuvchi hisoblanadi.
 */
export function splitSentences(text) {
    if (!text || typeof text !== 'string') return [];
    return text
        .replace(/([.!?])\s+(?=[A-ZА-ЯЁЎҚҒҲO‘«"(0-9])/g, '$1\n')
        .split(/\n+/)
        .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
        .filter(Boolean);
}

/** Bo'lakdan vaqtni va topilmani ajratadi: "20:27–21:27 da 1 ta" → {time, finding}. */
function toEpisode(part) {
    const match = part.match(TIME_RE);
    if (!match) return null;
    const time = match[0].replace(/\s*[–—-]\s*/, '–');
    const finding = (part.slice(0, match.index) + ' ' + part.slice(match.index + match[0].length))
        .replace(/^\s*(?:da|dan|gacha|в|at|soat)\b\s*/i, '')   // "… da 1 ta" → "1 ta"
        .replace(/\s+(?:da|в|at)\s*$/i, '')
        .replace(/\(\s*\)/g, '')                               // "(21:01)" dan qolgan bo'sh qavs
        .replace(/^[\s:,—–-]+|[\s.,;:]+$/g, '')
        .replace(/\s{2,}/g, ' ');
    return { time, finding: finding || '—' };
}

/**
 * ESKI yozuvlar uchun zaxira: AI vaqtlarni bitta gapga vergul bilan
 * tizgan bo'lsa ("… qayd etildi: 20:27–21:27 da 1 ta, 10:27–11:27 da
 * 5 ta va 18:27–19:27 da 4 ta."), ularni alohida epizodlarga ajratadi.
 *
 * Faqat ISHONCHLI holatda ajratadi: gapda kamida ikkita vaqt bor va
 * bo'linganda HAR BIR bo'lakda vaqt bor. Aks holda gap o'zgarishsiz
 * qoladi — noto'g'ri bo'lingan tibbiy matndan ko'ra butun matn yaxshi.
 *
 * Qaytaradi: `{ sentences, groups }` — `groups`: `[{ intro, episodes }]`.
 */
export function extractEpisodeGroups(text) {
    const sentences = splitSentences(text);
    const rest = [];
    const groups = [];

    sentences.forEach((sentence) => {
        const times = sentence.match(TIME_RE_G) || [];
        if (times.length < 2) {
            rest.push(sentence);
            return;
        }
        const firstTime = sentence.search(TIME_RE);
        const colon = sentence.lastIndexOf(':', firstTime);
        // "…: 20:27" dagi ikki nuqta vaqtning o'zi emas, kirish qismi tugashi
        const intro = colon > 0 && !/\d$/.test(sentence.slice(0, colon))
            ? sentence.slice(0, colon).trim()
            : '';
        const body = (intro ? sentence.slice(colon + 1) : sentence).replace(/[.\s]+$/, '');
        const parts = body.split(PART_SEPARATOR).map((p) => p.trim()).filter(Boolean);
        const episodes = parts.map(toEpisode);

        if (parts.length >= 2 && episodes.every(Boolean)) {
            groups.push({ intro, episodes });
        } else {
            rest.push(sentence);
        }
    });

    return { sentences: rest, groups };
}
