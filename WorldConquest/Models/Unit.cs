using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class Unit
    {
        // Unit ID
        public string Id { get; set; }
        
        // Unit type
        public string Type { get; set; }
        
        // Unit level (technology level)
        public int Level { get; set; }
        
        // Maximum strength (number of soldiers)
        public int MaxStrength { get; set; }
        
        // Current strength (number of soldiers)
        public int CurrentStrength { get; set; }
        
        // Recruitment cost
        public int RecruitmentCost { get; set; }
        
        // Maintenance cost per turn
        public int MaintenanceCost { get; set; }
        
        // Combat effectiveness (multiplier for strength)
        public double CombatEffectiveness { get; set; }
        
        public Unit()
        {
            // Default constructor for serialization
        }
        
        public Unit(string id, string type, int level, int maxStrength, int recruitmentCost, int maintenanceCost, double combatEffectiveness = 1.0)
        {
            Id = id;
            Type = type;
            Level = level;
            MaxStrength = maxStrength;
            CurrentStrength = maxStrength;
            RecruitmentCost = recruitmentCost;
            MaintenanceCost = maintenanceCost;
            CombatEffectiveness = combatEffectiveness;
        }
        
        // Calculate effective combat strength
        public int CalculateEffectiveStrength()
        {
            return (int)(CurrentStrength * CombatEffectiveness);
        }
        
        // Reinforce unit to full strength
        public int Reinforce()
        {
            int soldiersNeeded = MaxStrength - CurrentStrength;
            int cost = (soldiersNeeded * RecruitmentCost) / MaxStrength;
            CurrentStrength = MaxStrength;
            return cost;
        }
    }
    
    // Common unit types
    public static class UnitTypes
    {
        public const string Infantry = "Infantry";
        public const string Cavalry = "Cavalry";
        public const string Artillery = "Artillery";
        public const string Navy = "Navy";
    }
}