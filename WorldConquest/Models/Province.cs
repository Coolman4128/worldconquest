using System.Collections.Generic;

namespace WorldConquest.Models
{
    public enum ProvinceLevel
    {
        Countryside,
        Village,
        Town,
        City
    }

    public enum ProvinceType
    {
        Land,
        Water,
        Wasteland
    }

    public class Province
    {
        // Province Id in the form "R_G_B"
        public string Id { get; set; }

        // Country Id or null if unowned
        public string? OwnerId { get; set; }

        // List of Army Ids or Unit Ids present in the province
        public List<string> TroopIds { get; set; } = new List<string>();

        // List of Building Ids present in the province
        public List<string> BuildingIds { get; set; } = new List<string>();

        // Province level (countryside, village, town, city, etc)
        public ProvinceLevel Level { get; set; }

        // Religion of the province
        public string Religion { get; set; }

        // Province type: Land, Water, or Wasteland
        public ProvinceType Type { get; set; }

        // Unrest value (0 = no unrest, higher = more unrest)
        public int Unrest { get; set; }

        // Whether the province can be upgraded (inferred from level/money in logic)
        public bool Upgradable { get; set; }
    }
}