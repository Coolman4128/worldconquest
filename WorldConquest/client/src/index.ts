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

// Global SignalR connection
let connection: signalR.HubConnection;

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
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/gamehub")
        .configureLogging(signalR.LogLevel.Information)
        .withAutomaticReconnect()
        .build();
    
    // Handle game messages with data
    connection.on("GameMessage", (messageName: string, data: any) => {
        handleGameMessage(messageName, data);
    });
    
    connection.start().catch(err => console.error(err));
}

/**
 * Send a message to the server with optional data
 * @param messageName The name of the message (action to perform)
 * @param data Optional data to send with the message
 */
function SendMessage(messageName: string, data: any = null) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke("ReceiveClientMessage", messageName, data)
            .catch(err => console.error(`Error sending message "${messageName}":`, err));
    } else {
        console.error("Cannot send message: connection not established");
    }
}

/**
 * Handle incoming game messages from the server
 * @param messageName The name of the message (action to perform)
 * @param data Optional data associated with the message
 */
function handleGameMessage(messageName: string, data: any) {
    console.log(`Received message: ${messageName}`, data);
    
    // Process different message types
    switch (messageName) {
        // HANDLE ACTIONS HERE


        default:
            console.warn(`Unknown message type: ${messageName}`);
    }
}

// Start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Export for testing and for use in other modules
export { initGame, connectToHub, SendMessage };