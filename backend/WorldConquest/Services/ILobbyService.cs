using WorldConquest.Models;

namespace WorldConquest.Services
{
    public interface ILobbyService
    {
        Task<List<LobbyInfo>> GetLobbiesAsync();
        Task<Lobby?> GetLobbyAsync(string lobbyId);
        Task<Lobby> CreateLobbyAsync(string name);
        Task<Lobby?> JoinLobbyAsync(string lobbyId, Player player);
        Task<bool> LeaveLobbyAsync(string lobbyId, string playerId);
        Task<bool> CloseLobbyAsync(string lobbyId);
    }
}