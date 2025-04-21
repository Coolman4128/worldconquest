// World Conquest Game - Main Entry Point

import { SignalRService } from './services/SignalRService';
import { GameManager } from './game/GameManager';

// This file is the entry point for the TypeScript compilation
// It initializes the game and connects to the server

document.addEventListener('DOMContentLoaded', async () => {
    console.log('World Conquest game initializing...');
    
    try {
        // Initialize services
        const signalRService = new SignalRService();
        
        // Initialize game manager
        const gameManager = new GameManager(signalRService);
        
        // Store game manager in window for access from other functions
        (window as any).gameManager = gameManager;
        
        await gameManager.initialize();
        
        // Check if we have a game ID in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        
        // Set up UI event listeners
        setupUIEventListeners(gameManager);
        
        // Set up lobby event listeners
        setupLobbyEventListeners(gameManager, signalRService);
        
        // If we have a game ID, join the game and hide the lobby
        if (gameId) {
            await gameManager.joinGame(gameId);
            hideLobbyDialog();
        } else {
            // Otherwise, show the lobby dialog and get available lobbies
            showLobbyDialog();
            await gameManager.getLobbies();
        }
        
        console.log('World Conquest game initialized successfully');
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});

// Set up UI event listeners for the game
function setupUIEventListeners(gameManager: GameManager): void {
    // End turn button
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
        endTurnBtn.addEventListener('click', () => {
            gameManager.endTurn();
        });
    }
    
    // Chat input
    const chatInput = document.getElementById('chat-input-field') as HTMLInputElement;
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    if (chatInput && sendChatBtn) {
        // Send button click
        sendChatBtn.addEventListener('click', () => {
            const message = chatInput.value.trim();
            if (message) {
                gameManager.sendChatMessage(message);
                chatInput.value = '';
                chatInput.focus();
            }
        });
        
        // Enter key press
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const message = chatInput.value.trim();
                if (message) {
                    gameManager.sendChatMessage(message);
                    chatInput.value = '';
                }
            }
        });
        
        // Clear chat messages when they get too many
        if (chatMessages) {
            // Check every minute if we need to clear old messages
            setInterval(() => {
                if (chatMessages.children.length > 100) {
                    // Remove oldest messages to keep only the latest 50
                    while (chatMessages.children.length > 50) {
                        chatMessages.removeChild(chatMessages.firstChild as Node);
                    }
                }
            }, 60000);
        }
    }
    
    // Show lobby button
    const showLobbyBtn = document.getElementById('show-lobby-btn');
    if (showLobbyBtn) {
        showLobbyBtn.addEventListener('click', () => {
            showLobbyDialog();
        });
    }
    
    // Resize canvas when window is resized
    window.addEventListener('resize', () => {
        resizeCanvas();
    });
    
    // Initial canvas resize
    resizeCanvas();
}

// Set up lobby event listeners
function setupLobbyEventListeners(gameManager: GameManager, signalRService: SignalRService): void {
    // Refresh lobbies button
    const refreshLobbiesBtn = document.getElementById('refresh-lobbies-btn');
    if (refreshLobbiesBtn) {
        refreshLobbiesBtn.addEventListener('click', () => {
            gameManager.getLobbies();
        });
    }
    
    // Create lobby form
    const createLobbyForm = document.getElementById('create-lobby-form');
    if (createLobbyForm) {
        createLobbyForm.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const playerName = (document.getElementById('create-player-name') as HTMLInputElement)?.value;
            const lobbyName = (document.getElementById('create-lobby-name') as HTMLInputElement)?.value;
            const maxPlayers = parseInt((document.getElementById('max-players') as HTMLInputElement)?.value || '4');
            const isPasswordProtected = (document.getElementById('password-protected') as HTMLInputElement)?.checked || false;
            const password = isPasswordProtected ? (document.getElementById('lobby-password') as HTMLInputElement)?.value : null;
            
            if (playerName && lobbyName) {
                gameManager.createLobby(playerName, lobbyName, maxPlayers, isPasswordProtected, password);
            }
        });
    }
    
    // Leave lobby button
    const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
    if (leaveLobbyBtn) {
        leaveLobbyBtn.addEventListener('click', () => {
            gameManager.leaveLobby();
            
            // Hide the lobby container
            const lobbyContainer = document.getElementById('lobby-container');
            if (lobbyContainer) {
                lobbyContainer.style.display = 'none';
            }
            
            // Show the join lobby tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const joinTab = document.querySelector('.tab[data-tab="join-lobby"]');
            if (joinTab) {
                joinTab.classList.add('active');
            }
            
            const joinContent = document.getElementById('join-lobby');
            if (joinContent) {
                joinContent.classList.add('active');
            }
        });
    }
    
    // Start game button
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            console.log('Start Game button clicked');
            console.log('Current lobby:', gameManager['currentLobby']);
            gameManager.startGame();
        });
    } else {
        console.error('Start Game button not found in the DOM');
    }
    
    // We need to make sure the lobby dialog is hidden when the game starts on ALL clients
    // This event handler will be called on all clients when any client starts the game
    signalRService.setOnGameStarted((gameState: any) => {
        console.log('GAME STARTED EVENT RECEIVED in index.ts with gameState:', gameState);
        
        // Access the gameManager to check if gameState was set
        const gm = (window as any).gameManager;
        if (gm) {
            console.log('GameManager.gameState in index.ts:', gm.gameState);
            
            // Set the game state directly if needed
            if (!gm.gameState && gameState) {
                console.log('Setting gameState directly in index.ts');
                gm.gameState = gameState;
            }
        }
        
        // CRITICAL: Simply hide the lobby dialog on ALL clients
        console.log('HIDING LOBBY DIALOG after game started (on all clients)');
        const lobbyDialog = document.getElementById('lobby-dialog');
        if (lobbyDialog) {
            console.log('Found lobby dialog, hiding it');
            lobbyDialog.style.display = 'none';
        } else {
            console.error('Could not find lobby-dialog element to hide it');
        }
        
        // Add a visible notification that the game has started
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            const notification = document.createElement('div');
            notification.style.position = 'absolute';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            notification.style.color = 'white';
            notification.style.padding = '20px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '1000';
            notification.style.fontSize = '24px';
            notification.textContent = 'Game Started!';
            
            gameContainer.appendChild(notification);
            
            // Remove the notification after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
        
        // Broadcast a custom event that the game has started
        const gameStartedEvent = new CustomEvent('gameStarted', { detail: gameState });
        document.dispatchEvent(gameStartedEvent);
        console.log('Dispatched custom gameStarted event');
    });
    
    // Listen for the custom gameStarted event
    document.addEventListener('gameStarted', (event: Event) => {
        console.log('Custom gameStarted event received');
        hideLobbyDialog();
    });
    
    // Refresh saved games button
    const refreshSavedGamesBtn = document.getElementById('refresh-saved-games-btn');
    if (refreshSavedGamesBtn) {
        refreshSavedGamesBtn.addEventListener('click', () => {
            fetchSavedGames();
        });
    }
    
    // Initial fetch of saved games
    fetchSavedGames();
}

// Fetch saved games from the server
async function fetchSavedGames(): Promise<void> {
    try {
        const response = await fetch('/api/savedgames');
        
        if (response.ok) {
            const savedGames = await response.json();
            updateSavedGamesList(savedGames);
        } else {
            throw new Error('Failed to fetch saved games');
        }
    } catch (error) {
        console.error('Error fetching saved games:', error);
        
        const savedGamesList = document.getElementById('saved-games-list');
        if (savedGamesList) {
            savedGamesList.innerHTML = `
                <div class="saved-game-item">
                    <span class="saved-game-name">Error loading saved games</span>
                </div>
            `;
        }
    }
}

// Update the saved games list
function updateSavedGamesList(savedGames: any[]): void {
    const savedGamesList = document.getElementById('saved-games-list');
    if (!savedGamesList) return;
    
    if (savedGames.length === 0) {
        savedGamesList.innerHTML = `
            <div class="saved-game-item">
                <span class="saved-game-name">No saved games found</span>
            </div>
        `;
        return;
    }
    
    savedGamesList.innerHTML = '';
    
    savedGames.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.className = 'saved-game-item';
        
        const date = new Date(game.savedAt);
        const dateString = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        gameItem.innerHTML = `
            <span class="saved-game-name">${game.name}</span>
            <span class="saved-game-date">${dateString}</span>
            <button class="btn load-game-btn" data-path="${game.path}">Load</button>
        `;
        
        savedGamesList.appendChild(gameItem);
        
        // Add event listener to load button
        const loadBtn = gameItem.querySelector('.load-game-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const path = (loadBtn as HTMLElement).getAttribute('data-path');
                if (path) {
                    // Get the game manager instance
                    const gameManager = (window as any).gameManager;
                    if (gameManager) {
                        gameManager.loadGameState(path)
                            .then(() => {
                                // Hide the lobby dialog after loading the game state
                                hideLobbyDialog();
                            })
                            .catch((error: Error) => {
                                console.error('Error loading game state:', error);
                            });
                    }
                }
            });
        }
    });
}

// Show the lobby dialog
function showLobbyDialog(): void {
    const lobbyDialog = document.getElementById('lobby-dialog');
    if (lobbyDialog) {
        lobbyDialog.style.display = 'flex';
    }
}

// Hide the lobby dialog
function hideLobbyDialog(): void {
    console.log('hideLobbyDialog called');
    const lobbyDialog = document.getElementById('lobby-dialog');
    if (lobbyDialog) {
        lobbyDialog.style.display = 'none';
    } else {
        console.error('Could not find lobby-dialog element to hide it');
    }
}

// Resize the canvas to fit its container
function resizeCanvas(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        }
    }
}