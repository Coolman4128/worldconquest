# World Conquest Game

A multiplayer strategy game where players conquer provinces on a map.

## Features

- Interactive map with provinces
- Multiplayer support with lobby system
- Save and load game states
- Turn-based gameplay

## Setup

### Prerequisites

- [.NET 6 SDK](https://dotnet.microsoft.com/download/dotnet/6.0) for the backend
- Node.js and npm for the frontend

### Running the Backend

#### Windows

```
run-backend.bat
```

#### Linux/macOS

```
chmod +x run-backend.sh
./run-backend.sh
```

The ASP.NET Core backend will start on https://localhost:5001.

### Running the Frontend

```
npm install
npm start
```

The frontend will start on http://localhost:3000.

## How to Play

1. Start both the backend and frontend servers
2. Open your browser to http://localhost:3000
3. Create a new lobby or join an existing one
4. Invite friends to join your lobby using the lobby ID
5. Play the game by taking turns to conquer provinces
6. Use the "Next Turn" button to advance to the next player
7. Use the "Next Year" button to advance the game year
8. Download the game state at any time to save your progress

## Game Controls

- Click and drag to move the map
- Scroll wheel or +/- buttons to zoom in/out
- Click on a province to see its details
- Use the buttons in the top bar to control the game

## Development

### Project Structure

- `backend/` - ASP.NET Core backend
  - `Controllers/` - API controllers
  - `Models/` - Data models
  - `Services/` - Business logic
  - `Hubs/` - SignalR hubs for real-time communication
- `js/` - Frontend JavaScript
  - `api.js` - API client for communicating with the backend
  - `game.js` - Main game logic
  - `mapProcessor.js` - Map processing logic
  - `utils.js` - Utility functions
- `assets/` - Game assets
- `styles.css` - CSS styles
- `index.html` - Main HTML file