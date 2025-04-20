using System.Collections.Generic;

namespace WorldConquest.Models
{
    public class Lobby
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<Player> Players { get; set; } = new List<Player>();
        public GameState GameState { get; set; } = new GameState();
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class LobbyInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int PlayerCount { get; set; }
        public bool IsActive { get; set; }
    }
}