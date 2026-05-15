using System.Collections.Concurrent;

namespace EkgAnalyzerApi.Services
{
    public interface IConsultationConnectionService
    {
        void Register(int userId, int clinicId, int roleId, string connectionId);
        void Remove(string connectionId);
        string? GetConnectionId(int userId);
        (int userId, int clinicId, int roleId)? GetUserInfo(string connectionId);
        IEnumerable<string> GetAdminConnectionsForClinic(int clinicId);
        IEnumerable<string> GetDoctorConnections(int doctorUserId);
        bool IsOnline(int userId);
    }

    public class ConsultationConnectionService : IConsultationConnectionService
    {
        // connectionId → (userId, clinicId, roleId)
        private readonly ConcurrentDictionary<string, (int userId, int clinicId, int roleId)> _connToUser = new();
        // userId → connectionId
        private readonly ConcurrentDictionary<int, string> _userToConn = new();

        public void Register(int userId, int clinicId, int roleId, string connectionId)
        {
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
                .Where(kv => kv.Value.clinicId == clinicId
                          && (kv.Value.roleId == 2 || kv.Value.roleId == 3))
                .Select(kv => kv.Key);

        public IEnumerable<string> GetDoctorConnections(int doctorUserId)
        {
            var conn = GetConnectionId(doctorUserId);
            return conn != null ? new[] { conn } : Enumerable.Empty<string>();
        }

        public bool IsOnline(int userId) => _userToConn.ContainsKey(userId);
    }
}
