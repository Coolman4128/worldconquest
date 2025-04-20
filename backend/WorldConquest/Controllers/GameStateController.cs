using Microsoft.AspNetCore.Mvc;
using WorldConquest.Models;
using WorldConquest.Services;

namespace WorldConquest.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GameStateController : ControllerBase
    {
        private readonly IGameStateService _gameStateService;
        private readonly ILobbyService _lobbyService;

        public GameStateController(IGameStateService gameStateService, ILobbyService lobbyService)
        {
            _gameStateService = gameStateService;
            _lobbyService = lobbyService;
        }

        [HttpGet("default")]
        public async Task<ActionResult<GameState>> GetDefaultGameState()
        {
            var gameState = await _gameStateService.CreateDefaultGameStateAsync();
            return Ok(gameState);
        }

        [HttpGet("{lobbyId}")]
        public async Task<ActionResult<GameState>> GetGameState(string lobbyId)
        {
            var lobby = await _lobbyService.GetLobbyAsync(lobbyId);
            if (lobby == null)
            {
                return NotFound();
            }
            return Ok(lobby.GameState);
        }

        [HttpPut("{lobbyId}")]
        public async Task<ActionResult> UpdateGameState(string lobbyId, [FromBody] GameState gameState)
        {
            var lobby = await _lobbyService.GetLobbyAsync(lobbyId);
            if (lobby == null)
            {
                return NotFound();
            }

            lobby.GameState = gameState;
            await _gameStateService.UpdateGameStateAsync(lobbyId, gameState);
            return NoContent();
        }

        [HttpPost("{lobbyId}/advance-turn")]
        public async Task<ActionResult> AdvanceTurn(string lobbyId)
        {
            var success = await _gameStateService.AdvanceTurnAsync(lobbyId);
            if (!success)
            {
                return NotFound();
            }
            return NoContent();
        }

        [HttpPost("{lobbyId}/advance-year")]
        public async Task<ActionResult> AdvanceYear(string lobbyId)
        {
            var success = await _gameStateService.AdvanceYearAsync(lobbyId);
            if (!success)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}