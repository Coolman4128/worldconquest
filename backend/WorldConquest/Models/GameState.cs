using System.Collections.Generic;

namespace WorldConquest.Models
{
    public class GameState
    {
        public Dictionary<string, Province> Provinces { get; set; } = new Dictionary<string, Province>();
        public List<Player> Players { get; set; } = new List<Player>();
        public List<Country> Countries { get; set; } = new List<Country>();
        public int Year { get; set; } = 1100;
        public string CurrentTurn { get; set; } = string.Empty;
    }
}