using Microsoft.AspNetCore.Mvc;
using WorldConquest.Models;
using WorldConquest.Services;

namespace WorldConquest.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LobbyController : ControllerBase
    {
        private readonly ILobbyService _lobbyService;

        public LobbyController(ILobbyService lobbyService)
        {
            _lobbyService = lobbyService;
        }

        [HttpGet]
        public async Task<ActionResult<List<LobbyInfo>>> GetLobbies()
        {
            var lobbies = await _lobbyService.GetLobbiesAsync();
            return Ok(lobbies);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Lobby>> GetLobby(string id)
        {
            var lobby = await _lobbyService.GetLobbyAsync(id);
            if (lobby == null)
            {
                return NotFound();
            }
            return Ok(lobby);
        }

        [HttpPost]
        public async Task<ActionResult<Lobby>> CreateLobby([FromBody] CreateLobbyRequest request)
        {
            var lobby = await _lobbyService.CreateLobbyAsync(request.Name);
            return CreatedAtAction(nameof(GetLobby), new { id = lobby.Id }, lobby);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> CloseLobby(string id)
        {
            var success = await _lobbyService.CloseLobbyAsync(id);
            if (!success)
            {
                return NotFound();
            }
            return NoContent();
        }
    }

    public class CreateLobbyRequest
    {
        public string Name { get; set; } = string.Empty;
    }
}