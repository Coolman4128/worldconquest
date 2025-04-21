using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using WorldConquest.Models;
using WorldConquest.Services;

namespace WorldConquest.Hubs
{
    public class GameHub : Hub
    {
        private readonly ILobbyService _lobbyService;
        private readonly IGameService _gameService;
        
        public GameHub(ILobbyService lobbyService, IGameService gameService)
        {
            _lobbyService = lobbyService;
            _gameService = gameService;
        }
        
        // Connection management
        
        public override async Task OnConnectedAsync()
        {
            await Clients.Caller.SendAsync("ConnectionEstablished", Context.ConnectionId);
            await base.OnConnectedAsync();
        }
        
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            // Update player connection status in any lobbies
            await _lobbyService.HandlePlayerDisconnect(Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
        }
        
        // Lobby management
        
        public async Task CreateLobby(string playerName, string lobbyName, int maxPlayers, bool isPasswordProtected, string password)
        {
            try
            {
                var player = new Player(Context.ConnectionId, playerName);
                var lobby = await _lobbyService.CreateLobby(player, lobbyName, maxPlayers, isPasswordProtected, password);
                
                await Groups.AddToGroupAsync(Context.ConnectionId, lobby.Id);
                await Clients.Caller.SendAsync("LobbyCreated", lobby);
                await Clients.All.SendAsync("LobbyListUpdated", await _lobbyService.GetPublicLobbies());
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task JoinLobby(string playerName, string lobbyId, string password = null)
        {
            try
            {
                var player = new Player(Context.ConnectionId, playerName);
                var lobby = await _lobbyService.JoinLobby(player, lobbyId, password);
                
                await Groups.AddToGroupAsync(Context.ConnectionId, lobby.Id);
                await Clients.Group(lobby.Id).SendAsync("PlayerJoined", player);
                await Clients.Caller.SendAsync("LobbyJoined", lobby);
                await Clients.All.SendAsync("LobbyListUpdated", await _lobbyService.GetPublicLobbies());
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task LeaveLobby(string lobbyId)
        {
            try
            {
                var lobby = await _lobbyService.LeaveLobby(Context.ConnectionId, lobbyId);
                
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, lobbyId);
                await Clients.Group(lobbyId).SendAsync("PlayerLeft", Context.ConnectionId);
                await Clients.All.SendAsync("LobbyListUpdated", await _lobbyService.GetPublicLobbies());
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task GetLobbies()
        {
            try
            {
                var lobbies = await _lobbyService.GetPublicLobbies();
                await Clients.Caller.SendAsync("LobbiesReceived", lobbies);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task SetPlayerReady(string lobbyId, bool isReady)
        {
            try
            {
                var lobby = await _lobbyService.SetPlayerReady(Context.ConnectionId, lobbyId, isReady);
                await Clients.Group(lobbyId).SendAsync("PlayerReadyChanged", Context.ConnectionId, isReady);
                
                // Check if all players are ready to start the game
                if (lobby.AreAllPlayersReady())
                {
                    await Clients.Group(lobbyId).SendAsync("AllPlayersReady");
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        // Game management
        
        public async Task StartGame(string lobbyId)
        {
            try
            {
                var gameState = await _gameService.StartGame(lobbyId, Context.ConnectionId);
                await Clients.Group(lobbyId).SendAsync("GameStarted", gameState);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task GetGameState(string gameStateId)
        {
            try
            {
                var gameState = await _gameService.GetGameState(gameStateId);
                await Clients.Caller.SendAsync("GameStateReceived", gameState);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task SaveGameState(string gameStateId)
        {
            try
            {
                bool success = await _gameService.SaveGameState(gameStateId);
                if (success)
                {
                    await Clients.Caller.SendAsync("GameStateSaved", gameStateId);
                }
                else
                {
                    throw new Exception("Failed to save game state");
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task LoadGameState(string savedGamePath)
        {
            try
            {
                var gameState = await _gameService.LoadGameState(savedGamePath);
                
                // Add all players to the game's SignalR group
                foreach (var player in gameState.Players.Keys)
                {
                    await Groups.AddToGroupAsync(player, gameState.LobbyId);
                }
                
                await Clients.Caller.SendAsync("GameStateLoaded", gameState);
                await Clients.Group(gameState.LobbyId).SendAsync("GameStarted", gameState);
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        public async Task EndTurn(string gameStateId)
        {
            try
            {
                var gameState = await _gameService.EndPlayerTurn(Context.ConnectionId, gameStateId);
                
                // Notify all players in the game about the turn change
                await Clients.Group(gameState.LobbyId).SendAsync("TurnEnded", Context.ConnectionId);
                
                // If all players have finished their turn, advance to the next turn
                if (gameState.Players.Values.All(p => p.HasFinishedTurn))
                {
                    gameState = await _gameService.AdvanceToNextTurn(gameStateId);
                    await Clients.Group(gameState.LobbyId).SendAsync("NextTurnStarted", gameState);
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        // Chat functionality
        
        public async Task SendChatMessage(string gameStateId, string message)
        {
            try
            {
                bool isAllyMessage = message.StartsWith("/ally ");
                if (isAllyMessage)
                {
                    message = message.Substring(6); // Remove "/ally " prefix
                }
                
                var gameState = await _gameService.AddChatMessage(Context.ConnectionId, gameStateId, message, isAllyMessage);
                
                if (isAllyMessage)
                {
                    // Send only to allies
                    var player = gameState.Players[Context.ConnectionId];
                    var country = gameState.Countries[player.CountryId];
                    
                    foreach (var otherPlayer in gameState.Players.Values)
                    {
                        if (otherPlayer.Id == Context.ConnectionId)
                        {
                            // Always send to the sender
                            await Clients.Client(otherPlayer.Id).SendAsync("ChatMessageReceived", gameState.ChatMessages.Last());
                        }
                        else if (!string.IsNullOrEmpty(otherPlayer.CountryId))
                        {
                            var otherCountry = gameState.Countries[otherPlayer.CountryId];
                            
                            // Check if countries are allied
                            if (country.DiplomaticRelations.TryGetValue(otherCountry.Id, out var relation) &&
                                (relation == DiplomaticRelation.Allied || relation == DiplomaticRelation.DefensiveAlliance))
                            {
                                await Clients.Client(otherPlayer.Id).SendAsync("ChatMessageReceived", gameState.ChatMessages.Last());
                            }
                        }
                    }
                }
                else
                {
                    // Send to all players in the game
                    await Clients.Group(gameState.LobbyId).SendAsync("ChatMessageReceived", gameState.ChatMessages.Last());
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }
        
        // Test method for verifying connection
        public async Task TestConnection()
        {
            await Clients.Caller.SendAsync("TestConnectionResponse", "Connection successful!");
        }
    }
}