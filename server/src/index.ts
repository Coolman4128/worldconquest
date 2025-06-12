import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { loadDefaultGameState } from './config/defaultGameState.js';
import { games, lobbies, playerLobbyMap } from './store/index.js';
import { registerSocketHandlers } from './socket/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const clientBuildPath = join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Register socket handlers (all event logic is in /socket)
registerSocketHandlers(io);

app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  await loadDefaultGameState();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
