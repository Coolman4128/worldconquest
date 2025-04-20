using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.Json.Serialization;
using WorldConquest.Models;

namespace WorldConquest.Services
{
    public class GameStateService : IGameStateService
    {
        private readonly ConcurrentDictionary<string, GameState> _gameStates = new ConcurrentDictionary<string, GameState>();
        private GameState? _defaultGameState;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<GameStateService> _logger;

        public GameStateService(IWebHostEnvironment environment, ILogger<GameStateService> logger)
        {
            _environment = environment;
            _logger = logger;
        }

        public async Task<GameState> CreateDefaultGameStateAsync()
        {
            // If we already have a default game state, clone it
            if (_defaultGameState != null)
            {
                return CloneGameState(_defaultGameState);
            }

            try
            {
                // Load the default game state from the JSON file
                string filePath = Path.Combine(_environment.ContentRootPath, "default-gamestate.json");
                _logger.LogInformation($"Loading default game state from {filePath}");

                if (!File.Exists(filePath))
                {
                    _logger.LogWarning($"Default game state file not found at {filePath}. Creating a minimal game state.");
                    return CreateMinimalGameState();
                }

                string jsonContent = await File.ReadAllTextAsync(filePath);
                
                // Define JSON options with case-insensitive property names
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                // Deserialize the JSON content
                var gameStateData = JsonSerializer.Deserialize<JsonElement>(jsonContent, options);
                
                // Create a new game state
                var gameState = new GameState
                {
                    Year = gameStateData.GetProperty("year").GetInt32(),
                    CurrentTurn = gameStateData.GetProperty("currentTurn").GetString() ?? string.Empty,
                    Players = new List<Player>(),
                    Provinces = new Dictionary<string, Province>()
                };

                // Add players
                var playersArray = gameStateData.GetProperty("players");
                foreach (var playerElement in playersArray.EnumerateArray())
                {
                    var player = new Player
                    {
                        Id = playerElement.GetProperty("id").GetString() ?? string.Empty,
                        Name = playerElement.GetProperty("name").GetString() ?? string.Empty,
                        Color = playerElement.GetProperty("color").GetString() ?? string.Empty,
                        ConnectionId = playerElement.GetProperty("connectionId").GetString() ?? string.Empty
                    };
                    gameState.Players.Add(player);
                }

                // Add provinces
                var provincesObject = gameStateData.GetProperty("provinces");
                foreach (var provinceProperty in provincesObject.EnumerateObject())
                {
                    var provinceElement = provinceProperty.Value;
                    var originalColorElement = provinceElement.GetProperty("originalColor");
                    
                    var province = new Province
                    {
                        Id = provinceElement.GetProperty("id").GetString() ?? string.Empty,
                        Owner = provinceElement.GetProperty("owner").GetString() ?? string.Empty,
                        IsWater = provinceElement.GetProperty("isWater").GetBoolean(),
                        OriginalColor = new Color
                        {
                            R = originalColorElement.GetProperty("r").GetInt32(),
                            G = originalColorElement.GetProperty("g").GetInt32(),
                            B = originalColorElement.GetProperty("b").GetInt32()
                        },
                        Bounds = new Bounds
                        {
                            MinX = provinceElement.GetProperty("bounds").GetProperty("minX").GetInt32(),
                            MinY = provinceElement.GetProperty("bounds").GetProperty("minY").GetInt32(),
                            MaxX = provinceElement.GetProperty("bounds").GetProperty("maxX").GetInt32(),
                            MaxY = provinceElement.GetProperty("bounds").GetProperty("maxY").GetInt32()
                        }
                    };
                    
                    gameState.Provinces[province.Id] = province;
                }

                _logger.LogInformation($"Loaded default game state with {gameState.Provinces.Count} provinces and {gameState.Players.Count} players");
                
                // Cache the default game state
                _defaultGameState = CloneGameState(gameState);
                
                return gameState;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading default game state from JSON file");
                return CreateMinimalGameState();
            }
        }

        private GameState CreateMinimalGameState()
        {
            _logger.LogInformation("Creating minimal game state with sample provinces");
            
            // Create a new default game state
            var gameState = new GameState
            {
                Year = 1100,
                Players = new List<Player>(),
                Provinces = new Dictionary<string, Province>()
            };

            // Create default provinces
            var defaultProvinces = CreateDefaultProvinces();
            foreach (var province in defaultProvinces)
            {
                gameState.Provinces[province.Id] = province;
            }

            // Cache the default game state
            _defaultGameState = CloneGameState(gameState);

            return gameState;
        }

        public async Task<GameState?> GetGameStateAsync(string lobbyId)
        {
            if (_gameStates.TryGetValue(lobbyId, out var gameState))
            {
                return gameState;
            }
            return null;
        }

        public async Task<bool> UpdateGameStateAsync(string lobbyId, GameState gameState)
        {
            _gameStates[lobbyId] = gameState;
            return true;
        }

        public async Task<bool> AdvanceTurnAsync(string lobbyId)
        {
            if (_gameStates.TryGetValue(lobbyId, out var gameState))
            {
                var players = gameState.Players;
                if (players.Count == 0) return false;

                // Find the current player index
                var currentPlayerIndex = -1;
                if (!string.IsNullOrEmpty(gameState.CurrentTurn))
                {
                    currentPlayerIndex = players.FindIndex(p => p.Id == gameState.CurrentTurn);
                }

                // Move to the next player
                currentPlayerIndex = (currentPlayerIndex + 1) % players.Count;
                gameState.CurrentTurn = players[currentPlayerIndex].Id;

                return true;
            }
            return false;
        }

        public async Task<bool> AdvanceYearAsync(string lobbyId)
        {
            if (_gameStates.TryGetValue(lobbyId, out var gameState))
            {
                gameState.Year++;
                return true;
            }
            return false;
        }

        private GameState CloneGameState(GameState gameState)
        {
            // Deep clone using JSON serialization
            var json = JsonSerializer.Serialize(gameState);
            return JsonSerializer.Deserialize<GameState>(json) ?? new GameState();
        }

        private List<Province> CreateDefaultProvinces()
        {
            // In a real implementation, these would be loaded from a file or database
            // For now, we'll create a few sample provinces
            var provinces = new List<Province>
            {
                new Province
                {
                    Id = "100_150_200",
                    OriginalColor = new Color { R = 100, G = 150, B = 200 },
                    Owner = "water",
                    IsWater = true,
                    Bounds = new Bounds { MinX = 10, MinY = 10, MaxX = 50, MaxY = 50 }
                },
                new Province
                {
                    Id = "200_100_100",
                    OriginalColor = new Color { R = 200, G = 100, B = 100 },
                    Owner = "red",
                    IsWater = false,
                    Bounds = new Bounds { MinX = 60, MinY = 10, MaxX = 100, MaxY = 50 }
                },
                new Province
                {
                    Id = "100_200_100",
                    OriginalColor = new Color { R = 100, G = 200, B = 100 },
                    Owner = "red",
                    IsWater = false,
                    Bounds = new Bounds { MinX = 110, MinY = 10, MaxX = 150, MaxY = 50 }
                },
                new Province
                {
                    Id = "100_100_200",
                    OriginalColor = new Color { R = 100, G = 100, B = 200 },
                    Owner = "red",
                    IsWater = false,
                    Bounds = new Bounds { MinX = 160, MinY = 10, MaxX = 200, MaxY = 50 }
                }
            };

            return provinces;
        }
    }
}