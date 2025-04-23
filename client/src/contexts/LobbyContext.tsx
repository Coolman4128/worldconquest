import React, { createContext, useContext, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Lobby, LobbyContextType } from '../types/game';

const SOCKET_URL = 'http://localhost:3000';

const LobbyContext = createContext<LobbyContextType | null>(null);

export const useLobby = () => {
  const context = useContext(LobbyContext);
  if (!context) {
    throw new Error('useLobby must be used within a LobbyProvider');
  }
  return context;
};

interface ServerToClientEvents {
  lobbies_updated: (lobbies: Lobby[]) => void;
  lobby_joined: (lobby: Lobby) => void;
  lobby_created: (lobby: Lobby) => void;
  game_started: (gameId: string) => void;
  error: (message: string) => void;
}

interface ClientToServerEvents {
  get_lobbies: () => void;
  create_lobby: (name: string, playerName: string) => void;
  join_lobby: (lobbyId: string, playerName: string) => void;
  leave_lobby: () => void;
  start_game: () => void;
  select_country: (countryId: string) => void;
}

export const LobbyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<string | null>(null); // Store gameId when game is started

  const connect = useCallback(() => {
    const newSocket = io(SOCKET_URL) as Socket<ServerToClientEvents, ClientToServerEvents>;
    
    newSocket.on('connect', () => {
      console.log('Connected to lobby server');
      setIsConnected(true);
      newSocket.emit('get_lobbies');
    });

    newSocket.on('lobbies_updated', (updatedLobbies) => {
      console.log('Lobbies updated:', updatedLobbies);
      setLobbies(updatedLobbies);
      
      // If we're in a lobby, update our current lobby data
      if (currentLobby) {
        const updatedLobby = updatedLobbies.find(lobby => lobby.id === currentLobby.id);
        if (updatedLobby) {
          console.log('Updating current lobby:', updatedLobby);
          console.log('Players in updated lobby:', updatedLobby.players);
          console.log('Lobby in progress?', updatedLobby.inProgress);
          console.log('All players selected country?', updatedLobby.players.every(p => p.selectedCountry !== null));
          
          // Check if the lobby status changed from not in progress to in progress
          if (!currentLobby.inProgress && updatedLobby.inProgress) {
            console.log('IMPORTANT: Lobby status changed to in progress!');
          }
          
          setCurrentLobby(updatedLobby);
        } else {
          console.log('Could not find current lobby in updated lobbies list');
        }
      }
    });

    newSocket.on('lobby_created', (lobby) => {
      console.log('Lobby created:', lobby);
      setCurrentLobby(lobby);
    });

    newSocket.on('lobby_joined', (lobby) => {
      console.log('Lobby joined:', lobby);
      console.log('Players in joined lobby:', lobby.players);
      console.log('All players selected country?', lobby.players.every(p => p.selectedCountry !== null));
      setCurrentLobby(lobby);
      
      // Also update the lobby in the lobbies list
      setLobbies(prevLobbies => {
        const updatedLobbies = prevLobbies.map(l => l.id === lobby.id ? lobby : l);
        return updatedLobbies;
      });
    });

    newSocket.on('game_started', (gameId) => {
      console.log('=== GAME_STARTED EVENT RECEIVED ===');
      console.log('Game started with ID:', gameId);
      
      // Store the gameId directly, regardless of currentLobby state
      console.log('Setting gameStarted state to:', gameId);
      setGameStarted(gameId);
      
      // Also try to update the lobby if it exists
      if (currentLobby) {
        console.log('Current lobby before update:', currentLobby);
        console.log('Marking lobby as in progress for all players');
        setCurrentLobby({
          ...currentLobby,
          inProgress: true
        });
        console.log('Lobby should now be marked as in progress');
      } else {
        console.log('WARNING: No current lobby found when game_started event received');
        console.log('But gameStarted state has been set, so game transition should still work');
      }
    });

    newSocket.on('error', (message) => {
      console.error('Socket error:', message);
      setError(message);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentLobby]);

  const refreshLobbies = useCallback(() => {
    if (socket) {
      socket.emit('get_lobbies');
    }
  }, [socket]);

  const createLobby = useCallback((name: string) => {
    if (socket && playerName) {
      socket.emit('create_lobby', name, playerName);
    }
  }, [socket, playerName]);

  const joinLobby = useCallback((lobbyId: string) => {
    if (socket && playerName) {
      socket.emit('join_lobby', lobbyId, playerName);
    }
  }, [socket, playerName]);

  const leaveLobby = useCallback(() => {
    if (socket) {
      socket.emit('leave_lobby');
      setCurrentLobby(null);
    }
  }, [socket]);

  const startGame = useCallback(() => {
    if (socket && currentLobby) {
      socket.emit('start_game');
    }
  }, [socket, currentLobby]);

  const selectCountry = useCallback((countryId: string) => {
    if (socket && countryId) {
      console.log('Emitting select_country event with countryId:', countryId);
      socket.emit('select_country', countryId);
    }
  }, [socket]);

  const updatePlayerName = useCallback((name: string) => {
    setPlayerName(name);
  }, []);

  const value: LobbyContextType = {
    lobbies,
    currentLobby,
    playerName,
    isConnected,
    error,
    gameStarted,
    connect,
    setPlayerName: updatePlayerName,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    refreshLobbies,
    selectCountry,
  };

  return (
    <LobbyContext.Provider value={value}>
      {children}
    </LobbyContext.Provider>
  );
};