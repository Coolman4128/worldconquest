using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class Player
    {
        // Player ID (connection ID)
        public string Id { get; set; }
        
        // Player name
        public string Name { get; set; }
        
        // Country ID controlled by this player
        public string CountryId { get; set; }
        
        // Is the player currently connected
        public bool IsConnected { get; set; }
        
        // Is the player ready to start the game
        public bool IsReady { get; set; }
        
        // Has the player finished their turn
        public bool HasFinishedTurn { get; set; }
        
        public Player()
        {
            // Default constructor for serialization
        }
        
        public Player(string id, string name)
        {
            Id = id;
            Name = name;
            IsConnected = true;
            IsReady = false;
            HasFinishedTurn = false;
        }
        
        // Assign a country to this player
        public void AssignCountry(string countryId)
        {
            CountryId = countryId;
        }
        
        // Mark the player as ready to start
        public void MarkAsReady()
        {
            IsReady = true;
        }
        
        // Mark the player as having finished their turn
        public void FinishTurn()
        {
            HasFinishedTurn = true;
        }
        
        // Reset the player's turn status for a new turn
        public void ResetTurn()
        {
            HasFinishedTurn = false;
        }
        
        // Mark the player as connected/disconnected
        public void SetConnectionStatus(bool isConnected)
        {
            IsConnected = isConnected;
        }
    }
}