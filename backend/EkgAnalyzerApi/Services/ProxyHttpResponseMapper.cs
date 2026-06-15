using Microsoft.AspNetCore.Mvc;

namespace EkgAnalyzerApi.Services
{
    public static class ProxyHttpResponseMapper
    {
        public static async Task<ContentResult> ToContentResultAsync(HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();
            return new ContentResult
            {
                StatusCode = (int)response.StatusCode,
                Content = content,
                ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json"
            };
        }
    }
}
