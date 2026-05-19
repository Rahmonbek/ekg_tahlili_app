using System.Collections.Concurrent;

namespace EkgAnalyzerApi.Services
{
    public interface IConsultationConnectionService
    {
        void Register(int userId, int clinicId, int roleId, string connectionId);
        void Remove(string connectionId);
        IEnumerable<string> GetConnectionIds(int userId);
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
        private readonly ConcurrentDictionary<int, ConcurrentDictionary<string, byte>> _userToConns = new();

        public void Register(int userId, int clinicId, int roleId, string connectionId)
        {
            _connToUser[connectionId] = (userId, clinicId, roleId);
            var connections = _userToConns.GetOrAdd(userId, _ => new ConcurrentDictionary<string, byte>());
            connections[connectionId] = 0;
        }

        public void Remove(string connectionId)
        {
            if (_connToUser.TryRemove(connectionId, out var info) &&
                _userToConns.TryGetValue(info.userId, out var connections))
            {
                connections.TryRemove(connectionId, out _);
                if (connections.IsEmpty)
                    _userToConns.TryRemove(info.userId, out _);
            }
        }

        public IEnumerable<string> GetConnectionIds(int userId) =>
            _userToConns.TryGetValue(userId, out var connections)
                ? connections.Keys
                : Enumerable.Empty<string>();

        public (int userId, int clinicId, int roleId)? GetUserInfo(string connectionId) =>
            _connToUser.TryGetValue(connectionId, out var info) ? info : null;

        public IEnumerable<string> GetAdminConnectionsForClinic(int clinicId) =>
            _connToUser
                .Where(kv => kv.Value.clinicId == clinicId
                          && (kv.Value.roleId == 2 || kv.Value.roleId == 3))
                .Select(kv => kv.Key);

        public IEnumerable<string> GetDoctorConnections(int doctorUserId)
        {
            return GetConnectionIds(doctorUserId);
        }

        public bool IsOnline(int userId) => _userToConns.ContainsKey(userId);
    }
}
