using System;
using System.Collections.Generic;

namespace WorldConquest.Models
{
    public class GameState
    {
        public string GameId { get; set; }
        public List<Player> Players { get; set; }
        public List<Country> Countries { get; set; }
        public List<Province> Provinces { get; set; }
        public List<DiplomaticRelation> DiplomaticRelations { get; set; }
        public DateTime CurrentDate { get; set; }
        public string CurrentTurnPlayerId { get; set; }
        public List<Army> Armies { get; set; }
    }
}