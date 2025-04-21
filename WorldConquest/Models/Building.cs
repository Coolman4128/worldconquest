using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class Building
    {
        // Building ID
        public string Id { get; set; }
        
        // Building name
        public string Name { get; set; }
        
        // Building type
        public BuildingType Type { get; set; }
        
        // Building level (for upgradable buildings)
        public int Level { get; set; }
        
        // Construction cost
        public int Cost { get; set; }
        
        // Maintenance cost per turn
        public int Maintenance { get; set; }
        
        // Income generated per turn
        public int Income { get; set; }
        
        // Effects provided by the building
        public BuildingEffects Effects { get; set; }
        
        public Building()
        {
            // Default constructor for serialization
        }
        
        public Building(string id, string name, BuildingType type, int cost, int maintenance = 0, int income = 0)
        {
            Id = id;
            Name = name;
            Type = type;
            Level = 1;
            Cost = cost;
            Maintenance = maintenance;
            Income = income;
            Effects = new BuildingEffects();
        }
    }
    
    public enum BuildingType
    {
        Economic,
        Military,
        Administrative,
        Religious,
        Special
    }
    
    public class BuildingEffects
    {
        // Economic effects
        public int TaxModifier { get; set; } = 0;
        public int ProductionModifier { get; set; } = 0;
        
        // Military effects
        public int GarrisonBonus { get; set; } = 0;
        public int RecruitmentBonus { get; set; } = 0;
        
        // Administrative effects
        public int UnrestReduction { get; set; } = 0;
        
        // Other effects can be added as needed
    }
}