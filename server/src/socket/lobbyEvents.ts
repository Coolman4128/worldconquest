import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { lobbies, playerLobbyMap } from '../store/index.js';
import { getDefaultGameState } from '../config/defaultGameState.js';
import type { Lobby } from '../interfaces/Lobby.js';
import type { Country } from '../interfaces/Country.js';

export function registerLobbyEvents(io: Server, socket: Socket) {
  socket.on('get_lobbies', () => {
    socket.emit('lobbies_updated', Array.from(lobbies.values()));
  });

  socket.on('create_lobby', (name: string, playerName: string) => {
    const lobbyId = uuidv4();
    const defaultGameState = getDefaultGameState();
    const countries = defaultGameState.Countries.map((country: Country) => ({
      Id: country.Id,
      Name: country.Name,
      Color: country.Color,
      PlayerId: null
    }));

    const newLobby: Lobby = {
      id: lobbyId,
      name,
      players: [{
        id: socket.id,
        name: playerName,
        selectedCountry: null
      }],
      maxPlayers: 8,
      inProgress: false,
      createdAt: new Date().toISOString(),
      availableCountries: countries
    };

    lobbies.set(lobbyId, newLobby);
    playerLobbyMap.set(socket.id, lobbyId);

    socket.join(lobbyId);
    socket.emit('lobby_created', newLobby);
    io.emit('lobbies_updated', Array.from(lobbies.values()));
  });

  socket.on('join_lobby', (lobbyId: string, playerName: string) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return socket.emit('error', 'Lobby not found');
    if (lobby.inProgress) return socket.emit('error', 'Game already in progress');
    if (lobby.players.length >= lobby.maxPlayers) return socket.emit('error', 'Lobby is full');

    socket.data.playerName = playerName;

    lobby.players.push({
      id: socket.id,
      name: playerName,
      selectedCountry: null
    });

    playerLobbyMap.set(socket.id, lobbyId);

    socket.join(lobbyId);
    socket.emit('lobby_joined', lobby);

    io.emit('lobbies_updated', Array.from(lobbies.values()));
    io.to(lobbyId).emit('lobby_joined', lobby);
  });

  socket.on('leave_lobby', () => {
    const lobbyId = playerLobbyMap.get(socket.id);
    if (lobbyId) {
      const lobby = lobbies.get(lobbyId);
      if (lobby) {
        lobby.players = lobby.players.filter(player => player.id !== socket.id);
        if (lobby.players.length === 0) lobbies.delete(lobbyId);
        socket.leave(lobbyId);
        playerLobbyMap.delete(socket.id);
        io.emit('lobbies_updated', Array.from(lobbies.values()));
      }
    }
  });

  socket.on('select_country', (countryId: string) => {
    const lobbyId = playerLobbyMap.get(socket.id);
    if (!lobbyId) return socket.emit('error', 'You are not in a lobby');
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return socket.emit('error', 'Lobby not found');
    const isCountryTaken = lobby.players.some(p => p.id !== socket.id && p.selectedCountry === countryId);
    if (isCountryTaken) return socket.emit('error', 'This country is already selected by another player');
    const player = lobby.players.find(p => p.id === socket.id);
    if (player) {
      player.selectedCountry = countryId;
      lobbies.set(lobbyId, lobby);
      io.emit('lobbies_updated', Array.from(lobbies.values()));
      io.to(lobbyId).emit('lobby_joined', lobby);
    }
  });
}
