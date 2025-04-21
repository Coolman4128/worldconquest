using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WorldConquest.Models;

namespace WorldConquest.Services
{
    public class LobbyService : ILobbyService
    {
        private readonly Dictionary<string, Lobby> _lobbies = new Dictionary<string, Lobby>();
        
        public Task<Lobby> CreateLobby(Player host, string lobbyName, int maxPlayers, bool isPasswordProtected, string password)
        {
            // Generate a unique ID for the lobby
            string lobbyId = Guid.NewGuid().ToString();
            
            // Create the lobby
            var lobby = new Lobby(lobbyId, lobbyName, host.Id, maxPlayers, isPasswordProtected, password);
            
            // Add the host to the lobby
            lobby.AddPlayer(host);
            
            // Store the lobby
            _lobbies[lobbyId] = lobby;
            
            return Task.FromResult(lobby);
        }
        
        public Task<Lobby> JoinLobby(Player player, string lobbyId, string password)
        {
            // Check if the lobby exists
            if (!_lobbies.TryGetValue(lobbyId, out var lobby))
            {
                throw new Exception("Lobby not found");
            }
            
            // Check if the game has already started
            if (lobby.IsGameStarted)
            {
                throw new Exception("Game has already started");
            }
            
            // Check if the lobby is full
            if (lobby.Players.Count >= lobby.MaxPlayers)
            {
                throw new Exception("Lobby is full");
            }
            
            // Check if the password is correct
            if (lobby.IsPasswordProtected && password != lobby.Password)
            {
                throw new Exception("Incorrect password");
            }
            
            // Add the player to the lobby
            lobby.AddPlayer(player);
            
            return Task.FromResult(lobby);
        }
        
        public Task<Lobby> LeaveLobby(string playerId, string lobbyId)
        {
            // Check if the lobby exists
            if (!_lobbies.TryGetValue(lobbyId, out var lobby))
            {
                throw new Exception("Lobby not found");
            }
            
            // Remove the player from the lobby
            lobby.RemovePlayer(playerId);
            
            // If the lobby is empty, remove it
            if (lobby.Players.Count == 0)
            {
                _lobbies.Remove(lobbyId);
            }
            
            return Task.FromResult(lobby);
        }
        
        public Task<List<Lobby>> GetPublicLobbies()
        {
            // Return all non-started lobbies without sensitive information
            var publicLobbies = _lobbies.Values
                .Where(l => !l.IsGameStarted)
                .Select(l => new Lobby
                {
                    Id = l.Id,
                    Name = l.Name,
                    HostId = l.HostId,
                    MaxPlayers = l.MaxPlayers,
                    IsPasswordProtected = l.IsPasswordProtected,
                    Players = l.Players.Select(p => new Player
                    {
                        Id = p.Id,
                        Name = p.Name,
                        IsReady = p.IsReady
                    }).ToList(),
                    CreatedAt = l.CreatedAt
                })
                .ToList();
            
            return Task.FromResult(publicLobbies);
        }
        
        public Task<Lobby> GetLobby(string lobbyId)
        {
            // Check if the lobby exists
            if (!_lobbies.TryGetValue(lobbyId, out var lobby))
            {
                throw new Exception("Lobby not found");
            }
            
            return Task.FromResult(lobby);
        }
        
        public Task<Lobby> SetPlayerReady(string playerId, string lobbyId, bool isReady)
        {
            // Check if the lobby exists
            if (!_lobbies.TryGetValue(lobbyId, out var lobby))
            {
                throw new Exception("Lobby not found");
            }
            
            // Find the player
            var player = lobby.Players.FirstOrDefault(p => p.Id == playerId);
            if (player == null)
            {
                throw new Exception("Player not found in lobby");
            }
            
            // Update the player's ready status
            player.IsReady = isReady;
            
            return Task.FromResult(lobby);
        }
        
        public Task HandlePlayerDisconnect(string playerId)
        {
            // Find all lobbies the player is in
            var playerLobbies = _lobbies.Values.Where(l => l.Players.Any(p => p.Id == playerId)).ToList();
            
            foreach (var lobby in playerLobbies)
            {
                // If the game hasn't started, remove the player
                if (!lobby.IsGameStarted)
                {
                    lobby.RemovePlayer(playerId);
                    
                    // If the lobby is empty, remove it
                    if (lobby.Players.Count == 0)
                    {
                        _lobbies.Remove(lobby.Id);
                    }
                }
                else
                {
                    // If the game has started, mark the player as disconnected
                    var player = lobby.Players.FirstOrDefault(p => p.Id == playerId);
                    if (player != null)
                    {
                        player.SetConnectionStatus(false);
                    }
                }
            }
            
            return Task.CompletedTask;
        }
    }
}