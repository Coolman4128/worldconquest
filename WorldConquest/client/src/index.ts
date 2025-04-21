import * as signalR from "@microsoft/signalr";

// DOM Elements
const gameCanvas = document.createElement('canvas');
gameCanvas.width = 800;
gameCanvas.height = 600;
gameCanvas.id = 'gameCanvas';

// Game state
interface GameState {
    currentPlayer: string;
    date: string;
    players: Player[];
}

interface Player {
    id: string;
    name: string;
    country: string;
    money: number;
}

// Initialize the game
function initGame() {
    document.body.appendChild(gameCanvas);
    
    const ctx = gameCanvas.getContext('2d');
    if (ctx) {
        // Draw a simple background
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // Draw some text
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText('WorldConquest Game', 300, 50);
        ctx.fillText('Game is initializing...', 300, 100);
    }
    
    // Connect to SignalR hub
    connectToHub();
}

// Connect to SignalR hub
function connectToHub() {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/gamehub")
        .configureLogging(signalR.LogLevel.Information)
        .build();
    
    connection.on("ReceiveMessage", (user: string, message: string) => {
        console.log(`${user}: ${message}`);
    });
    
    connection.on("PlayerJoined", (connectionId: string) => {
        console.log(`Player joined: ${connectionId}`);
    });
    
    connection.on("PlayerLeft", (connectionId: string) => {
        console.log(`Player left: ${connectionId}`);
    });
    
    connection.start().catch(err => console.error(err));
}

// Start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Export for testing
export { initGame, connectToHub };