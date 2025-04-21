using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorldConquest.Models
{
    public class GameState
    {
        // Game state ID
        public string Id { get; set; }
        
        // Associated lobby ID
        public string LobbyId { get; set; }
        
        // Current date in the game (year-month-day)
        public GameDate CurrentDate { get; set; }
        
        // Current player's turn (index in the turn order)
        public int CurrentPlayerIndex { get; set; }
        
        // Turn order (list of player IDs)
        public List<string> TurnOrder { get; set; } = new List<string>();
        
        // All provinces in the game
        public Dictionary<string, Province> Provinces { get; set; } = new Dictionary<string, Province>();
        
        // All countries in the game
        public Dictionary<string, Country> Countries { get; set; } = new Dictionary<string, Country>();
        
        // All armies in the game
        public Dictionary<string, Army> Armies { get; set; } = new Dictionary<string, Army>();
        
        // All players in the game
        public Dictionary<string, Player> Players { get; set; } = new Dictionary<string, Player>();
        
        // Game chat messages
        public List<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
        
        // Last updated timestamp
        public DateTime LastUpdated { get; set; }
        
        public GameState()
        {
            // Default constructor for serialization
        }
        
        public GameState(string id, string lobbyId, List<Player> players)
        {
            Id = id;
            LobbyId = lobbyId;
            CurrentDate = new GameDate(1444, 1, 1); // Start date
            CurrentPlayerIndex = 0;
            LastUpdated = DateTime.UtcNow;
            
            // Initialize players
            foreach (var player in players)
            {
                Players[player.Id] = player;
                TurnOrder.Add(player.Id);
            }
        }
        
        // Advance to the next player's turn
        public void AdvanceToNextPlayer()
        {
            CurrentPlayerIndex = (CurrentPlayerIndex + 1) % TurnOrder.Count;
            
            // If we've completed a full cycle, advance the date
            if (CurrentPlayerIndex == 0)
            {
                AdvanceDate();
                ProcessTurnStart();
            }
            
            LastUpdated = DateTime.UtcNow;
        }
        
        // Advance the game date by 3 months
        private void AdvanceDate()
        {
            CurrentDate.AddMonths(3);
        }
        
        // Process the start of a new turn (income, expenses, etc.)
        private void ProcessTurnStart()
        {
            foreach (var country in Countries.Values)
            {
                // Calculate income and expenses
                int income = country.CalculateTotalIncome(Provinces);
                int expenses = country.CalculateTotalExpenses(Armies);
                
                // Update money
                country.Money += income - expenses;
                
                // Reset army movement points
                foreach (var armyId in country.ArmyIds)
                {
                    if (Armies.TryGetValue(armyId, out var army))
                    {
                        army.ResetMovementPoints();
                    }
                }
                
                // Process research
                if (!string.IsNullOrEmpty(country.CurrentResearch))
                {
                    country.ResearchTurnsRemaining--;
                    if (country.ResearchTurnsRemaining <= 0)
                    {
                        country.ResearchedTechnologies.Add(country.CurrentResearch);
                        country.CurrentResearch = null;
                    }
                }
                
                // Process unrest and potential rebellions
                // (This would be implemented in a more complex way)
            }
            
            // Reset turn status for all players
            foreach (var player in Players.Values)
            {
                player.ResetTurn();
            }
        }
        
        // Add a chat message
        public void AddChatMessage(string playerId, string message, bool isAllyOnly = false)
        {
            var player = Players[playerId];
            var chatMessage = new ChatMessage
            {
                PlayerId = playerId,
                PlayerName = player.Name,
                Message = message,
                IsAllyOnly = isAllyOnly,
                Timestamp = DateTime.UtcNow
            };
            
            ChatMessages.Add(chatMessage);
            
            // Limit chat history to last 100 messages
            if (ChatMessages.Count > 100)
            {
                ChatMessages.RemoveAt(0);
            }
            
            LastUpdated = DateTime.UtcNow;
        }
    }
    
    public class GameDate
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public int Day { get; set; }
        
        public GameDate()
        {
            // Default constructor for serialization
        }
        
        public GameDate(int year, int month, int day)
        {
            Year = year;
            Month = month;
            Day = day;
        }
        
        // Add months to the date
        public void AddMonths(int months)
        {
            Month += months;
            while (Month > 12)
            {
                Month -= 12;
                Year++;
            }
        }
        
        // Format the date as a string
        public override string ToString()
        {
            return $"{Year}-{Month:D2}-{Day:D2}";
        }
    }
    
    public class ChatMessage
    {
        public string PlayerId { get; set; }
        public string PlayerName { get; set; }
        public string Message { get; set; }
        public bool IsAllyOnly { get; set; }
        public DateTime Timestamp { get; set; }
    }
}