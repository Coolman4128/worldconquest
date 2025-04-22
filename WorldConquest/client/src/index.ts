import * as signalR from "@microsoft/signalr";

// DOM Elements
const gameCanvas = document.createElement('canvas');
gameCanvas.width = 800;
gameCanvas.height = 600;
gameCanvas.id = 'gameCanvas';

// Game state
import { GameState } from "./models/GameState";

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

    // Load the bitmap image
    bitmapImage = new window.Image();
    bitmapImage.src = "/bitmap.png";
    bitmapImage.onload = () => {
        bitmapLoaded = true;
        // If gamestate is already loaded, render
        if (currentGameState) {
            renderGameState(currentGameState);
        }
    };
    bitmapImage.onerror = () => {
        console.error("Failed to load bitmap image.");
    };

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

let currentGameState: GameState | null = null;
let bitmapImage: HTMLImageElement | null = null;
let bitmapLoaded: boolean = false;

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
    
    // Listen for the default gamestate from the backend
    connection.on("ReceiveGameState", (gameState: GameState) => {
        if (gameState) {
            currentGameState = gameState;
            if (bitmapLoaded) {
                renderGameState(gameState);
            }
            // If bitmap not loaded yet, render will be called from bitmap onload
        } else {
            console.error("Failed to receive default gamestate from backend.");
        }
    });

    connection.start()
        .then(() => {
            // Request the default gamestate after connecting
            connection.invoke("ReceiveClientMessage", "RequestDefaultGameState", null);
        })
        .catch(err => console.error(err));
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

/**
* Render the game state on the canvas.
* This is a placeholder; actual rendering logic will be implemented next.
*/
function renderGameState(gameState: GameState) {
   const ctx = gameCanvas.getContext('2d');
   if (!ctx) return;
   ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
   ctx.fillStyle = '#222';
   ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
   ctx.fillStyle = '#fff';
   ctx.font = '20px Arial';
   ctx.fillText('GameState loaded!', 320, 100);
}

// Start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Export for testing and for use in other modules
export { initGame, connectToHub, SendMessage };