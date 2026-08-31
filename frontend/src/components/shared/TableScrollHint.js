import { useEffect } from 'react';

/**
 * Gorizontal aylantiriladigan jadvallarni belgilaydi.
 *
 * Muammo
 * ------
 * 375 px ekranda EKG ro'yxati jadvali 1461 px, konteyner esa 335 px.
 * Ustunlarning to'rtdan uch qismi — jumladan "AI xulosasi" va
 * "Tahlil holati" — o'ngda, ko'rinmaydigan joyda qoladi. Aylantirish
 * ishlaydi, lekin **buni bilib bo'lmaydi**: foydalanuvchi jadval shu
 * bilan tugaydi deb o'ylaydi.
 *
 * Nima uchun faqat CSS yetarli emas
 * ---------------------------------
 * `background-attachment: local` usuli aylantirish soyasini
 * JavaScript'siz beradi, lekin bu yerda ishlamaydi: soya aylantirish
 * konteynerining **foni**, jadval qatorlari esa uning ustida o'z oq
 * foni bilan chiziladi va soyani butunlay berkitadi.
 *
 * Shuning uchun kichik kuzatuvchi: konteyner kontenti sig'masa,
 * o'ramga `has_scroll` klassi qo'yiladi va CSS uning ustida
 * (`::after`) soya chizadi.
 *
 * Kuzatuv global — har bir ro'yxat sahifasiga alohida qo'shish shart
 * emas. Yangi jadval qo'shilganda ham o'zi ishlaydi.
 */
export default function TableScrollHint() {
    useEffect(() => {
        let frame = 0;

        // Qaysi konteynerlarga hodisa allaqachon bog'langani
        const wired = new WeakSet();

        const measure = (box) => {
            const wrapper = box.closest('.ant-table-wrapper');
            if (!wrapper) return;
            // 2 px — brauzerlarning yaxlitlash farqi uchun zaxira
            const scrollable = box.scrollWidth - box.clientWidth > 2;
            wrapper.classList.toggle('has_scroll', scrollable);
            wrapper.classList.toggle(
                'scrolled_end',
                scrollable && box.scrollLeft + box.clientWidth >= box.scrollWidth - 2,
            );
        };

        const update = () => {
            document.querySelectorAll('.ant-table-content, .ant-table-body')
                .forEach((box) => {
                    // `scroll` hodisasi ko'pikka chiqmaydi va hujjat
                    // darajasidagi tinglash har doim ham o'z vaqtida
                    // yetib kelmaydi — shuning uchun har bir konteynerga
                    // bevosita bog'lanamiz (bir marta).
                    if (!wired.has(box)) {
                        wired.add(box);
                        box.addEventListener('scroll', () => measure(box), { passive: true });
                    }
                    measure(box);
                });
        };

        // Bir kadrga birlashtiramiz: DOM o'zgarishlari to'p-to'p keladi
        // va har biriga alohida hisoblash bekorga ish bo'lardi
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        };

        schedule();

        const mo = new MutationObserver(schedule);
        mo.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('resize', schedule);

        return () => {
            cancelAnimationFrame(frame);
            mo.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, []);

    return null;
}
