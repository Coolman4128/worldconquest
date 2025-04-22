namespace WorldConquest.Models
{
    public class Player
    {
        // Unique player Id
        public string Id { get; set; }

        // Player display name
        public string Name { get; set; }

        // Country Id controlled by this player (null if not assigned)
        public string? CountryId { get; set; }

        // Is the player currently connected
        public bool IsConnected { get; set; }
    }
}