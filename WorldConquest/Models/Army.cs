using System.Collections.Generic;

namespace WorldConquest.Models
{
    public enum ArmyStatus
    {
        Active,
        Retreating,
        Destroyed
    }

    public class Army
    {
        // Unique army Id
        public string Id { get; set; }

        // Name of the army (optional)
        public string Name { get; set; }

        // Country Id that owns this army
        public string CountryId { get; set; }

        // Province Id where the army is currently located
        public string ProvinceId { get; set; }

        // List of troop/unit Ids in the army
        public List<string> TroopIds { get; set; } = new List<string>();

        // Number of moves left this turn
        public int MovesLeft { get; set; }

        // General Id (optional, null if no general)
        public string? GeneralId { get; set; }

        // Is this army a province garrison
        public bool IsGarrison { get; set; }

        // Status of the army
        public ArmyStatus Status { get; set; }
    }
}