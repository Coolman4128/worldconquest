using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class Country
    {
        // Country ID
        public string Id { get; set; }
        
        // Country name
        public string Name { get; set; }
        
        // Country color (RGB values for map display)
        public string Color { get; set; }
        
        // Player ID who controls this country
        public string PlayerId { get; set; }
        
        // Money amount
        public int Money { get; set; }
        
        // List of province IDs owned by this country
        public List<string> OwnedProvinceIds { get; set; } = new List<string>();
        
        // List of army IDs belonging to this country
        public List<string> ArmyIds { get; set; } = new List<string>();
        
        // Diplomatic relations with other countries
        public Dictionary<string, DiplomaticRelation> DiplomaticRelations { get; set; } = new Dictionary<string, DiplomaticRelation>();
        
        // Researched technologies
        public List<string> ResearchedTechnologies { get; set; } = new List<string>();
        
        // Current research project
        public string CurrentResearch { get; set; }
        
        // Turns remaining on current research
        public int ResearchTurnsRemaining { get; set; }
        
        public Country()
        {
            // Default constructor for serialization
        }
        
        public Country(string id, string name, string color, string playerId, int startingMoney = 1000)
        {
            Id = id;
            Name = name;
            Color = color;
            PlayerId = playerId;
            Money = startingMoney;
        }
        
        // Calculate total income from all provinces
        public int CalculateTotalIncome(Dictionary<string, Province> allProvinces)
        {
            int totalIncome = 0;
            
            foreach (var provinceId in OwnedProvinceIds)
            {
                if (allProvinces.TryGetValue(provinceId, out var province))
                {
                    totalIncome += province.Income;
                    
                    // Add income from buildings
                    foreach (var building in province.Buildings)
                    {
                        totalIncome += building.Income;
                    }
                }
            }
            
            return totalIncome;
        }
        
        // Calculate total expenses from armies and buildings
        public int CalculateTotalExpenses(Dictionary<string, Army> allArmies)
        {
            int totalExpenses = 0;
            
            foreach (var armyId in ArmyIds)
            {
                if (allArmies.TryGetValue(armyId, out var army))
                {
                    totalExpenses += army.MaintenanceCost;
                }
            }
            
            return totalExpenses;
        }
    }
    
    public enum DiplomaticRelation
    {
        Neutral,
        Allied,
        DefensiveAlliance,
        AtWar,
        Truce
    }
}