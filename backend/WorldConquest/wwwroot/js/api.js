/**
 * API client for communicating with the ASP.NET backend
 */

class ApiClient {
    constructor(baseUrl = null) {
        this.baseUrl = baseUrl || (window.location.origin === 'http://142.93.52.147:5000' ? 'http://142.93.52.147:5000' : 'http://localhost:5000');
        this.hubConnection = null;
        this.callbacks = {
            onPlayerJoined: null,
            onPlayerLeft: null,
            onLobbyJoined: null,
            onGameStateUpdated: null,
            onError: null
        };
    }

    /**
     * Initialize the SignalR connection
     */
    async initSignalR() {
        try {
            // Load SignalR from CDN if not already loaded
            if (!window.signalR) {
                await this.loadSignalRScript();
            }

            // Create the connection
            this.hubConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${this.baseUrl}/gamehub`)
                .withAutomaticReconnect()
                .build();

            // Set up event handlers
            this.hubConnection.on('PlayerJoined', player => {
                console.log('Player joined:', player);
                if (this.callbacks.onPlayerJoined) {
                    this.callbacks.onPlayerJoined(player);
                }
            });

            this.hubConnection.on('PlayerLeft', playerId => {
                console.log('Player left:', playerId);
                if (this.callbacks.onPlayerLeft) {
                    this.callbacks.onPlayerLeft(playerId);
                }
            });

            this.hubConnection.on('LobbyJoined', lobby => {
                console.log('Joined lobby:', lobby);
                if (this.callbacks.onLobbyJoined) {
                    this.callbacks.onLobbyJoined(lobby);
                }
            });

            this.hubConnection.on('GameStateUpdated', gameState => {
                console.log('Game state updated:', gameState);
                if (this.callbacks.onGameStateUpdated) {
                    this.callbacks.onGameStateUpdated(gameState);
                }
            });

            this.hubConnection.on('Error', error => {
                console.error('Error from server:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            });

            // Start the connection
            await this.hubConnection.start();
            console.log('SignalR connected');
            return true;
        } catch (error) {
            console.error('Failed to connect to SignalR hub:', error);
            return false;
        }
    }

    /**
     * Load the SignalR script from CDN
     */
    loadSignalRScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@microsoft/signalr@6.0.6/dist/browser/signalr.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Set callback functions for SignalR events
     * @param {Object} callbacks - Object containing callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Get a list of available lobbies
     * @returns {Promise<Array>} - List of lobbies
     */
    async getLobbies() {
        try {
            const response = await fetch(`${this.baseUrl}/api/lobby`);
            if (!response.ok) {
                throw new Error(`Failed to get lobbies: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting lobbies:', error);
            throw error;
        }
    }

    /**
     * Create a new lobby
     * @param {string} name - Lobby name
     * @returns {Promise<Object>} - Created lobby
     */
    async createLobby(name) {
        try {
            const response = await fetch(`${this.baseUrl}/api/lobby`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            if (!response.ok) {
                throw new Error(`Failed to create lobby: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating lobby:', error);
            throw error;
        }
    }

    /**
     * Join a lobby
     * @param {string} lobbyId - Lobby ID
     * @param {string} playerName - Player name
     * @param {string} countryId - Country ID
     * @returns {Promise<boolean>} - Success status
     */
    async joinLobby(lobbyId, playerName, countryId) {
        try {
            if (!this.hubConnection) {
                await this.initSignalR();
            }
            await this.hubConnection.invoke('JoinLobby', lobbyId, playerName, countryId);
            return true;
        } catch (error) {
            console.error('Error joining lobby:', error);
            return false;
        }
    }

    /**
     * Leave a lobby
     * @param {string} lobbyId - Lobby ID
     * @returns {Promise<boolean>} - Success status
     */
    async leaveLobby(lobbyId) {
        try {
            if (!this.hubConnection) {
                return false;
            }
            await this.hubConnection.invoke('LeaveLobby', lobbyId);
            return true;
        } catch (error) {
            console.error('Error leaving lobby:', error);
            return false;
        }
    }

    /**
     * Get the default game state
     * @returns {Promise<Object>} - Default game state
     */
    async getDefaultGameState() {
        try {
            const response = await fetch(`${this.baseUrl}/api/gamestate/default`);
            if (!response.ok) {
                throw new Error(`Failed to get default game state: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting default game state:', error);
            throw error;
        }
    }

    /**
     * Get the game state for a lobby
     * @param {string} lobbyId - Lobby ID
     * @returns {Promise<Object>} - Game state
     */
    async getGameState(lobbyId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/gamestate/${lobbyId}`);
            if (!response.ok) {
                throw new Error(`Failed to get game state: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting game state:', error);
            throw error;
        }
    }

    /**
     * Update the game state for a lobby
     * @param {string} lobbyId - Lobby ID
     * @param {Object} gameState - Game state
     * @returns {Promise<boolean>} - Success status
     */
    async updateGameState(lobbyId, gameState) {
        try {
            if (this.hubConnection) {
                await this.hubConnection.invoke('UpdateGameState', lobbyId, gameState);
                return true;
            } else {
                const response = await fetch(`${this.baseUrl}/api/gamestate/${lobbyId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(gameState)
                });
                return response.ok;
            }
        } catch (error) {
            console.error('Error updating game state:', error);
            return false;
        }
    }

    /**
     * Advance the turn in a lobby
     * @param {string} lobbyId - Lobby ID
     * @returns {Promise<boolean>} - Success status
     */
    async advanceTurn(lobbyId) {
        try {
            if (this.hubConnection) {
                await this.hubConnection.invoke('AdvanceTurn', lobbyId);
                return true;
            } else {
                const response = await fetch(`${this.baseUrl}/api/gamestate/${lobbyId}/advance-turn`, {
                    method: 'POST'
                });
                return response.ok;
            }
        } catch (error) {
            console.error('Error advancing turn:', error);
            return false;
        }
    }

    /**
     * Advance the year in a lobby
     * @param {string} lobbyId - Lobby ID
     * @returns {Promise<boolean>} - Success status
     */
    async advanceYear(lobbyId) {
        try {
            if (this.hubConnection) {
                await this.hubConnection.invoke('AdvanceYear', lobbyId);
                return true;
            } else {
                const response = await fetch(`${this.baseUrl}/api/gamestate/${lobbyId}/advance-year`, {
                    method: 'POST'
                });
                return response.ok;
            }
        } catch (error) {
            console.error('Error advancing year:', error);
            return false;
        }
    }

    /**
     * Download the current game state as a JSON file
     * @param {Object} gameState - Game state to download
     * @param {string} filename - Filename for the download
     */
    downloadGameState(gameState, filename = 'gamestate.json') {
        const json = JSON.stringify(gameState, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
}

// Create a global instance of the API client
const apiClient = new ApiClient();