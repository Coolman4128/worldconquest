namespace WorldConquest.Models
{
    public class Country
    {
        // Unique country Id
        public string Id { get; set; }

        // Display name of the country
        public string Name { get; set; }

        // Color used for provinces (e.g., "R_G_B" or hex)
        public string Color { get; set; }

        // Money owned by the country
        public int Money { get; set; }

        // Player Id controlling this country (null if AI or unassigned)
        public string? PlayerId { get; set; }

        // Additional metrics (expand as needed)
        public int Stability { get; set; }
        public int Population { get; set; }
    }
}