import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GameState, GameContextType, MapPosition } from '../types/game';
import { useLobby } from './LobbyContext';

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

// We no longer need the ServerToClientEvents and ClientToServerEvents interfaces
// as we're using the socket from LobbyContext

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playerName, gameStarted, currentLobby, socket, isConnected } = useLobby();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  // Removed selectedProvince state; now handled by ProvinceSelectionContext
  const [mapPosition, setMapPosition] = useState<MapPosition>(defaultMapPosition);
  const [gameReady, setGameReady] = useState(false); // New state to track if game is ready
  
  // Queue for pending operations that need a socket
  const [pendingCreateGame, setPendingCreateGame] = useState<string | null>(null);
  const [pendingJoinGame, setPendingJoinGame] = useState<{gameId: string, countryId: string} | null>(null);

  // Use the socket from LobbyContext instead of creating a new one
  useEffect(() => {
    if (socket) {
      console.log('Using socket from LobbyContext');
      
      // Set player ID from the socket
      if (socket.id) {
        setPlayerId(socket.id);
      }
      
      // Set up game-related event listeners
      socket.on('game_created', handleGameCreated);
      socket.on('game_joined', handleGameJoined);
      socket.on('game_updated', handleGameUpdated);
      
      return () => {
        // Clean up event listeners when component unmounts
        socket.off('game_created', handleGameCreated);
        socket.off('game_joined', handleGameJoined);
        socket.off('game_updated', handleGameUpdated);
      };
    }
  }, [socket]);
  
  // Handler functions for socket events
  const handleGameCreated = useCallback(({ gameId, gameState }: { gameId: string; gameState: GameState }) => {
    console.log('Game created:', gameId);
    console.log('Received initial game state:', gameState);
    setGameState(gameState);
    // Don't set gameReady here - wait for game_joined event
  }, []);
  
  const handleGameJoined = useCallback((gameState: GameState) => {
    console.log('Game joined with state:', gameState);
    setGameState(gameState);
    setGameReady(true); // Mark the game as ready when we receive the game state
    console.log('Game is now ready to be displayed');
    
    // Find the player ID in the lobby that matches the current player name
    if (playerName && currentLobby) {
      console.log('Looking for player with name:', playerName, 'in lobby:', currentLobby.id);
      
      // Find the player in the current lobby that matches the current player name
      const playerInLobby = currentLobby.players.find(p => p.name === playerName);
      
      if (playerInLobby) {
        console.log('Found player in lobby:', playerInLobby);
        console.log('Setting player ID to:', playerInLobby.id);
        
        // Update the player ID to match the one from the lobby
        setPlayerId(playerInLobby.id);
        
        // Log the player's country for debugging
        const playerCountry = playerInLobby.selectedCountry;
        console.log('Player selected country:', playerCountry);
        
        // Check if this player's country is in the game state
        if (gameState.PlayerCountries && playerInLobby.id in gameState.PlayerCountries) {
          console.log('Player country in game state:', gameState.PlayerCountries[playerInLobby.id]);
        } else {
          console.log('Player country not found in game state PlayerCountries');
        }
      } else {
        console.log('Player not found in lobby, using socket ID as fallback');
        if (socket) {
          console.log('Current socket ID:', socket.id);
        }
      }
    }
  }, [playerName, currentLobby, socket]);
  
  const handleGameUpdated = useCallback((gameState: GameState) => {
    console.log('Game updated');
    setGameState(gameState);
  }, []);

  // No need for connect function anymore as we're using the socket from LobbyContext

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
    if (gameStarted && socket && isConnected) {
      console.log('GameContext: Detected game started, automatically joining game:', gameStarted);
      
      // Find the player's selected country in the lobby
      if (currentLobby) {
        console.log('Current lobby:', currentLobby);
        
        // Find the player in the lobby that matches the current player name
        const player = currentLobby.players.find(p => p.name === playerName);
        
        if (player) {
          console.log('Found player in lobby:', player);
          
          // If the player has selected a country, join with that country
          if (player.selectedCountry) {
            console.log('Joining game with country:', player.selectedCountry);
            socket.emit('join_game', gameStarted, player.selectedCountry);
          } else {
            // Otherwise join as observer
            console.log('Joining game as observer (no country selected)');
            socket.emit('join_game', gameStarted, "observer");
          }
        } else {
          console.log('Player not found in lobby, joining as observer');
          socket.emit('join_game', gameStarted, "observer");
        }
      } else {
        console.log('No current lobby found, joining as observer');
        socket.emit('join_game', gameStarted, "observer");
      }
    }
  }, [gameStarted, socket, isConnected, currentLobby, playerName]);

  const createGame = useCallback((lobbyId: string) => {
    if (!socket || !isConnected) {
      console.log('Socket not connected, queueing create_game');
      setPendingCreateGame(lobbyId);
    } else {
      console.log('Emitting create_game for lobby:', lobbyId);
      socket.emit('create_game', lobbyId);
    }
  }, [socket, isConnected]);

  const joinGame = useCallback((gameId: string, countryId: string) => {
    if (!socket || !isConnected) {
      console.log('Socket not connected, queueing join_game');
      setPendingJoinGame({ gameId, countryId });
    } else {
      console.log('Emitting join_game for game:', gameId, 'with country:', countryId);
      socket.emit('join_game', gameId, countryId);
    }
  }, [socket, isConnected]);

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
    connect: () => {}, // Dummy function since we're using LobbyContext's socket
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