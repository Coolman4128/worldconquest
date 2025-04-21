using System.Collections.Generic;
using System.Threading.Tasks;
using WorldConquest.Models;

namespace WorldConquest.Services
{
    public interface ILobbyService
    {
        // Create a new lobby
        Task<Lobby> CreateLobby(Player host, string lobbyName, int maxPlayers, bool isPasswordProtected, string password);
        
        // Join an existing lobby
        Task<Lobby> JoinLobby(Player player, string lobbyId, string password);
        
        // Leave a lobby
        Task<Lobby> LeaveLobby(string playerId, string lobbyId);
        
        // Get all public lobbies
        Task<List<Lobby>> GetPublicLobbies();
        
        // Get a specific lobby by ID
        Task<Lobby> GetLobby(string lobbyId);
        
        // Set a player's ready status
        Task<Lobby> SetPlayerReady(string playerId, string lobbyId, bool isReady);
        
        // Handle player disconnection
        Task HandlePlayerDisconnect(string playerId);
    }
}