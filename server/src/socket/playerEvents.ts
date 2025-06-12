import type { Server, Socket } from 'socket.io';
import { lobbies, games, playerLobbyMap } from '../store/index.js';

export function registerPlayerEvents(io: Server, socket: Socket) {
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const lobbyId = playerLobbyMap.get(socket.id);
    if (lobbyId) {
      const lobby = lobbies.get(lobbyId);
      if (lobby) {
        lobby.players = lobby.players.filter(player => player.id !== socket.id);
        if (lobby.players.length === 0) lobbies.delete(lobbyId);
        else io.to(lobbyId).emit('lobbies_updated', Array.from(lobbies.values()));
        playerLobbyMap.delete(socket.id);
      }
    }
    for (const [gameId, gameState] of games.entries()) {
      if (gameState.Players.includes(socket.id)) {
        gameState.Players = gameState.Players.filter((id: string) => id !== socket.id);
        if (gameState.PlayerCountries[socket.id]) {
          const countryId = gameState.PlayerCountries[socket.id];
          const country = gameState.Countries.find((c: any) => c.Id === countryId);
          if (country) country.PlayerId = null;
          delete gameState.PlayerCountries[socket.id];
        }
        if (gameState.Players.length === 0) games.delete(gameId);
        else io.to(gameId).emit('game_updated', gameState);
      }
    }
  });
}
