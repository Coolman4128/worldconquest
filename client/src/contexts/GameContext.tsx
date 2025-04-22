import React, { createContext, useContext, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Province, GameContextType, MapPosition } from '../types/game';

const SOCKET_URL = 'http://localhost:3000';

const defaultMapPosition: MapPosition = {
  x: 0,
  y: 0,
  scale: 1,
};

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface ServerToClientEvents {
  game_created: (data: { gameId: string; gameState: GameState }) => void;
  game_joined: (gameState: GameState) => void;
  game_updated: (gameState: GameState) => void;
  error: (message: string) => void;
}

interface ClientToServerEvents {
  create_game: () => void;
  join_game: (gameId: string) => void;
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [mapPosition, setMapPosition] = useState<MapPosition>(defaultMapPosition);

  const connect = useCallback(() => {
    const newSocket = io(SOCKET_URL) as Socket<ServerToClientEvents, ClientToServerEvents>;
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      const id = newSocket.id;
      if (id) {
        setPlayerId(id);
      }
    });

    newSocket.on('game_created', ({ gameId, gameState }) => {
      console.log('Game created:', gameId);
      setGameState(gameState);
    });

    newSocket.on('game_joined', (gameState) => {
      console.log('Game joined');
      setGameState(gameState);
    });

    newSocket.on('game_updated', (gameState) => {
      console.log('Game updated');
      setGameState(gameState);
    });

    newSocket.on('error', (message) => {
      console.error('Socket error:', message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const createGame = useCallback(() => {
    if (socket) {
      socket.emit('create_game');
    }
  }, [socket]);

  const joinGame = useCallback((gameId: string) => {
    if (socket) {
      socket.emit('join_game', gameId);
    }
  }, [socket]);

  const selectProvince = useCallback((province: Province) => {
    setSelectedProvince(province);
  }, []);

  const updateMapPosition = useCallback((position: Partial<MapPosition>) => {
    setMapPosition(prev => ({
      ...prev,
      ...position
    }));
  }, []);

  const value = {
    gameState,
    playerId,
    selectedProvince,
    mapPosition,
    connect,
    createGame,
    joinGame,
    selectProvince,
    updateMapPosition,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};