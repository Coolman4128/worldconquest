using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

namespace WorldConquest.Hubs;

public class GameHub : Hub
{
    private readonly ILogger<GameHub> _logger;

    public GameHub(ILogger<GameHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Basic message sending for chat functionality
    /// </summary>
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }

    /// <summary>
    /// Join a specific game group
    /// </summary>
    public async Task JoinGame(string gameId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
        await Clients.Group(gameId).SendAsync("PlayerJoined", Context.ConnectionId);
        _logger.LogInformation($"Player {Context.ConnectionId} joined game {gameId}");
    }

    /// <summary>
    /// Leave a specific game group
    /// </summary>
    public async Task LeaveGame(string gameId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, gameId);
        await Clients.Group(gameId).SendAsync("PlayerLeft", Context.ConnectionId);
        _logger.LogInformation($"Player {Context.ConnectionId} left game {gameId}");
    }

    /// <summary>
    /// Receive a message from a client with optional data
    /// </summary>
    public async Task ReceiveClientMessage(string messageName, object data)
    {
        _logger.LogInformation($"Received message '{messageName}' from client {Context.ConnectionId}");
        
        // Process the message based on its type
        await HandleClientMessage(messageName, data);
    }

    /// <summary>
    /// Send a message to all connected clients
    /// </summary>
    public async Task SendMessageAll(string messageName, object data = null!)
    {
        await Clients.All.SendAsync("GameMessage", messageName, data);
        _logger.LogInformation($"Sent message '{messageName}' to all clients");
    }

    /// <summary>
    /// Send a message to all clients in a specific game
    /// </summary>
    public async Task SendMessageToGame(string messageName, object data, string gameId)
    {
        await Clients.Group(gameId).SendAsync("GameMessage", messageName, data);
        _logger.LogInformation($"Sent message '{messageName}' to game {gameId}");
    }

    /// <summary>
    /// Send a message to a specific client
    /// </summary>
    public async Task SendMessageToClient(string messageName, object data, string clientId)
    {
        await Clients.Client(clientId).SendAsync("GameMessage", messageName, data);
        _logger.LogInformation($"Sent message '{messageName}' to client {clientId}");
    }

    /// <summary>
    /// Handle messages from clients based on message type
    /// </summary>
    private async Task HandleClientMessage(string messageName, object data)
    {
        // Log the received data for debugging
        string dataJson = data != null ? JsonSerializer.Serialize(data) : "null";
        _logger.LogDebug($"Processing message '{messageName}' with data: {dataJson}");

        await Task.Delay(1); // Simulate async work

        // Process different message types
        switch (messageName)
        {
            // HANDLE CLIENT MESSAGES HERE
            //Make classes for them and every class should have a method call check message which will check all the different event types
            //That class will handle

                case "RequestDefaultGameState":
                    try
                    {
                        var filePath = Path.Combine("..", "assets", "default_gamestate.json");
                        if (!File.Exists(filePath))
                        {
                            _logger.LogError($"Default gamestate file not found at {filePath}");
                            await Clients.Caller.SendAsync("ReceiveGameState", null);
                            break;
                        }

                        var json = await File.ReadAllTextAsync(filePath);
                        var gameState = JsonSerializer.Deserialize<Models.GameState>(json, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });

                        await Clients.Caller.SendAsync("ReceiveGameState", gameState);
                        _logger.LogInformation("Sent default gamestate to client.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send default gamestate.");
                        await Clients.Caller.SendAsync("ReceiveGameState", null);
                    }
                    break;

            default:
                _logger.LogWarning($"Unknown message type: {messageName}");
                break;
        }
    }

   

   
}