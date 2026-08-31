namespace EkgAnalyzerApi.Services;

/// <summary>
/// Sahifalash uchun umumiy yordamchi.
///
/// Nima uchun kerak: ilgari <c>page</c> va <c>pageSize</c> qiymatlari
/// tekshirilmasdan to'g'ridan-to'g'ri <c>Skip()/Take()</c> ga uzatilardi.
/// Natijada <c>?page=0</c> yoki <c>?pageSize=-10</c> so'rovi PostgreSQL
/// darajasida xatolik chiqarib, mijozga to'liq SQL stack trace qaytarardi.
/// Bundan tashqari <c>pageSize</c> ga yuqori chegara yo'q edi — bitta so'rov
/// bilan butun jadvalni xotiraga tortish mumkin edi.
/// </summary>
public static class Paging
{
    /// <summary>Bir sahifada qaytariladigan maksimal yozuvlar soni.</summary>
    public const int MaxPageSize = 100;

    /// <summary>Sukut bo'yicha sahifa hajmi.</summary>
    public const int DefaultPageSize = 10;

    /// <summary>Sahifa raqami va hajmini xavfsiz oraliqqa keltiradi.</summary>
    public static (int Page, int PageSize) Normalize(int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = DefaultPageSize;
        if (pageSize > MaxPageSize) pageSize = MaxPageSize;
        return (page, pageSize);
    }

    /// <summary>
    /// So'rovga sahifalashni qo'llaydi. Kiruvchi qiymatlar avtomatik
    /// normallashtiriladi, shuning uchun manfiy yoki nol qiymat xatolik bermaydi.
    /// </summary>
    public static IQueryable<T> ApplyPaging<T>(this IQueryable<T> query, int page, int pageSize)
    {
        var (p, size) = Normalize(page, pageSize);
        return query.Skip((p - 1) * size).Take(size);
    }
}
