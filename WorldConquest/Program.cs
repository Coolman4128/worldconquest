using System.Text.Json;
using WorldConquest.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", builder =>
        builder.WithOrigins("http://localhost:5000")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials());
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("CorsPolicy");

// Add middleware to handle 404 errors
app.Use(async (context, next) =>
{
    await next();
    
    if (context.Response.StatusCode == 404 && !context.Response.HasStarted)
    {
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(Path.Combine(app.Environment.WebRootPath, "404.html"));
    }
});

// API endpoints using minimal API approach
app.MapGet("/api/status", () =>
    Results.Ok(new { Status = "Running", Time = DateTime.UtcNow }));

app.MapGet("/api/lobbies", () =>
    Results.Ok(new[]
    {
        new { Id = "1", Name = "Test Lobby", Players = 1, MaxPlayers = 4 }
    }));

// SignalR Hub
app.MapHub<GameHub>("/gamehub");

// Serve index.html at the root path
app.MapGet("/", async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(Path.Combine(app.Environment.WebRootPath, "index.html"));
});

app.Run();
