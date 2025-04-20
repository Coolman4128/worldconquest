using WorldConquest.Models;

namespace WorldConquest.Services
{
    public interface IGameStateService
    {
        Task<GameState> CreateDefaultGameStateAsync();
        Task<GameState?> GetGameStateAsync(string lobbyId);
        Task<bool> UpdateGameStateAsync(string lobbyId, GameState gameState);
        Task<bool> AdvanceTurnAsync(string lobbyId);
        Task<bool> AdvanceYearAsync(string lobbyId);
    }
}