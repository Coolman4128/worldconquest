using System.Collections.Concurrent;
using WorldConquest.Models;

namespace WorldConquest.Services
{
    public class LobbyService : ILobbyService
    {
        private readonly ConcurrentDictionary<string, Lobby> _lobbies = new ConcurrentDictionary<string, Lobby>();
        private readonly IGameStateService _gameStateService;

        public LobbyService(IGameStateService gameStateService)
        {
            _gameStateService = gameStateService;
        }

        public async Task<List<LobbyInfo>> GetLobbiesAsync()
        {
            return _lobbies.Values
                .Where(l => l.IsActive)
                .Select(l => new LobbyInfo
                {
                    Id = l.Id,
                    Name = l.Name,
                    PlayerCount = l.Players.Count,
                    IsActive = l.IsActive
                })
                .ToList();
        }

        public async Task<Lobby?> GetLobbyAsync(string lobbyId)
        {
            if (_lobbies.TryGetValue(lobbyId, out var lobby) && lobby.IsActive)
            {
                return lobby;
            }
            return null;
        }

        public async Task<Lobby> CreateLobbyAsync(string name)
        {
            var lobbyId = Guid.NewGuid().ToString("N");
            var lobby = new Lobby
            {
                Id = lobbyId,
                Name = string.IsNullOrWhiteSpace(name) ? $"Lobby {lobbyId.Substring(0, 6)}" : name,
                GameState = await _gameStateService.CreateDefaultGameStateAsync()
            };

            _lobbies[lobbyId] = lobby;
            return lobby;
        }

        public async Task<Lobby?> JoinLobbyAsync(string lobbyId, Player player)
        {
            if (_lobbies.TryGetValue(lobbyId, out var lobby) && lobby.IsActive)
            {
                // Assign a color to the player if not already assigned
                if (string.IsNullOrEmpty(player.Color))
                {
                    var availableColors = new[] { "red", "green", "blue" };
                    var usedColors = lobby.Players.Select(p => p.Color).ToList();
                    player.Color = availableColors.FirstOrDefault(c => !usedColors.Contains(c)) ?? "gray";
                }

                // Add player to the lobby
                lobby.Players.Add(player);
                
                // Add player to the game state
                lobby.GameState.Players.Add(player);
                
                return lobby;
            }
            return null;
        }

        public async Task<bool> LeaveLobbyAsync(string lobbyId, string playerId)
        {
            if (_lobbies.TryGetValue(lobbyId, out var lobby) && lobby.IsActive)
            {
                var player = lobby.Players.FirstOrDefault(p => p.Id == playerId);
                if (player != null)
                {
                    lobby.Players.Remove(player);
                    lobby.GameState.Players.RemoveAll(p => p.Id == playerId);
                    
                    // Close the lobby if no players are left
                    if (lobby.Players.Count == 0)
                    {
                        await CloseLobbyAsync(lobbyId);
                    }
                    
                    return true;
                }
            }
            return false;
        }

        public async Task<bool> CloseLobbyAsync(string lobbyId)
        {
            if (_lobbies.TryGetValue(lobbyId, out var lobby))
            {
                lobby.IsActive = false;
                return true;
            }
            return false;
        }
    }
}