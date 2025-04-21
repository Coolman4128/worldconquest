using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class Army
    {
        // Army ID
        public string Id { get; set; }
        
        // Army name
        public string Name { get; set; }
        
        // Country ID that owns this army
        public string CountryId { get; set; }
        
        // General name
        public string General { get; set; }
        
        // Current province ID where the army is located
        public string CurrentProvinceId { get; set; }
        
        // Units in the army
        public List<Unit> Units { get; set; } = new List<Unit>();
        
        // Remaining movement points for the current turn (max 5)
        public int MovementPoints { get; set; }
        
        // Total maintenance cost of the army
        public int MaintenanceCost => CalculateMaintenanceCost();
        
        // Total strength of the army
        public int TotalStrength => CalculateTotalStrength();
        
        public Army()
        {
            // Default constructor for serialization
        }
        
        public Army(string id, string name, string countryId, string general, string startingProvinceId)
        {
            Id = id;
            Name = name;
            CountryId = countryId;
            General = general;
            CurrentProvinceId = startingProvinceId;
            MovementPoints = 5;
        }
        
        // Calculate the total maintenance cost of all units
        private int CalculateMaintenanceCost()
        {
            int totalCost = 0;
            foreach (var unit in Units)
            {
                totalCost += unit.MaintenanceCost;
            }
            return totalCost;
        }
        
        // Calculate the total strength of all units
        private int CalculateTotalStrength()
        {
            int totalStrength = 0;
            foreach (var unit in Units)
            {
                totalStrength += unit.CurrentStrength;
            }
            return totalStrength;
        }
        
        // Reset movement points for a new turn
        public void ResetMovementPoints()
        {
            MovementPoints = 5;
        }
        
        // Move the army to a new province
        public bool MoveToProvince(string provinceId)
        {
            if (MovementPoints > 0)
            {
                CurrentProvinceId = provinceId;
                MovementPoints--;
                return true;
            }
            return false;
        }
        
        // Apply battle casualties
        public void ApplyBattleCasualties(int casualties, bool isWinner)
        {
            // Calculate percentage of casualties
            double casualtyPercentage = (double)casualties / TotalStrength;
            
            // Apply casualties to each unit
            foreach (var unit in Units)
            {
                int unitCasualties = (int)(unit.CurrentStrength * casualtyPercentage);
                unit.CurrentStrength -= unitCasualties;
            }
            
            // If winner, consolidate units
            if (isWinner)
            {
                ConsolidateUnits();
            }
        }
        
        // Consolidate units after battle (units with <50% strength die, others go back to 100%)
        private void ConsolidateUnits()
        {
            for (int i = Units.Count - 1; i >= 0; i--)
            {
                var unit = Units[i];
                if ((double)unit.CurrentStrength / unit.MaxStrength < 0.5)
                {
                    Units.RemoveAt(i);
                }
                else
                {
                    unit.CurrentStrength = unit.MaxStrength;
                }
            }
        }
    }
}