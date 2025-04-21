using System.Threading.Tasks;
using WorldConquest.Models;

namespace WorldConquest.Services
{
    public interface IGameService
    {
        // Start a new game from a lobby
        Task<GameState> StartGame(string lobbyId, string hostPlayerId);
        
        // Get a game state by ID
        Task<GameState> GetGameState(string gameStateId);
        
        // End a player's turn
        Task<GameState> EndPlayerTurn(string playerId, string gameStateId);
        
        // Advance to the next turn
        Task<GameState> AdvanceToNextTurn(string gameStateId);
        
        // Add a chat message
        Task<GameState> AddChatMessage(string playerId, string gameStateId, string message, bool isAllyOnly);
        
        // Save the game state
        Task<bool> SaveGameState(string gameStateId);
        
        // Load a saved game state
        Task<GameState> LoadGameState(string savedGamePath);
    }
}