using System.Security.Claims;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.SignalR;

namespace EkgAnalyzerApi.Hubs;

public class AnalysisHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var claim = Context.User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(claim, out var userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, AnalysisProgressTracker.UserGroup(userId));

        await base.OnConnectedAsync();
    }
}
