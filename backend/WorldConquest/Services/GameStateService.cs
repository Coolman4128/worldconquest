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
                    CurrentTurn = gameStateData.TryGetProperty("currentTurn", out var currentTurnProp) ? 
                        currentTurnProp.GetString() ?? string.Empty : string.Empty,
                    Players = new List<Player>(),
                    Countries = new List<Country>(),
                    Provinces = new Dictionary<string, Province>()
                };

                // Add countries
                if (gameStateData.TryGetProperty("countries", out var countriesArray))
                {
                    foreach (var countryElement in countriesArray.EnumerateArray())
                    {
                        var country = new Country
                        {
                            Id = countryElement.GetProperty("id").GetString() ?? string.Empty,
                            Name = countryElement.GetProperty("name").GetString() ?? string.Empty,
                            Color = countryElement.GetProperty("color").GetString() ?? string.Empty,
                            Description = countryElement.TryGetProperty("description", out var descProp) ? 
                                descProp.GetString() ?? string.Empty : string.Empty,
                            IsAvailable = true
                        };
                        gameState.Countries.Add(country);
                    }
                }

                // We don't add players from the JSON file anymore
                // They will be added when players join the game

                // Add provinces
                var provincesObject = gameStateData.GetProperty("provinces");
                foreach (var provinceProperty in provincesObject.EnumerateObject())
                {
                    // Skip province entries with insufficient data
                    if (!provinceProperty.Value.TryGetProperty("originalColor", out var originalColorElement) ||
                        !provinceProperty.Value.TryGetProperty("owner", out var _) ||
                        !provinceProperty.Value.TryGetProperty("isWater", out var _) ||
                        !provinceProperty.Value.TryGetProperty("bounds", out var _))
                    {
                        continue;
                    }

                    var province = new Province
                    {
                        Id = provinceProperty.Value.TryGetProperty("id", out var idProp) ? 
                            idProp.GetString() ?? provinceProperty.Name : provinceProperty.Name,
                        Owner = provinceProperty.Value.GetProperty("owner").GetString() ?? string.Empty,
                        IsWater = provinceProperty.Value.GetProperty("isWater").GetBoolean(),
                        OriginalColor = new Color
                        {
                            R = originalColorElement.GetProperty("r").GetInt32(),
                            G = originalColorElement.GetProperty("g").GetInt32(),
                            B = originalColorElement.GetProperty("b").GetInt32()
                        },
                        Bounds = new Bounds
                        {
                            MinX = provinceProperty.Value.GetProperty("bounds").GetProperty("minX").GetInt32(),
                            MinY = provinceProperty.Value.GetProperty("bounds").GetProperty("minY").GetInt32(),
                            MaxX = provinceProperty.Value.GetProperty("bounds").GetProperty("maxX").GetInt32(),
                            MaxY = provinceProperty.Value.GetProperty("bounds").GetProperty("maxY").GetInt32()
                        }
                    };
                    
                    gameState.Provinces[province.Id] = province;
                }

                _logger.LogInformation($"Loaded default game state with {gameState.Provinces.Count} provinces, {gameState.Countries.Count} countries, and {gameState.Players.Count} players");
                
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
                Countries = CreateDefaultCountries(),
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

        private List<Country> CreateDefaultCountries()
        {
            // Create default countries if JSON loading fails
            return new List<Country>
            {
                new Country
                {
                    Id = "kingdom_red",
                    Name = "Kingdom of Redoria",
                    Color = "red",
                    Description = "A wealthy kingdom known for its military might",
                    IsAvailable = true
                },
                new Country
                {
                    Id = "empire_blue",
                    Name = "Blue Empire",
                    Color = "blue",
                    Description = "An ancient empire with strong naval traditions",
                    IsAvailable = true
                },
                new Country
                {
                    Id = "duchy_green",
                    Name = "Green Duchy", 
                    Color = "green",
                    Description = "A small but prosperous realm with fertile lands",
                    IsAvailable = true
                },
                new Country
                {
                    Id = "confederation_yellow",
                    Name = "Yellow Confederation",
                    Color = "yellow",
                    Description = "An alliance of city-states with advanced trade networks",
                    IsAvailable = true
                },
                new Country
                {
                    Id = "purple_dominion",
                    Name = "Purple Dominion",
                    Color = "purple",
                    Description = "A mysterious realm ruled by scholars and mages",
                    IsAvailable = true
                }
            };
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