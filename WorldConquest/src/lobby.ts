// World Conquest Game - Lobby Management

import { SignalRService } from './services/SignalRService';
import { GameManager } from './game/GameManager';
import { Lobby } from './models/Lobby';

// This file handles the lobby functionality
// It initializes the lobby UI and connects to the server

document.addEventListener('DOMContentLoaded', async () => {
    console.log('World Conquest lobby initializing...');
    
    try {
        // Initialize services
        const signalRService = new SignalRService();
        
        // Initialize game manager
        const gameManager = new GameManager(signalRService);
        
        // Store game manager in window for access from other functions
        (window as any).gameManager = gameManager;
        
        await gameManager.initialize();
        
        // Set up UI event listeners
        setupLobbyEventListeners(gameManager, signalRService);
        
        // Get available lobbies
        await gameManager.getLobbies();
        
        console.log('World Conquest lobby initialized successfully');
    } catch (error) {
        console.error('Failed to initialize lobby:', error);
    }
});

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
            gameManager.startGame();
        });
    }
    
    // Set up event handler for game started
    signalRService.setOnGameStarted((gameState) => {
        console.log('Game started event received:', gameState);
        
        // Redirect to the game page with the game ID
        const redirectUrl = `index.html?gameId=${gameState.id}`;
        console.log(`Redirecting to: ${redirectUrl}`);
        
        window.location.href = redirectUrl;
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
                                // Redirect to the game page after loading the game state
                                // We'll use a timeout to allow the game state to be fully loaded
                                setTimeout(() => {
                                    // The gameState ID should be available in the gameManager
                                    const gameStateId = gameManager.gameState?.id;
                                    if (gameStateId) {
                                        window.location.href = `index.html?gameId=${gameStateId}`;
                                    } else {
                                        console.error('Game state ID not available after loading');
                                    }
                                }, 500);
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