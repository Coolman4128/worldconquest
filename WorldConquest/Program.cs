using Microsoft.AspNetCore.SignalR;
using WorldConquest.Hubs;
using WorldConquest.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Register services
builder.Services.AddSingleton<ILobbyService, LobbyService>();
builder.Services.AddSingleton<IGameService, GameService>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Enable CORS
app.UseCors();

// Enable static file hosting
app.UseDefaultFiles();
app.UseStaticFiles();

// Configure SignalR endpoints
app.MapHub<GameHub>("/gamehub");

// Add API endpoints
app.MapGet("/api/test", () => "API is working!");
app.MapGet("/api/lobbies", async (ILobbyService lobbyService) =>
    await lobbyService.GetPublicLobbies());

// Add saved games API endpoint
app.MapGet("/api/savedgames", () => {
    try {
        var savedGamesDir = Path.Combine(Directory.GetCurrentDirectory(), "Saves");
        
        // Create directory if it doesn't exist
        if (!Directory.Exists(savedGamesDir))
        {
            Directory.CreateDirectory(savedGamesDir);
            return Results.Ok(new List<object>());
        }
        
        // Get all saved game files
        var savedGameFiles = Directory.GetFiles(savedGamesDir, "game_*.json");
        
        // Create response objects
        var savedGames = savedGameFiles.Select(file => {
            var fileName = Path.GetFileName(file);
            var fileInfo = new FileInfo(file);
            
            // Extract game ID and date from filename (format: game_[id]_[date].json)
            var parts = fileName.Split('_');
            var gameId = parts.Length > 1 ? parts[1] : "unknown";
            
            return new {
                name = $"Game {gameId}",
                path = file,
                savedAt = fileInfo.CreationTime
            };
        }).OrderByDescending(g => g.savedAt).ToList();
        
        return Results.Ok(savedGames);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error retrieving saved games: {ex.Message}");
    }
});

// Fallback to index.html for SPA
app.MapFallbackToFile("index.html");

app.Run();
