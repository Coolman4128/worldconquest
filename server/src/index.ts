import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

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

// Game state storage (in-memory for now, will move to MongoDB later)
const games = new Map();

// Socket.IO event handlers
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_game', () => {
    const gameId = Math.random().toString(36).substring(7);
    const gameState = { ...defaultGameState, GameId: gameId };
    games.set(gameId, gameState);
    socket.join(gameId);
    socket.emit('game_created', { gameId, gameState });
  });

  socket.on('join_game', (gameId: string) => {
    const gameState = games.get(gameId);
    if (gameState) {
      socket.join(gameId);
      socket.emit('game_joined', gameState);
    } else {
      socket.emit('error', 'Game not found');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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