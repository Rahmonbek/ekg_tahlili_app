using System.Security.Claims;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.SignalR;

namespace EkgAnalyzerApi.Hubs;

public class AnalysisHub : Hub
{
    private readonly AnalysisProgressTracker _tracker;

    public AnalysisHub(AnalysisProgressTracker tracker)
    {
        _tracker = tracker;
    }

    private int? CurrentUserId()
    {
        var claim = Context.User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var userId) ? userId : (int?)null;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = CurrentUserId();
        if (userId.HasValue)
            await Groups.AddToGroupAsync(Context.ConnectionId, AnalysisProgressTracker.UserGroup(userId.Value));

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Mijoz ulanganda/qayta ulanganda joriy (yuklanayotgan va yaqinda tugagan)
    /// tahlillar ro'yxatini qaytaradi. Frontend sahifa yangilangandan keyin
    /// yoki uzilishdan keyin holatni shu orqali tiklaydi.
    /// </summary>
    public IReadOnlyList<object> SyncPending()
    {
        var userId = CurrentUserId();
        return userId.HasValue
            ? _tracker.GetPendingForUser(userId.Value)
            : new List<object>();
    }
}
