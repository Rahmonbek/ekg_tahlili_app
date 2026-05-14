using System.Collections.Concurrent;

namespace EkgAnalyzerApi.Services
{
    public interface IVideoCallConnectionService
    {
        void Register(int userId, int clinicId, int roleId, string connectionId);
        void Remove(string connectionId);
        string? GetConnectionId(int userId);
        (int userId, int clinicId, int roleId)? GetUserInfo(string connectionId);
        IEnumerable<string> GetAdminConnectionsForClinic(int clinicId);
        bool IsOnline(int userId);
    }

    public class VideoCallConnectionService : IVideoCallConnectionService
    {
        // connectionId → (userId, clinicId, roleId)
        private readonly ConcurrentDictionary<string, (int userId, int clinicId, int roleId)> _connToUser = new();
        // userId → connectionId (son connection saqlanadi, yangi boshqasini almashtiradi)
        private readonly ConcurrentDictionary<int, string> _userToConn = new();

        public void Register(int userId, int clinicId, int roleId, string connectionId)
        {
            // Avvalgi connection bo'lsa olib tashla
            if (_userToConn.TryGetValue(userId, out var oldConn))
                _connToUser.TryRemove(oldConn, out _);

            _connToUser[connectionId] = (userId, clinicId, roleId);
            _userToConn[userId] = connectionId;
        }

        public void Remove(string connectionId)
        {
            if (_connToUser.TryRemove(connectionId, out var info))
                _userToConn.TryRemove(info.userId, out _);
        }

        public string? GetConnectionId(int userId) =>
            _userToConn.TryGetValue(userId, out var conn) ? conn : null;

        public (int userId, int clinicId, int roleId)? GetUserInfo(string connectionId) =>
            _connToUser.TryGetValue(connectionId, out var info) ? info : null;

        public IEnumerable<string> GetAdminConnectionsForClinic(int clinicId) =>
            _connToUser
                .Where(kv => kv.Value.clinicId == clinicId && (kv.Value.roleId == 2 || kv.Value.roleId == 3))
                .Select(kv => kv.Key);

        public bool IsOnline(int userId) => _userToConn.ContainsKey(userId);
    }
}
