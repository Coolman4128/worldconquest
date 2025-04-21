using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using WorldConquest.Models;

namespace WorldConquest.Services
{
    public class GameService : IGameService
    {
        private readonly ILobbyService _lobbyService;
        private readonly Dictionary<string, GameState> _gameStates = new Dictionary<string, GameState>();
        
        public GameService(ILobbyService lobbyService)
        {
            _lobbyService = lobbyService;
        }
        
        public async Task<GameState> StartGame(string lobbyId, string hostPlayerId)
        {
            // Get the lobby
            var lobby = await _lobbyService.GetLobby(lobbyId);
            
            // Check if the requester is the host
            if (lobby.HostId != hostPlayerId)
            {
                throw new Exception("Only the host can start the game");
            }
            
            // Check if all players are ready
            if (!lobby.AreAllPlayersReady())
            {
                throw new Exception("Not all players are ready");
            }
            
            // Generate a unique ID for the game state
            string gameStateId = Guid.NewGuid().ToString();
            
            // Create the game state
            var gameState = new GameState(gameStateId, lobbyId, lobby.Players);
            
            // Initialize the game (this would be more complex in a real implementation)
            InitializeGame(gameState);
            
            // Store the game state
            _gameStates[gameStateId] = gameState;
            
            // Update the lobby
            lobby.StartGame(gameStateId);
            
            return gameState;
        }
        
        public Task<GameState> GetGameState(string gameStateId)
        {
            // Check if the game state exists
            if (!_gameStates.TryGetValue(gameStateId, out var gameState))
            {
                throw new Exception("Game state not found");
            }
            
            return Task.FromResult(gameState);
        }
        
        public async Task<GameState> EndPlayerTurn(string playerId, string gameStateId)
        {
            // Check if the game state exists
            if (!_gameStates.TryGetValue(gameStateId, out var gameState))
            {
                throw new Exception("Game state not found");
            }
            
            // Check if it's the player's turn
            string currentPlayerId = gameState.TurnOrder[gameState.CurrentPlayerIndex];
            if (currentPlayerId != playerId)
            {
                throw new Exception("It's not your turn");
            }
            
            // Mark the player as having finished their turn
            if (gameState.Players.TryGetValue(playerId, out var player))
            {
                player.FinishTurn();
            }
            else
            {
                throw new Exception("Player not found in game");
            }
            
            return gameState;
        }
        
        public Task<GameState> AdvanceToNextTurn(string gameStateId)
        {
            // Check if the game state exists
            if (!_gameStates.TryGetValue(gameStateId, out var gameState))
            {
                throw new Exception("Game state not found");
            }
            
            // Advance to the next player's turn
            gameState.AdvanceToNextPlayer();
            
            return Task.FromResult(gameState);
        }
        
        public Task<GameState> AddChatMessage(string playerId, string gameStateId, string message, bool isAllyOnly)
        {
            // Check if the game state exists
            if (!_gameStates.TryGetValue(gameStateId, out var gameState))
            {
                throw new Exception("Game state not found");
            }
            
            // Check if the player is in the game
            if (!gameState.Players.ContainsKey(playerId))
            {
                throw new Exception("Player not found in game");
            }
            
            // Add the chat message
            gameState.AddChatMessage(playerId, message, isAllyOnly);
            
            return Task.FromResult(gameState);
        }
        
        public async Task<bool> SaveGameState(string gameStateId)
        {
            // Check if the game state exists
            if (!_gameStates.TryGetValue(gameStateId, out var gameState))
            {
                throw new Exception("Game state not found");
            }
            
            try
            {
                // Create the saves directory if it doesn't exist
                Directory.CreateDirectory("Saves");
                
                // Serialize the game state to JSON
                string json = JsonSerializer.Serialize(gameState, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                
                // Save the JSON to a file
                string fileName = $"Saves/game_{gameStateId}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json";
                await File.WriteAllTextAsync(fileName, json);
                
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
        
        public async Task<GameState> LoadGameState(string savedGamePath)
        {
            try
            {
                // Read the JSON from the file
                string json = await File.ReadAllTextAsync(savedGamePath);
                
                // Deserialize the JSON to a game state
                var gameState = JsonSerializer.Deserialize<GameState>(json);
                
                // Store the game state
                _gameStates[gameState.Id] = gameState;
                
                return gameState;
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to load game state: {ex.Message}");
            }
        }
        
        // Initialize a new game with default values
        private void InitializeGame(GameState gameState)
        {
            // This is a simplified implementation
            // In a real game, this would be much more complex
            
            // Create some test provinces
            CreateTestProvinces(gameState);
            
            // Create countries for each player
            CreatePlayerCountries(gameState);
            
            // Assign starting provinces to countries
            AssignStartingProvinces(gameState);
            
            // Create starting armies
            CreateStartingArmies(gameState);
        }
        
        private void CreateTestProvinces(GameState gameState)
        {
            // Create some test provinces with RGB IDs
            var provinces = new List<Province>
            {
                new Province("255_0_0", "Red Province", ProvinceType.Land),
                new Province("0_255_0", "Green Province", ProvinceType.Land),
                new Province("0_0_255", "Blue Province", ProvinceType.Land),
                new Province("255_255_0", "Yellow Province", ProvinceType.Land),
                new Province("255_0_255", "Magenta Province", ProvinceType.Land),
                new Province("0_255_255", "Cyan Province", ProvinceType.Land),
                new Province("128_128_128", "Gray Province", ProvinceType.Land),
                new Province("0_0_0", "Black Sea", ProvinceType.Water)
            };
            
            // Add provinces to the game state
            foreach (var province in provinces)
            {
                gameState.Provinces[province.Id] = province;
            }
        }
        
        private void CreatePlayerCountries(GameState gameState)
        {
            // Create a country for each player
            int index = 0;
            string[] colors = { "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#800080", "#FFA500" };
            
            foreach (var player in gameState.Players.Values)
            {
                string countryId = Guid.NewGuid().ToString();
                string countryName = $"{player.Name}'s Country";
                string color = colors[index % colors.Length];
                
                var country = new Country(countryId, countryName, color, player.Id);
                gameState.Countries[countryId] = country;
                
                // Assign the country to the player
                player.AssignCountry(countryId);
                
                index++;
            }
        }
        
        private void AssignStartingProvinces(GameState gameState)
        {
            // Assign provinces to countries (simplified)
            var provinceList = gameState.Provinces.Values.Where(p => p.Type == ProvinceType.Land).ToList();
            var countryList = gameState.Countries.Values.ToList();
            
            for (int i = 0; i < Math.Min(provinceList.Count, countryList.Count); i++)
            {
                var province = provinceList[i];
                var country = countryList[i];
                
                // Assign the province to the country
                province.OwnerId = country.Id;
                country.OwnedProvinceIds.Add(province.Id);
            }
        }
        
        private void CreateStartingArmies(GameState gameState)
        {
            // Create a starting army for each country
            foreach (var country in gameState.Countries.Values)
            {
                // Skip if the country has no provinces
                if (country.OwnedProvinceIds.Count == 0)
                {
                    continue;
                }
                
                string armyId = Guid.NewGuid().ToString();
                string armyName = $"{country.Name} Army";
                string generalName = $"General {country.Name}";
                string provinceId = country.OwnedProvinceIds[0];
                
                var army = new Army(armyId, armyName, country.Id, generalName, provinceId);
                
                // Add some basic units
                army.Units.Add(new Unit(Guid.NewGuid().ToString(), UnitTypes.Infantry, 0, 1000, 100, 10));
                
                // Add the army to the game state
                gameState.Armies[armyId] = army;
                
                // Add the army to the country
                country.ArmyIds.Add(armyId);
            }
        }
    }
}