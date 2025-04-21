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

        public async Task JoinLobby(string lobbyId, string playerName, string countryId)
        {
            var lobby = await _lobbyService.GetLobbyAsync(lobbyId);
            if (lobby == null)
            {
                await Clients.Caller.SendAsync("Error", "Lobby not found");
                return;
            }

            // Find the selected country
            var selectedCountry = lobby.GameState.Countries.FirstOrDefault(c => c.Id == countryId);
            if (selectedCountry == null)
            {
                await Clients.Caller.SendAsync("Error", "Selected country not found");
                return;
            }

            // Check if country is already taken
            if (!selectedCountry.IsAvailable)
            {
                await Clients.Caller.SendAsync("Error", "Selected country is already taken");
                return;
            }

            var player = new Player
            {
                Id = Context.ConnectionId,
                Name = playerName,
                Color = selectedCountry.Color,
                ConnectionId = Context.ConnectionId
            };

            // Mark the country as unavailable
            selectedCountry.IsAvailable = false;

            var joinResult = await _lobbyService.JoinLobbyAsync(lobbyId, player);
            if (joinResult != null)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, lobbyId);
                await Clients.Group(lobbyId).SendAsync("PlayerJoined", player);
                await Clients.Caller.SendAsync("LobbyJoined", joinResult);
                await Clients.Group(lobbyId).SendAsync("GameStateUpdated", joinResult.GameState);
            }
            else
            {
                // If join failed, mark country as available again
                selectedCountry.IsAvailable = true;
                await Clients.Caller.SendAsync("Error", "Failed to join lobby");
            }
        }

        public async Task LeaveLobby(string lobbyId)
        {
            var playerId = Context.ConnectionId;
            var lobby = await _lobbyService.GetLobbyAsync(lobbyId);
            
            if (lobby != null)
            {
                // Find the player's color to make their country available again
                var leavingPlayer = lobby.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (leavingPlayer != null)
                {
                    // Make the country with this color available again
                    var country = lobby.GameState.Countries.FirstOrDefault(c => c.Color == leavingPlayer.Color);
                    if (country != null)
                    {
                        country.IsAvailable = true;
                    }
                }
                
                var success = await _lobbyService.LeaveLobbyAsync(lobbyId, playerId);
                if (success)
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, lobbyId);
                    await Clients.Group(lobbyId).SendAsync("PlayerLeft", playerId);
                    
                    // Get updated lobby info
                    var updatedLobby = await _lobbyService.GetLobbyAsync(lobbyId);
                    if (updatedLobby != null)
                    {
                        await Clients.Group(lobbyId).SendAsync("GameStateUpdated", updatedLobby.GameState);
                    }
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