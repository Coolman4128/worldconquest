using Microsoft.AspNetCore.SignalR;
using WorldConquest.Models;
using WorldConquest.Services;

namespace WorldConquest.Hubs
{
    public class GameHub : Hub
    {
        private readonly ILobbyService _lobbyService;
        private readonly IGameStateService _gameStateService;

        public GameHub(ILobbyService lobbyService, IGameStateService gameStateService)
        {
            _lobbyService = lobbyService;
            _gameStateService = gameStateService;
        }

        public async Task JoinLobby(string lobbyId, string playerName)
        {
            var player = new Player
            {
                Id = Context.ConnectionId,
                Name = playerName,
                ConnectionId = Context.ConnectionId
            };

            var lobby = await _lobbyService.JoinLobbyAsync(lobbyId, player);
            if (lobby != null)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, lobbyId);
                await Clients.Group(lobbyId).SendAsync("PlayerJoined", player);
                await Clients.Caller.SendAsync("LobbyJoined", lobby);
                await Clients.Group(lobbyId).SendAsync("GameStateUpdated", lobby.GameState);
            }
            else
            {
                await Clients.Caller.SendAsync("Error", "Failed to join lobby");
            }
        }

        public async Task LeaveLobby(string lobbyId)
        {
            var playerId = Context.ConnectionId;
            var success = await _lobbyService.LeaveLobbyAsync(lobbyId, playerId);
            if (success)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, lobbyId);
                await Clients.Group(lobbyId).SendAsync("PlayerLeft", playerId);
                
                // Get updated lobby info
                var lobby = await _lobbyService.GetLobbyAsync(lobbyId);
                if (lobby != null)
                {
                    await Clients.Group(lobbyId).SendAsync("GameStateUpdated", lobby.GameState);
                }
            }
        }

        public async Task UpdateGameState(string lobbyId, GameState gameState)
        {
            var success = await _gameStateService.UpdateGameStateAsync(lobbyId, gameState);
            if (success)
            {
                await Clients.Group(lobbyId).SendAsync("GameStateUpdated", gameState);
            }
        }

        public async Task AdvanceTurn(string lobbyId)
        {
            var success = await _gameStateService.AdvanceTurnAsync(lobbyId);
            if (success)
            {
                var gameState = await _gameStateService.GetGameStateAsync(lobbyId);
                if (gameState != null)
                {
                    await Clients.Group(lobbyId).SendAsync("GameStateUpdated", gameState);
                }
            }
        }

        public async Task AdvanceYear(string lobbyId)
        {
            var success = await _gameStateService.AdvanceYearAsync(lobbyId);
            if (success)
            {
                var gameState = await _gameStateService.GetGameStateAsync(lobbyId);
                if (gameState != null)
                {
                    await Clients.Group(lobbyId).SendAsync("GameStateUpdated", gameState);
                }
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Find all lobbies the player is in and remove them
            var lobbies = await _lobbyService.GetLobbiesAsync();
            foreach (var lobbyInfo in lobbies)
            {
                var lobby = await _lobbyService.GetLobbyAsync(lobbyInfo.Id);
                if (lobby != null && lobby.Players.Any(p => p.ConnectionId == Context.ConnectionId))
                {
                    await _lobbyService.LeaveLobbyAsync(lobby.Id, Context.ConnectionId);
                    await Clients.Group(lobby.Id).SendAsync("PlayerLeft", Context.ConnectionId);
                    
                    // Get updated lobby info
                    var updatedLobby = await _lobbyService.GetLobbyAsync(lobby.Id);
                    if (updatedLobby != null)
                    {
                        await Clients.Group(lobby.Id).SendAsync("GameStateUpdated", updatedLobby.GameState);
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}