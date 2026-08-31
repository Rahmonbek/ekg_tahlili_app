/**
 * AI javobini xavfsiz o'qish (T-034).
 *
 * Ilgari bu funksiya to'rtta natija komponentida `safeJsonParse` nomi
 * bilan **so'zma-so'z takrorlangan** edi. Bitta xatoni tuzatish uchun
 * to'rt joyni o'zgartirish kerak bo'lardi — va amalda ular allaqachon
 * bir-biridan farq qila boshlagandi.
 *
 * Nima uchun oddiy `JSON.parse` yetarli emas
 * -----------------------------------------
 * `ai_answer_data` ustuni matn sifatida saqlanadi va uning ichidagi
 * qiymat har doim ham toza JSON emas:
 *
 * * model javobni ```` ``` ```` ichiga o'rab yuborishi mumkin;
 * * matn ichidagi haqiqiy satr ko'chirish belgilari JSON uchun
 *   noto'g'ri — ular `\n` ga aylantirilishi kerak;
 * * eski yozuvlarda umuman JSON bo'lmagan oddiy matn ham uchraydi.
 *
 * Oxirgi holatda funksiya **istisno tashlamaydi**, xom matnni
 * qaytaradi: shifokor uchun "hech narsa yo'q" dan ko'ra "formatlanmagan
 * matn" yaxshiroq.
 */
export function parseAiResult(raw) {
    if (!raw) return null;
    if (typeof raw !== 'object' && typeof raw !== 'string') return null;
    if (typeof raw !== 'string') return raw;

    try {
        let cleaned = raw.trim();

        // Haqiqiy satr ko'chirishlarni JSON belgilariga aylantiramiz,
        // so'ng ularni butunlay olib tashlaymiz — model ba'zan JSON
        // ichida chiroyli formatlash uchun ishlatadi.
        cleaned = cleaned
            .replace(/\r\n/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            .replaceAll('\\n', '');

        // ```json ... ``` yoki ` ... ` ichiga o'ralgan javob
        const fenced = cleaned.match(/^```(?:json)?(.*)```$/s);
        if (fenced) {
            cleaned = fenced[1].trim();
        } else if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
            cleaned = cleaned.slice(1, -1);
        }

        return JSON.parse(cleaned);
    } catch (e) {
        // Xom matnni qaytaramiz — komponent uni ko'rsata oladi
        console.error('AI javobini o\'qib bo\'lmadi:', e);
        return raw;
    }
}

export default parseAiResult;
