import type { Server, Socket } from 'socket.io';
import { games, lobbies, playerLobbyMap } from '../store/index.js';
import { getDefaultGameState } from '../config/defaultGameState.js';
import { calculateDistance } from '../utils/calculateDistance.js';
// import interfaces as needed
import type { Army } from '../interfaces/Army';
import type { Country } from '../interfaces/Country';
import type { GameState } from '../interfaces/GameState';

export function registerGameEvents(io: Server, socket: Socket) {
  // --- START GAME ---
  socket.on('start_game', () => {
    const lobbyId = playerLobbyMap.get(socket.id);
    if (!lobbyId) return socket.emit('error', 'You are not in a lobby');
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return socket.emit('error', 'Lobby not found');
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return socket.emit('error', 'You are not in this lobby');
    if (lobby.players[0].id !== socket.id) return socket.emit('error', 'Only the lobby creator can start the game');
    if (!player.selectedCountry) return socket.emit('error', 'You must select a country before starting the game');

    lobby.inProgress = true;
    const gameId = lobbyId;
    const defaultGameState = getDefaultGameState();
    const gameState = {
      ...defaultGameState,
      GameId: gameId,
      Players: lobby.players.map(p => p.id),
      PlayerCountries: {},
      CurrentTurnPlayerId: lobby.players[0].id
    };
    games.set(gameId, gameState);

    lobby.players.forEach(lobbyPlayer => {
      const playerSocket = io.sockets.sockets.get(lobbyPlayer.id);
      if (playerSocket) {
        playerSocket.join(gameId);
        if (lobbyPlayer.selectedCountry) {
          gameState.PlayerCountries[lobbyPlayer.id] = lobbyPlayer.selectedCountry;
          const country = gameState.Countries.find((c: Country) => c.Id === lobbyPlayer.selectedCountry);
          if (country) country.PlayerId = lobbyPlayer.id;
        }
      }
    });

    io.to(lobbyId).emit('game_started', lobbyId);
    io.to(lobbyId).emit('game_created', { gameId, gameState });
    io.to(lobbyId).emit('game_joined', gameState);
    io.emit('lobbies_updated', Array.from(lobbies.values()));
  });

  // --- CREATE GAME ---
  socket.on('create_game', (lobbyId: string) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return socket.emit('error', 'Lobby not found');
    const gameId = lobbyId;
    const defaultGameState = getDefaultGameState();
    const gameState = {
      ...defaultGameState,
      GameId: gameId,
      Players: lobby.players.map(p => p.id),
      PlayerCountries: {},
      CurrentTurnPlayerId: lobby.players[0].id
    };
    games.set(gameId, gameState);

    lobby.players.forEach(player => {
      const playerSocket = io.sockets.sockets.get(player.id);
      if (playerSocket) playerSocket.join(gameId);
    });

    io.to(lobbyId).emit('game_created', { gameId, gameState });
  });

  // --- JOIN GAME ---
  socket.on('join_game', (gameId: string, countryId: string) => {
    const gameState = games.get(gameId);
    if (!gameState) return socket.emit('error', 'Game not found');
    const playerName = socket.data.playerName;

    let existingPlayerId = null;
    if (playerName) {
      const lobby = lobbies.get(gameId);
      if (lobby) {
        const playerInLobby = lobby.players.find(p => p.name === playerName);
        if (playerInLobby && playerInLobby.id !== socket.id) {
          existingPlayerId = playerInLobby.id;
          if (gameState.PlayerCountries[existingPlayerId]) {
            countryId = gameState.PlayerCountries[existingPlayerId];
          }
        }
      }
    }

    if (countryId !== "observer") {
      gameState.PlayerCountries[socket.id] = countryId;
      const country = gameState.Countries.find((c: Country) => c.Id === countryId);
      if (country) country.PlayerId = socket.id;
    } else {
      if (!gameState.Players.includes(socket.id)) {
        gameState.Players.push(socket.id);
      }
    }

    socket.join(gameId);
    socket.emit('game_joined', gameState);
    io.to(gameId).emit('game_updated', gameState);
  });

  // --- LEAVE GAME ---
  socket.on('leave_game', () => {
    for (const [gameId, gameState] of games.entries()) {
      if (gameState.Players.includes(socket.id)) {
        gameState.Players = gameState.Players.filter((id: string) => id !== socket.id);
        if (gameState.PlayerCountries[socket.id]) {
          const countryId = gameState.PlayerCountries[socket.id];
          const country = gameState.Countries.find((c: Country) => c.Id === countryId);
          if (country) country.PlayerId = null;
          delete gameState.PlayerCountries[socket.id];
        }
        socket.leave(gameId);
        if (gameState.Players.length === 0) {
          games.delete(gameId);
        } else {
          io.to(gameId).emit('game_updated', gameState);
        }
      }
    }
  });

  // --- END TURN ---
  socket.on('end_turn', () => {
    let gameId: string | null = null;
    for (const [id, state] of games.entries()) {
      if (state.Players && state.Players.includes(socket.id)) {
        gameId = id;
        break;
      }
    }

    if (!gameId) {
      const potentialGameId = playerLobbyMap.get(socket.id);
      if (potentialGameId && games.has(potentialGameId)) {
        const potentialGameState = games.get(potentialGameId);
        if (potentialGameState && potentialGameState.Players && potentialGameState.Players.includes(socket.id)) {
          gameId = potentialGameId;
        }
      }
      if (!gameId) return socket.emit('error', 'Could not determine the game you are in.');
    }

    const gameState = games.get(gameId);
    if (!gameState) return socket.emit('error', 'Game not found.');

    if (gameState.CurrentTurnPlayerId !== socket.id) {
      return socket.emit('error', "It's not your turn.");
    }

    const activePlayerIds = gameState.Players.filter((playerId: string) =>
      gameState.PlayerCountries && gameState.PlayerCountries.hasOwnProperty(playerId)
    );

    if (activePlayerIds.length === 0) {
      io.to(gameId).emit('game_updated', gameState);
      return;
    }

    const currentPlayerIndex = activePlayerIds.indexOf(gameState.CurrentTurnPlayerId);
    if (currentPlayerIndex === -1) {
      gameState.CurrentTurnPlayerId = activePlayerIds[0];
    } else {
      const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayerIds.length;
      const nextPlayerId = activePlayerIds[nextPlayerIndex];
      gameState.CurrentTurnPlayerId = nextPlayerId;

      if (nextPlayerIndex === 0) {
        try {
          const currentDate = new Date(gameState.CurrentDate);
          currentDate.setMonth(currentDate.getMonth() + 3);
          gameState.CurrentDate = currentDate.toISOString();
          if (gameState.Armies && Array.isArray(gameState.Armies)) {
            gameState.Armies.forEach((army: Army) => {
              army.moves_remaining = 5;
            });
          }
        } catch (dateError) {
          // Handle date error
        }
      }
    }

    io.to(gameId).emit('game_updated', gameState);
  });

  // --- GENERIC GAME ACTION ---
  socket.on('game_action', ({ gameId, type, payload }) => {
    const gameState = games.get(gameId);
    const playerId = socket.id;

    if (!gameState) return socket.emit('error', 'Game not found.');
    if (!gameState.Players || !gameState.Players.includes(playerId)) {
      return socket.emit('error', 'You are not a player in this game.');
    }

    switch (type) {
      case 'MOVE_ARMY': {
        const { armyId, targetProvinceId } = payload;
        const army = gameState.Armies?.find((a: Army) => a.id === armyId);
        if (!army) return socket.emit('move_invalid', { armyId, reason: 'Army not found.' });

        const playerCountryId = gameState.PlayerCountries?.[playerId];
        if (!playerCountryId || army.country_id !== playerCountryId) {
          return socket.emit('move_invalid', { armyId, reason: 'Army does not belong to you.' });
        }

        if (army.moves_remaining <= 0) {
          return socket.emit('move_invalid', { armyId, reason: 'Army has no moves remaining.' });
        }

        const currentProvinceId = army.province_id;
        if (!gameState.Provinces) {
          return socket.emit('move_invalid', { armyId, reason: 'Server error: Province data unavailable.' });
        }
        const distance = calculateDistance(currentProvinceId, targetProvinceId, gameState.Provinces);

        if (distance === Infinity) {
          return socket.emit('move_invalid', { armyId, reason: 'Target province is unreachable.' });
        }
        if (distance > army.moves_remaining) {
          return socket.emit('move_invalid', { armyId, reason: `Not enough moves remaining (need ${distance}, have ${army.moves_remaining}).` });
        }

        army.province_id = targetProvinceId;
        army.moves_remaining -= distance;
        io.to(gameId).emit('game_updated', gameState);
        break;
      }
      // Future: handle other action types here (e.g. ATTACK)
      default:
        // Unknown game_action
        break;
    }
  });
}
