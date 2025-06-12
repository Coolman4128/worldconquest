import type { Server, Socket } from 'socket.io';
import { registerLobbyEvents } from './lobbyEvents.js';
import { registerGameEvents } from './gameEvents.js';
import { registerPlayerEvents } from './playerEvents.js';

// You can add more as needed

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Register event groups
    registerLobbyEvents(io, socket);
    registerGameEvents(io, socket);
    registerPlayerEvents(io, socket);
    // Add more here as you grow
  });
}
