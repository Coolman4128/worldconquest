using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class Lobby
    {
        // Lobby ID
        public string Id { get; set; }
        
        // Lobby name
        public string Name { get; set; }
        
        // Host player ID
        public string HostId { get; set; }
        
        // Players in the lobby
        public List<Player> Players { get; set; } = new List<Player>();
        
        // Maximum number of players
        public int MaxPlayers { get; set; }
        
        // Is the lobby password protected
        public bool IsPasswordProtected { get; set; }
        
        // Lobby password (not sent to clients)
        [JsonIgnore]
        public string Password { get; set; }
        
        // Is the game in progress
        public bool IsGameStarted { get; set; }
        
        // Game state ID associated with this lobby
        public string GameStateId { get; set; }
        
        // Creation time
        public DateTime CreatedAt { get; set; }
        
        // Last activity time
        public DateTime LastActivity { get; set; }
        
        public Lobby()
        {
            // Default constructor for serialization
        }
        
        public Lobby(string id, string name, string hostId, int maxPlayers = 8, bool isPasswordProtected = false, string password = null)
        {
            Id = id;
            Name = name;
            HostId = hostId;
            MaxPlayers = maxPlayers;
            IsPasswordProtected = isPasswordProtected;
            Password = password;
            IsGameStarted = false;
            CreatedAt = DateTime.UtcNow;
            LastActivity = DateTime.UtcNow;
        }
        
        // Add a player to the lobby
        public bool AddPlayer(Player player)
        {
            if (Players.Count >= MaxPlayers)
            {
                return false;
            }
            
            Players.Add(player);
            LastActivity = DateTime.UtcNow;
            return true;
        }
        
        // Remove a player from the lobby
        public bool RemovePlayer(string playerId)
        {
            int index = Players.FindIndex(p => p.Id == playerId);
            if (index == -1)
            {
                return false;
            }
            
            Players.RemoveAt(index);
            
            // If the host left, assign a new host
            if (playerId == HostId && Players.Count > 0)
            {
                HostId = Players[0].Id;
            }
            
            LastActivity = DateTime.UtcNow;
            return true;
        }
        
        // Check if all players are ready
        public bool AreAllPlayersReady()
        {
            return Players.Count > 0 && Players.TrueForAll(p => p.IsReady);
        }
        
        // Start the game
        public void StartGame(string gameStateId)
        {
            IsGameStarted = true;
            GameStateId = gameStateId;
            LastActivity = DateTime.UtcNow;
        }
        
        // Check if all players have finished their turn
        public bool HaveAllPlayersFinishedTurn()
        {
            return Players.Count > 0 && Players.TrueForAll(p => p.HasFinishedTurn);
        }
        
        // Reset turn status for all players
        public void ResetTurnStatus()
        {
            foreach (var player in Players)
            {
                player.ResetTurn();
            }
            LastActivity = DateTime.UtcNow;
        }
    }
}