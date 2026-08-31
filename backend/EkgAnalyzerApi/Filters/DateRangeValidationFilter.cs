using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace EkgAnalyzerApi.Filters;

/// <summary>
/// Sana oralig'i teskari berilgan bo'lsa so'rovni rad etadi (T-019).
/// </summary>
/// <remarks>
/// Ilgari <c>?dateFrom=2026-12-01&amp;dateTo=2026-01-01</c> so'rovi
/// <b>HTTP 200 va bo'sh ro'yxat</b> qaytarardi.
///
/// Foydalanuvchi nuqtai nazaridan bu "bu oraliqda tahlil yo'q" degan
/// ma'noni beradi — aslida u sanani noto'g'ri kiritgan. Klinika
/// ma'lumot yo'qolgan deb o'ylab qo'llab-quvvatlashga murojaat qiladi.
///
/// Tekshiruv har bir kontrollerda alohida yozilmaydi: oraliq
/// <c>dateFrom</c>/<c>dateTo</c> nomlari bilan o'ndan ortiq endpointda
/// qabul qilinadi va yangilari ham qo'shiladi. Global filtr ularning
/// barchasini, shu jumladan kelajakdagilarini ham qamrab oladi.
/// </remarks>
public class DateRangeValidationFilter : IActionFilter
{
    /// <summary>Tekshiriladigan parametr juftliklari.</summary>
    private static readonly (string From, string To)[] Pairs =
    {
        ("dateFrom", "dateTo"),
        ("startDate", "endDate"),
        ("from", "to"),
    };

    public void OnActionExecuting(ActionExecutingContext context)
    {
        foreach (var (fromKey, toKey) in Pairs)
        {
            if (!context.ActionArguments.TryGetValue(fromKey, out var fromValue)) continue;
            if (!context.ActionArguments.TryGetValue(toKey, out var toValue)) continue;

            if (fromValue is not DateTime from || toValue is not DateTime to) continue;
            if (from <= to) continue;

            context.Result = new BadRequestObjectResult(new
            {
                message = "Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas.",
                code = "invalid_date_range",
                field = fromKey,
            });
            return;
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
