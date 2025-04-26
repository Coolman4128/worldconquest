import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the client build directory
const clientBuildPath = join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Load default gamestate
let defaultGameState: any = null;

async function loadDefaultGameState() {
  try {
    const data = await fs.readFile(join(__dirname, '../../assets/default_gamestate.json'), 'utf-8');
    defaultGameState = JSON.parse(data);
    console.log('Default gamestate loaded');
  } catch (error) {
    console.error('Error loading default gamestate:', error);
    process.exit(1);
  }
}

// Define types for our server
interface Lobby {
  id: string;
  name: string;
  players: LobbyPlayer[];
  maxPlayers: number;
  inProgress: boolean;
  createdAt: string;
  availableCountries: Country[]; // Add countries to the lobby
}

interface LobbyPlayer {
  id: string;
  name: string;
  selectedCountry: string | null;
}

interface Country {
  Id: string;
  Name: string;
  Color: string;
  Money: number;
  PlayerId: string | null;
  Stability: number;
  Population: number;
}

interface GameState {
  GameId: string;
  Players: string[];
  Countries: Country[];
  PlayerCountries: Record<string, string>;
  [key: string]: any; // Allow other properties
}

// Game state storage (in-memory for now, will move to MongoDB later)
const games = new Map();
const lobbies = new Map<string, Lobby>();
const playerLobbyMap = new Map<string, string>(); // Maps playerId to lobbyId

// Socket.IO event handlers
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  // Lobby-related events
  socket.on('get_lobbies', () => {
    socket.emit('lobbies_updated', Array.from(lobbies.values()));
  });

  socket.on('create_lobby', (name: string, playerName: string) => {
    const lobbyId = uuidv4();
    
    // Get countries from default gamestate
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
    
    if (!lobby) {
      return socket.emit('error', 'Lobby not found');
    }
    
    if (lobby.inProgress) {
      return socket.emit('error', 'Game already in progress');
    }
    
    if (lobby.players.length >= lobby.maxPlayers) {
      return socket.emit('error', 'Lobby is full');
    }
    
    // Store player name in socket data
    socket.data.playerName = playerName;
    
    // Add player to lobby
    lobby.players.push({
      id: socket.id,
      name: playerName,
      selectedCountry: null
    });
    
    playerLobbyMap.set(socket.id, lobbyId);
    
    socket.join(lobbyId);
    socket.emit('lobby_joined', lobby);
    
    // Notify all clients about the updated lobbies
    io.emit('lobbies_updated', Array.from(lobbies.values()));
    
    // Also specifically notify all players in this lobby about the update
    io.to(lobbyId).emit('lobby_joined', lobby);
  });

  socket.on('leave_lobby', () => {
    const lobbyId = playerLobbyMap.get(socket.id);
    if (lobbyId) {
      const lobby = lobbies.get(lobbyId);
      if (lobby) {
        // Remove player from lobby
        lobby.players = lobby.players.filter(player => player.id !== socket.id);
        
        // If lobby is empty, remove it
        if (lobby.players.length === 0) {
          lobbies.delete(lobbyId);
        }
        
        socket.leave(lobbyId);
        playerLobbyMap.delete(socket.id);
        
        io.emit('lobbies_updated', Array.from(lobbies.values()));
      }
    }
  });

  socket.on('start_game', () => {
    console.log('=== START GAME EVENT RECEIVED ===');
    console.log('Start game requested by:', socket.id);
    
    const lobbyId = playerLobbyMap.get(socket.id);
    if (!lobbyId) {
      console.log('Player not in a lobby:', socket.id);
      return socket.emit('error', 'You are not in a lobby');
    }
    
    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      console.log('Lobby not found:', lobbyId);
      return socket.emit('error', 'Lobby not found');
    }
    
    console.log('Lobby creator ID:', lobby.players[0].id);
    console.log('Current player ID:', socket.id);
    console.log('All players:', lobby.players);
    
    // Find the player in the lobby
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) {
      console.log('Player not found in lobby');
      return socket.emit('error', 'You are not in this lobby');
    }
    
    console.log('Player found:', player);
    
    // Check if this player is the lobby creator (first player)
    if (lobby.players[0].id !== socket.id) {
      console.log('Player is not the lobby creator');
      return socket.emit('error', 'Only the lobby creator can start the game');
    }
    
    // Check if the player has selected a country
    if (!player.selectedCountry) {
      console.log('Player has not selected a country');
      return socket.emit('error', 'You must select a country before starting the game');
    }
    
    // Check if at least the creator has selected a country
    console.log('Checking if players have selected countries...');
    lobby.players.forEach((p, index) => {
      console.log(`Player ${index}: ${p.name}, Country: ${p.selectedCountry}`);
    });
    
    // Only require that the creator (first player) has selected a country
    if (!player.selectedCountry) {
      console.log('Creator has not selected a country');
      return socket.emit('error', 'You must select a country before starting the game');
    }
    
    // Don't filter out players who haven't selected a country
    console.log('All players in lobby who will join the game:', lobby.players);
    
    // Mark lobby as in progress
    lobby.inProgress = true;
    
    // Create the game automatically
    const gameId = lobbyId; // Use the lobby ID as the game ID for simplicity
    const gameState = {
      ...defaultGameState,
      GameId: gameId,
      Players: lobby.players.map(p => p.id),
      PlayerCountries: {}, // Will be populated as players select countries
      CurrentTurnPlayerId: lobby.players[0].id // Set the first player as the current turn player
    };
    
    games.set(gameId, gameState);
    
    // Add all players to the game automatically
    lobby.players.forEach(lobbyPlayer => {
      // Add player to the game room
      const playerSocket = io.sockets.sockets.get(lobbyPlayer.id);
      if (playerSocket) {
        playerSocket.join(gameId);
        
        // If player has selected a country, assign it to them
        if (lobbyPlayer.selectedCountry) {
          gameState.PlayerCountries[lobbyPlayer.id] = lobbyPlayer.selectedCountry;
          
          // Find the country and assign the player ID to it
          const country = gameState.Countries.find((c: Country) => c.Id === lobbyPlayer.selectedCountry);
          if (country) {
            country.PlayerId = lobbyPlayer.id;
          }
        }
      }
    });
    
    // Notify all players in the lobby that the game is starting and send them the game state
    console.log('Emitting game_started event to all players in lobby:', lobbyId);
    io.to(lobbyId).emit('game_started', lobbyId);
    
    console.log('Emitting game_created event to all players in lobby');
    io.to(lobbyId).emit('game_created', { gameId, gameState });
    
    console.log('Emitting game_joined event to all players in lobby');
    io.to(lobbyId).emit('game_joined', gameState);
    
    console.log('Emitting lobbies_updated event to all clients');
    io.emit('lobbies_updated', Array.from(lobbies.values()));
    
    console.log('Game start process completed');
  });

  // Game-related events
  socket.on('create_game', (lobbyId: string) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      return socket.emit('error', 'Lobby not found');
    }
    
    const gameId = lobbyId; // Use the lobby ID as the game ID for simplicity
    const gameState = {
      ...defaultGameState,
      GameId: gameId,
      Players: lobby.players.map(p => p.id),
      PlayerCountries: {}, // Will be populated as players select countries
      CurrentTurnPlayerId: lobby.players[0].id // Set the first player as the current turn player
    };
    
    games.set(gameId, gameState);
    
    // Make sure all players are in the game room
    lobby.players.forEach(player => {
      const playerSocket = io.sockets.sockets.get(player.id);
      if (playerSocket) {
        playerSocket.join(gameId);
      }
    });
    
    // Broadcast game creation to all players in the lobby
    console.log('Broadcasting game_created to all players in lobby:', lobbyId);
    io.to(lobbyId).emit('game_created', { gameId, gameState });
  });

  socket.on('join_game', (gameId: string, countryId: string) => {
    const gameState = games.get(gameId);
    if (!gameState) {
      return socket.emit('error', 'Game not found');
    }
    
    // Get the player's name from socket data if available
    const playerName = socket.data.playerName;
    console.log(`Player ${socket.id} (${playerName || 'unnamed'}) joining game ${gameId} with country ${countryId}`);
    
    // Check if this player is already in the game with a different socket ID
    // This can happen when a player has multiple socket connections
    let existingPlayerId = null;
    
    // If we have a player name, try to find a matching player in the lobby
    if (playerName) {
      const lobby = lobbies.get(gameId); // Using gameId as lobbyId
      if (lobby) {
        const playerInLobby = lobby.players.find(p => p.name === playerName);
        if (playerInLobby && playerInLobby.id !== socket.id) {
          console.log(`Found player ${playerName} in lobby with ID ${playerInLobby.id}, current socket ID is ${socket.id}`);
          existingPlayerId = playerInLobby.id;
          
          // Check if this player already has a country assigned
          if (gameState.PlayerCountries[existingPlayerId]) {
            console.log(`Player already has country ${gameState.PlayerCountries[existingPlayerId]} assigned with ID ${existingPlayerId}`);
            
            // Use the existing player ID's country assignment
            countryId = gameState.PlayerCountries[existingPlayerId];
          }
        }
      }
    }
    
    // Check if the player is joining as an observer (without a country)
    if (countryId !== "observer") {
      // Assign the country to the player
      gameState.PlayerCountries[socket.id] = countryId;
      
      // Find the country and assign the player ID to it
      const country = gameState.Countries.find((c: Country) => c.Id === countryId);
      if (country) {
        country.PlayerId = socket.id;
      }
    } else {
      console.log(`Player ${socket.id} joining as observer (no country selected)`);
      // Make sure the player is in the Players array even if they don't have a country
      if (!gameState.Players.includes(socket.id)) {
        gameState.Players.push(socket.id);
      }
    }
    
    socket.join(gameId);
    socket.emit('game_joined', gameState);
    
    // Notify all players in the game about the update
    io.to(gameId).emit('game_updated', gameState);
  });

  socket.on('select_country', (countryId: string) => {
    const lobbyId = playerLobbyMap.get(socket.id);
    if (!lobbyId) {
      return socket.emit('error', 'You are not in a lobby');
    }
    
    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      return socket.emit('error', 'Lobby not found');
    }
    
    // Check if country is already selected by another player
    const isCountryTaken = lobby.players.some(p =>
      p.id !== socket.id && p.selectedCountry === countryId
    );
    
    if (isCountryTaken) {
      console.log('Country already taken:', countryId);
      return socket.emit('error', 'This country is already selected by another player');
    }
    
    // Update player's selected country
    const player = lobby.players.find(p => p.id === socket.id);
    if (player) {
      console.log(`Player ${player.name} selected country: ${countryId}`);
      player.selectedCountry = countryId;
      
      // Log all players' country selections after update
      console.log('Updated player country selections:');
      lobby.players.forEach((p, index) => {
        console.log(`Player ${index}: ${p.name}, Country: ${p.selectedCountry}`);
      });
      
      // Update the lobby in the map
      lobbies.set(lobbyId, lobby);
      
      // Notify all clients about the updated lobbies
      io.emit('lobbies_updated', Array.from(lobbies.values()));
      
      // Also specifically notify all players in this lobby about the update
      io.to(lobbyId).emit('lobby_joined', lobby);
      
      // Log the updated lobby state
      const updatedLobby = lobbies.get(lobbyId);
      console.log('Updated lobby state:', updatedLobby);
      console.log('All players selected country?', updatedLobby?.players.every(p => p.selectedCountry !== null));
    }
  });

  socket.on('leave_game', () => {
    // Find all games this player is in
    for (const [gameId, gameState] of games.entries()) {
      if (gameState.Players.includes(socket.id)) {
        // Remove player from game
        gameState.Players = gameState.Players.filter((id: string) => id !== socket.id);
        
        // If player had a country, free it up
        if (gameState.PlayerCountries[socket.id]) {
          const countryId = gameState.PlayerCountries[socket.id];
          const country = gameState.Countries.find((c: Country) => c.Id === countryId);
          if (country) {
            country.PlayerId = null;
          }
          delete gameState.PlayerCountries[socket.id];
        }
        
        socket.leave(gameId);
        
        // If game is empty, remove it
        if (gameState.Players.length === 0) {
          games.delete(gameId);
        } else {
          // Notify remaining players
          io.to(gameId).emit('game_updated', gameState);
        }
      }
    }
  });

  socket.on('end_turn', () => {
    // Find the game the player is in
    // We need a reliable way to map socket.id to gameId.
    // Using playerLobbyMap assumes gameId === lobbyId and player is still in lobby map.
    // A better approach might be to store gameId in socket.data when joining.
    // For now, iterating games map:
    let gameId: string | null = null;
    for (const [id, state] of games.entries()) {
      // Check if the player is listed in this game's players array
      if (state.Players && state.Players.includes(socket.id)) {
        gameId = id;
        break;
      }
    }

    if (!gameId) {
      console.error(`Player ${socket.id} tried to end turn but could not be mapped to a game.`);
      // Attempt to find via playerLobbyMap as a fallback (if gameId === lobbyId)
      const potentialGameId = playerLobbyMap.get(socket.id);
      if (potentialGameId && games.has(potentialGameId)) {
          const potentialGameState = games.get(potentialGameId);
          if (potentialGameState && potentialGameState.Players && potentialGameState.Players.includes(socket.id)) {
              gameId = potentialGameId;
              console.log(`Found game ${gameId} for player ${socket.id} via playerLobbyMap fallback.`);
          }
      }
      if (!gameId) {
        return socket.emit('error', 'Could not determine the game you are in.');
      }
    }


    const gameState = games.get(gameId);
    if (!gameState) {
      console.error(`Game state not found for gameId: ${gameId}`);
      return socket.emit('error', 'Game not found.');
    }

    // Verify it's actually this player's turn
    if (gameState.CurrentTurnPlayerId !== socket.id) {
      console.warn(`Player ${socket.id} tried to end turn out of sequence in game ${gameId}. Current turn: ${gameState.CurrentTurnPlayerId}`);
      return socket.emit('error', "It's not your turn.");
    }

    console.log(`Player ${socket.id} ended their turn in game ${gameId}.`);

    // Determine the order of players who have countries assigned
    // Filter gameState.Players to only include those present in PlayerCountries keys
    // Ensure the order is consistent by using the order in gameState.Players
    const activePlayerIds = gameState.Players.filter((playerId: string) =>
      gameState.PlayerCountries && gameState.PlayerCountries.hasOwnProperty(playerId)
    );

    if (activePlayerIds.length === 0) {
        console.warn(`No active players with countries in game ${gameId}. Cannot advance turn.`);
        // Keep the turn with the current player or handle appropriately
        io.to(gameId).emit('game_updated', gameState); // Still update clients even if turn doesn't change
        return;
    }


    // Find the index of the current player in the active player list
    const currentPlayerIndex = activePlayerIds.indexOf(gameState.CurrentTurnPlayerId);

    if (currentPlayerIndex === -1) {
        console.error(`Current turn player ${gameState.CurrentTurnPlayerId} not found in active players list [${activePlayerIds.join(', ')}] for game ${gameId}. Resetting turn.`);
        // Reset to the first active player as a fallback
        gameState.CurrentTurnPlayerId = activePlayerIds[0];
    } else {
        // Determine the next player's index
        const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayerIds.length;
        const nextPlayerId = activePlayerIds[nextPlayerIndex];

        console.log(`Next turn in game ${gameId} goes to player ${nextPlayerId}.`);
        gameState.CurrentTurnPlayerId = nextPlayerId;

        // If the turn loops back to the first player, advance the date
        if (nextPlayerIndex === 0) {
          try {
            const currentDate = new Date(gameState.CurrentDate);
            currentDate.setMonth(currentDate.getMonth() + 3);
            gameState.CurrentDate = currentDate.toISOString();
            console.log(`Advanced game ${gameId} date to: ${gameState.CurrentDate}`);
          } catch (dateError) {
            console.error(`Error parsing or advancing game date for game ${gameId}:`, dateError, "Current date string:", gameState.CurrentDate);
            // Handle error, maybe reset date or log more details
          }
        }
    }

    // Broadcast the updated game state to all players in the game
    io.to(gameId).emit('game_updated', gameState);
    console.log(`Game state updated and broadcasted for game ${gameId}. New turn: ${gameState.CurrentTurnPlayerId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Handle lobby cleanup
    const lobbyId = playerLobbyMap.get(socket.id);
    if (lobbyId) {
      const lobby = lobbies.get(lobbyId);
      if (lobby) {
        // Remove player from lobby
        lobby.players = lobby.players.filter(player => player.id !== socket.id);
        
        // If lobby is empty, remove it
        if (lobby.players.length === 0) {
          lobbies.delete(lobbyId);
        } else {
          io.to(lobbyId).emit('lobbies_updated', Array.from(lobbies.values()));
        }
        
        playerLobbyMap.delete(socket.id);
      }
    }
    
    // Handle game cleanup (same as leave_game)
    for (const [gameId, gameState] of games.entries()) {
      if (gameState.Players.includes(socket.id)) {
        // Remove player from game
        gameState.Players = gameState.Players.filter((id: string) => id !== socket.id);
        
        // If player had a country, free it up
        if (gameState.PlayerCountries[socket.id]) {
          const countryId = gameState.PlayerCountries[socket.id];
          const country = gameState.Countries.find((c: Country) => c.Id === countryId);
          if (country) {
            country.PlayerId = null;
          }
          delete gameState.PlayerCountries[socket.id];
        }
        
        // If game is empty, remove it
        if (gameState.Players.length === 0) {
          games.delete(gameId);
        } else {
          // Notify remaining players
          io.to(gameId).emit('game_updated', gameState);
        }
      }
    }
  });
});

// Fallback route for SPA: serve index.html for any unknown paths
app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(clientBuildPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  await loadDefaultGameState();
  
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);