using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class Province
    {
        // Province ID in the format R_G_B from the bitmap
        public string Id { get; set; }
        
        // Province name
        public string Name { get; set; }
        
        // Owner country ID, null if unowned
        public string OwnerId { get; set; }
        
        // Province type (land, water, wasteland)
        public ProvinceType Type { get; set; }
        
        // Province development level (countryside, village, town, city)
        public ProvinceLevel Level { get; set; }
        
        // Religion of the province
        public string Religion { get; set; }
        
        // Unrest level (0-100)
        public int Unrest { get; set; }
        
        // Buildings in the province
        public List<Building> Buildings { get; set; } = new List<Building>();
        
        // Troops stationed in the province
        public List<Army> Armies { get; set; } = new List<Army>();
        
        // Garrison strength based on province level
        public int GarrisonStrength => (int)Level * 100;
        
        // Income generated per turn
        public int Income => (int)Level * 50;
        
        public Province()
        {
            // Default constructor for serialization
        }
        
        public Province(string id, string name, ProvinceType type = ProvinceType.Land)
        {
            Id = id;
            Name = name;
            Type = type;
            Level = ProvinceLevel.Countryside;
            Unrest = 0;
        }
    }
    
    public enum ProvinceType
    {
        Land,
        Water,
        Wasteland
    }
    
    public enum ProvinceLevel
    {
        Countryside = 1,
        Village = 2,
        Town = 3,
        City = 4,
        Metropolis = 5
    }
}