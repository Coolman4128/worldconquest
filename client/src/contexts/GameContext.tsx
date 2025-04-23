import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, GameContextType, MapPosition } from '../types/game';
import { useLobby } from './LobbyContext';

const SOCKET_URL = 'http://localhost:3000';

const defaultMapPosition: MapPosition = {
  x: 0,
  y: 0,
  scale: 1,
  targetX: 0,
  targetY: 0,
  targetScale: 1,
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
  create_game: (lobbyId: string) => void;
  join_game: (gameId: string, countryId: string) => void;
  select_country: (countryId: string) => void;
  leave_game: () => void;
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playerName, gameStarted } = useLobby();
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  // Removed selectedProvince state; now handled by ProvinceSelectionContext
  const [mapPosition, setMapPosition] = useState<MapPosition>(defaultMapPosition);
  const [isConnected, setIsConnected] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [gameReady, setGameReady] = useState(false); // New state to track if game is ready
  
  // Queue for pending operations that need a socket
  const [pendingCreateGame, setPendingCreateGame] = useState<string | null>(null);
  const [pendingJoinGame, setPendingJoinGame] = useState<{gameId: string, countryId: string} | null>(null);

  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (socketInitialized) {
      console.log('Socket already initialized, not connecting again');
      return;
    }

    // If already connected, don't create a new connection
    if (socket && socket.connected) {
      console.log('Game socket already connected');
      return;
    }

    console.log('Connecting game socket...');
    setSocketInitialized(true);
    
    const newSocket = io(SOCKET_URL) as Socket<ServerToClientEvents, ClientToServerEvents>;
    
    newSocket.on('connect', () => {
      console.log('Game socket connected');
      const id = newSocket.id;
      if (id) {
        setPlayerId(id);
      }
      setIsConnected(true);
    });

    newSocket.on('game_created', ({ gameId, gameState }) => {
      console.log('Game created:', gameId);
      console.log('Received initial game state:', gameState);
      setGameState(gameState);
      // Don't set gameReady here - wait for game_joined event
    });

    newSocket.on('game_joined', (gameState) => {
      console.log('Game joined with state:', gameState);
      setGameState(gameState);
      setGameReady(true); // Mark the game as ready when we receive the game state
      console.log('Game is now ready to be displayed');
    });

    newSocket.on('game_updated', (gameState) => {
      console.log('Game updated');
      setGameState(gameState);
    });

    newSocket.on('error', (message) => {
      console.error('Game socket error:', message);
    });

    newSocket.on('disconnect', () => {
      console.log('Game socket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      setSocketInitialized(false);
    };
  }, []); // Empty dependency array to ensure this only runs once

  // Connect the socket when the provider mounts - only once
  useEffect(() => {
    if (!socketInitialized) {
      connect();
    }
    
    // Cleanup function
    return () => {
      if (socket) {
        console.log('Cleaning up game socket connection');
        socket.close();
        setSocketInitialized(false);
      }
    };
  }, [connect, socket, socketInitialized]);

  // Process pending operations when socket becomes available
  useEffect(() => {
    if (socket && isConnected) {
      // Process pending create game
      if (pendingCreateGame) {
        console.log('Processing pending create_game for lobby:', pendingCreateGame);
        socket.emit('create_game', pendingCreateGame);
        setPendingCreateGame(null);
      }
      
      // Process pending join game
      if (pendingJoinGame) {
        console.log('Processing pending join_game for game:', pendingJoinGame.gameId, 'with country:', pendingJoinGame.countryId);
        socket.emit('join_game', pendingJoinGame.gameId, pendingJoinGame.countryId);
        setPendingJoinGame(null);
      }
    }
  }, [socket, isConnected, pendingCreateGame, pendingJoinGame]);

  // Effect to automatically join the game when gameStarted is set
  useEffect(() => {
    if (gameStarted && socket && isConnected && playerId) {
      console.log('GameContext: Detected game started, automatically joining game:', gameStarted);
      
      // Find the player's selected country in the lobby
      const lobby = gameStarted ? { id: gameStarted } : null;
      
      if (lobby) {
        console.log('Automatically joining game with ID:', lobby.id);
        socket.emit('join_game', lobby.id, "observer");
      }
    }
  }, [gameStarted, socket, isConnected, playerId]);

  const createGame = useCallback((lobbyId: string) => {
    // Ensure socket is connected first
    if (!socketInitialized) {
      console.log('Socket not initialized, connecting and queueing create_game');
      connect();
      setPendingCreateGame(lobbyId);
    } else if (!socket || !isConnected) {
      console.log('Socket not connected, queueing create_game');
      setPendingCreateGame(lobbyId);
    } else {
      console.log('Emitting create_game for lobby:', lobbyId);
      socket.emit('create_game', lobbyId);
    }
  }, [socket, isConnected, connect, socketInitialized]);

  const joinGame = useCallback((gameId: string, countryId: string) => {
    // Ensure socket is connected first
    if (!socketInitialized) {
      console.log('Socket not initialized, connecting and queueing join_game');
      connect();
      setPendingJoinGame({ gameId, countryId });
    } else if (!socket || !isConnected) {
      console.log('Socket not connected, queueing join_game');
      setPendingJoinGame({ gameId, countryId });
    } else {
      console.log('Emitting join_game for game:', gameId, 'with country:', countryId);
      socket.emit('join_game', gameId, countryId);
    }
  }, [socket, isConnected, connect, socketInitialized]);

  const selectCountry = useCallback((countryId: string) => {
    if (socket) {
      socket.emit('select_country', countryId);
    }
  }, [socket]);

  const leaveGame = useCallback(() => {
    if (socket) {
      socket.emit('leave_game');
      setGameState(null);
    }
  }, [socket]);

  // Removed selectProvince; now handled by ProvinceSelectionContext

  const updateMapPosition = useCallback((position: Partial<MapPosition>) => {
    setMapPosition(prev => ({
      ...prev,
      ...position
    }));
  }, []);

  const value = {
    gameState,
    playerId,
    playerName,
    // selectedProvince removed from context value
    mapPosition,
    gameReady, // Add gameReady to the context value
    connect,
    createGame,
    joinGame,
    selectCountry,
    leaveGame,
    // selectProvince removed from context value
    updateMapPosition,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};