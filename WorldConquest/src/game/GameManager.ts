// Game Manager

import { SignalRService } from '../services/SignalRService';
import { GameState } from '../models/GameState';
import { Lobby } from '../models/Lobby';
import { Player } from '../models/Player';
import { Province, ProvinceType, ProvinceLevel } from '../models/Province';
import { Country } from '../models/Country';
import { Army } from '../models/Army';
import { MapRenderer } from './MapRenderer';

/**
 * This class manages the game state and rendering
 */
export class GameManager {
    // Canvas and rendering
    private canvas: HTMLCanvasElement | null = null;
    private mapRenderer: MapRenderer | null = null;
    
    // Game state
    private gameState: GameState | null = null;
    private currentLobby: Lobby | null = null;
    private currentPlayer: Player | null = null;
    private connectionId: string | null = null;
    
    // Services
    private signalRService: SignalRService;
    
    // UI elements
    private dateDisplay: HTMLElement | null = null;
    private turnDisplay: HTMLElement | null = null;
    private moneyDisplay: HTMLElement | null = null;
    private chatMessages: HTMLElement | null = null;
    private chatInput: HTMLInputElement | null = null;
    private leftMenu: HTMLElement | null = null;
    private rightMenu: HTMLElement | null = null;
    
    constructor(signalRService: SignalRService) {
        // Initialize services
        this.signalRService = signalRService;
        
        // Check if we're in the game page or lobby page
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        const isGamePage = !!this.canvas;
        
        if (isGamePage) {
            // Initialize map renderer only if we're in the game page
            this.mapRenderer = new MapRenderer(this.canvas);
            
            // Initialize game UI elements
            this.dateDisplay = document.getElementById('current-date');
            this.turnDisplay = document.getElementById('current-player');
            this.moneyDisplay = document.getElementById('player-money');
            this.chatMessages = document.getElementById('chat-messages');
            this.chatInput = document.getElementById('chat-input-field') as HTMLInputElement;
            this.leftMenu = document.querySelector('.left-menu');
            this.rightMenu = document.querySelector('.right-menu');
            
            // Set up map event handlers
            this.setupMapEventHandlers();
        }
        
        // Set up common event handlers
        this.setupEventHandlers();
        
        console.log('GameManager initialized');
    }
    
    // Set up event handlers for SignalR events
    private setupEventHandlers(): void {
        // Connection events
        this.signalRService.setOnConnectionEstablished((connectionId: string) => {
            this.connectionId = connectionId;
            console.log('Connected with ID:', connectionId);
        });
        
        this.signalRService.setOnError((error: string) => {
            console.error('SignalR error:', error);
            // Display error to user
            alert(`Error: ${error}`);
        });
        
        // Lobby list events
        this.signalRService.setOnLobbiesReceived((lobbies: Lobby[]) => {
            this.updateLobbyListUI(lobbies);
        });
        
        this.signalRService.setOnLobbyListUpdated((lobbies: Lobby[]) => {
            this.updateLobbyListUI(lobbies);
        });
        
        // Lobby events
        this.signalRService.setOnLobbyCreated((lobby: Lobby) => {
            console.log('Lobby created event received:', lobby);
            this.currentLobby = lobby;
            console.log('Current lobby after creation:', this.currentLobby);
            this.updateLobbyUI();
        });
        
        this.signalRService.setOnLobbyJoined((lobby: Lobby) => {
            this.currentLobby = lobby;
            this.updateLobbyUI();
        });
        
        this.signalRService.setOnPlayerJoined((player: Player) => {
            if (this.currentLobby) {
                this.currentLobby.players.push(player);
                this.updateLobbyUI();
            }
        });
        
        this.signalRService.setOnPlayerLeft((playerId: string) => {
            if (this.currentLobby) {
                this.currentLobby.players = this.currentLobby.players.filter(p => p.id !== playerId);
                this.updateLobbyUI();
            }
        });
        
        // Player ready event
        this.signalRService.setOnPlayerReadyChanged((playerId: string, isReady: boolean) => {
            console.log('Player ready changed:', playerId, isReady);
            if (this.currentLobby) {
                // Update the player's ready status in the current lobby
                const player = this.currentLobby.players.find(p => p.id === playerId);
                if (player) {
                    player.isReady = isReady;
                    console.log(`Updated player ${player.name} ready status to ${isReady}`);
                    this.updateLobbyUI();
                }
            }
        });
        
        // All players ready event
        this.signalRService.setOnAllPlayersReady(() => {
            console.log('All players ready event received');
            this.updateLobbyUI();
        });
        
        // Game events
        this.signalRService.setOnGameStarted((gameState: GameState) => {
            console.log('Game started event received in GameManager:', gameState);
            console.log('Setting this.gameState to:', gameState);
            this.gameState = gameState;
            
            // Add a debug message to check if gameState was set
            console.log('this.gameState after setting:', this.gameState);
            
            this.updateGameUI();
            this.renderMap();
            
            // Add a system message to the chat
            if (this.chatMessages) {
                const systemMessage = {
                    playerName: 'System',
                    message: 'Game started! You can now send chat messages.',
                    timestamp: new Date(),
                    isAllyOnly: false
                };
                
                this.addChatMessage(systemMessage);
            }
            
            // Note: Lobby dialog hiding is now handled in index.ts
        });
        
        this.signalRService.setOnGameStateReceived((gameState: GameState) => {
            this.gameState = gameState;
            this.updateGameUI();
            this.renderMap();
        });
        
        this.signalRService.setOnNextTurnStarted((gameState: GameState) => {
            this.gameState = gameState;
            this.updateGameUI();
            this.renderMap();
        });
        
        // Chat events
        this.signalRService.setOnChatMessageReceived((message: any) => {
            this.addChatMessage(message);
        });
        
        // Game state save/load events
        this.signalRService.setOnGameStateSaved((gameStateId: string) => {
            alert(`Game state saved successfully!`);
        });
        
        this.signalRService.setOnGameStateLoaded((gameState: GameState) => {
            this.gameState = gameState;
            this.updateGameUI();
            this.renderMap();
        });
    }
    
    // Initialize the game
    async initialize(): Promise<void> {
        try {
            // Start the SignalR connection
            await this.signalRService.start();
            
            // Test the connection
            await this.signalRService.testConnection();
            
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }
    
    // Create a new lobby
    async createLobby(playerName: string, lobbyName: string, maxPlayers: number, isPasswordProtected: boolean, password: string | null): Promise<void> {
        try {
            await this.signalRService.createLobby(playerName, lobbyName, maxPlayers, isPasswordProtected, password);
            this.currentPlayer = new Player(this.connectionId!, playerName);
        } catch (error) {
            console.error('Failed to create lobby:', error);
        }
    }
    
    // Join an existing lobby
    async joinLobby(playerName: string, lobbyId: string, password: string | null): Promise<void> {
        try {
            await this.signalRService.joinLobby(playerName, lobbyId, password);
            this.currentPlayer = new Player(this.connectionId!, playerName);
        } catch (error) {
            console.error('Failed to join lobby:', error);
        }
    }
    
    // Leave the current lobby
    async leaveLobby(): Promise<void> {
        if (!this.currentLobby) return;
        
        try {
            await this.signalRService.leaveLobby(this.currentLobby.id);
            this.currentLobby = null;
            this.updateLobbyUI();
        } catch (error) {
            console.error('Failed to leave lobby:', error);
        }
    }
    
    // Get all available lobbies
    async getLobbies(): Promise<void> {
        try {
            await this.signalRService.getLobbies();
        } catch (error) {
            console.error('Failed to get lobbies:', error);
        }
    }
    
    // Set player ready status
    async setPlayerReady(isReady: boolean): Promise<void> {
        if (!this.currentLobby) return;
        
        try {
            await this.signalRService.setPlayerReady(this.currentLobby.id, isReady);
        } catch (error) {
            console.error('Failed to set player ready:', error);
        }
    }
    
    // Start the game
    async startGame(): Promise<void> {
        console.log('startGame method called');
        console.log('Current lobby:', this.currentLobby);
        
        if (!this.currentLobby) {
            console.error('Cannot start game: No active lobby');
            alert('Cannot start game: No active lobby. Please create or join a lobby first.');
            return;
        }
        
        console.log(`Attempting to start game for lobby: ${this.currentLobby.id}`);
        
        try {
            // Hide the lobby dialog immediately when starting the game
            const lobbyDialog = document.getElementById('lobby-dialog');
            if (lobbyDialog) {
                console.log('Hiding lobby dialog from startGame method');
                lobbyDialog.style.display = 'none';
            }
            
            console.log('Calling SignalR startGame method...');
            await this.signalRService.startGame(this.currentLobby.id);
            console.log('SignalR startGame method called successfully');
            
            // If we don't have a game state yet, create a temporary one
            if (!this.gameState) {
                console.log('Creating temporary game state');
                // Add a system message to the chat
                if (this.chatMessages) {
                    const systemMessage = {
                        playerName: 'System',
                        message: 'Game is starting... Please wait.',
                        timestamp: new Date(),
                        isAllyOnly: false
                    };
                    
                    this.addChatMessage(systemMessage);
                }
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            alert(`Failed to start game: ${error}`);
            
            // Show the lobby dialog again if there was an error
            const lobbyDialog = document.getElementById('lobby-dialog');
            if (lobbyDialog) {
                lobbyDialog.style.display = 'flex';
            }
        }
    }
    
    // End the current player's turn
    async endTurn(): Promise<void> {
        if (!this.gameState) return;
        
        try {
            await this.signalRService.endTurn(this.gameState.id);
        } catch (error) {
            console.error('Failed to end turn:', error);
        }
    }
    
    // Send a chat message
    async sendChatMessage(message: string): Promise<void> {
        try {
            if (!this.gameState) {
                console.error('Cannot send chat message: No active game state');
                
                // Create a local message to display in the chat
                if (this.chatMessages && this.chatInput) {
                    const localMessage = {
                        playerName: 'System',
                        message: 'You need to be in an active game to send messages.',
                        timestamp: new Date(),
                        isAllyOnly: false
                    };
                    
                    this.addChatMessage(localMessage);
                    this.chatInput.value = '';
                }
                return;
            }
            
            console.log(`Sending chat message to game ${this.gameState.id}: ${message}`);
            await this.signalRService.sendChatMessage(this.gameState.id, message);
            
            // Clear the input field
            if (this.chatInput) {
                this.chatInput.value = '';
            }
        } catch (error) {
            console.error('Failed to send chat message:', error);
            
            // Display error in chat
            if (this.chatMessages) {
                const errorMessage = {
                    playerName: 'System',
                    message: `Error sending message: ${error}`,
                    timestamp: new Date(),
                    isAllyOnly: false
                };
                
                this.addChatMessage(errorMessage);
            }
        }
    }
    
    // Save the current game state
    async saveGameState(): Promise<void> {
        if (!this.gameState) return;
        
        try {
            await this.signalRService.saveGameState(this.gameState.id);
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }
    
    // Load a saved game state
    async loadGameState(savedGamePath: string): Promise<void> {
        try {
            await this.signalRService.loadGameState(savedGamePath);
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
    }
    
    // Join an existing game
    async joinGame(gameId: string): Promise<void> {
        try {
            // Request the game state from the server
            await this.signalRService.getGameState(gameId);
            console.log(`Joined game with ID: ${gameId}`);
        } catch (error) {
            console.error('Failed to join game:', error);
            throw error;
        }
    }
    
    // Update the lobby UI
    private updateLobbyUI(): void {
        if (!this.currentLobby) return;
        
        // Get the lobby container
        const lobbyContainer = document.getElementById('lobby-container');
        if (!lobbyContainer) return;
        
        // Show the lobby container
        lobbyContainer.style.display = 'block';
        
        // Update lobby info
        const lobbyName = document.getElementById('lobby-name-display');
        if (lobbyName) {
            lobbyName.textContent = this.currentLobby.name;
        }
        
        // Update player list
        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.innerHTML = '';
            
            this.currentLobby.players.forEach(player => {
                const playerItem = document.createElement('div');
                playerItem.className = 'player-item';
                
                const isHost = player.id === this.currentLobby!.hostId;
                const isCurrentPlayer = player.id === this.connectionId;
                
                playerItem.innerHTML = `
                    <span class="player-name">${player.name}</span>
                    <span class="player-status">${player.isReady ? '✓ Ready' : '✗ Not Ready'}</span>
                    ${isHost ? '<span class="host-badge">Host</span>' : ''}
                    ${isCurrentPlayer ? '<button class="ready-btn">' + (player.isReady ? 'Set Not Ready' : 'Set Ready') + '</button>' : ''}
                `;
                
                playerList.appendChild(playerItem);
                
                // Add event listener to ready button
                if (isCurrentPlayer) {
                    const readyBtn = playerItem.querySelector('.ready-btn');
                    if (readyBtn) {
                        readyBtn.addEventListener('click', () => {
                            this.setPlayerReady(!player.isReady);
                        });
                    }
                }
            });
        }
        
        // Update start game button visibility
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            // Only the host can start the game
            const isHost = this.connectionId === this.currentLobby.hostId;
            startGameBtn.style.display = isHost ? 'block' : 'none';
            
            // Check if all players are ready
            const allReady = this.currentLobby.players.every(p => p.isReady);
            (startGameBtn as HTMLButtonElement).disabled = !allReady;
        }
    }
    
    // Update the lobby list UI
    private updateLobbyListUI(lobbies: Lobby[]): void {
        // Get the lobby list container
        const lobbyListContainer = document.getElementById('lobby-list');
        if (!lobbyListContainer) return;
        
        // Clear the list
        lobbyListContainer.innerHTML = '';
        
        // Add each lobby to the list
        lobbies.forEach(lobby => {
            const lobbyItem = document.createElement('div');
            lobbyItem.className = 'lobby-item';
            
            lobbyItem.innerHTML = `
                <span class="lobby-name">${lobby.name}</span>
                <span class="lobby-players">${lobby.players.length}/${lobby.maxPlayers}</span>
                <span class="lobby-password">${lobby.isPasswordProtected ? '🔒' : '🔓'}</span>
                <button class="join-btn">Join</button>
            `;
            
            lobbyListContainer.appendChild(lobbyItem);
            
            // Add event listener to join button
            const joinBtn = lobbyItem.querySelector('.join-btn');
            if (joinBtn) {
                joinBtn.addEventListener('click', () => {
                    // If password protected, show password prompt
                    if (lobby.isPasswordProtected) {
                        const password = prompt('Enter lobby password:');
                        if (password !== null) {
                            const playerName = (document.getElementById('player-name-input') as HTMLInputElement)?.value || 'Player';
                            this.joinLobby(playerName, lobby.id, password);
                        }
                    } else {
                        const playerName = (document.getElementById('player-name-input') as HTMLInputElement)?.value || 'Player';
                        this.joinLobby(playerName, lobby.id, null);
                    }
                });
            }
        });
    }
    
    // Update the game UI
    private updateGameUI(): void {
        if (!this.gameState) return;
        
        // Update date display
        if (this.dateDisplay) {
            this.dateDisplay.textContent = this.gameState.currentDate.toString();
        }
        
        // Update turn display
        if (this.turnDisplay && this.gameState.turnOrder.length > 0) {
            const currentPlayerId = this.gameState.turnOrder[this.gameState.currentPlayerIndex];
            const currentPlayer = this.gameState.players.get(currentPlayerId);
            if (currentPlayer) {
                this.turnDisplay.textContent = currentPlayer.name;
            }
        }
        
        // Update money display
        if (this.moneyDisplay && this.currentPlayer && this.currentPlayer.countryId) {
            const country = this.gameState.countries.get(this.currentPlayer.countryId);
            if (country) {
                this.moneyDisplay.textContent = country.money.toString();
            }
        }
        
        console.log('Game UI updated');
    }
    
    // Set up map event handlers
    private setupMapEventHandlers(): void {
        if (!this.canvas) return;
        
        // Handle province selection
        this.canvas.addEventListener('provinceSelected', ((event: CustomEvent<Province>) => {
            const province = event.detail;
            this.showProvinceInfo(province);
        }) as EventListener);
    }
    
    // Show province information in the right menu
    private showProvinceInfo(province: Province): void {
        if (!this.rightMenu || !this.gameState) return;
        
        // Clear the right menu
        this.rightMenu.innerHTML = '';
        
        // Create province info panel
        const provincePanel = document.createElement('div');
        provincePanel.className = 'province-panel';
        
        // Province header
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.textContent = province.name;
        provincePanel.appendChild(header);
        
        // Province details
        const details = document.createElement('div');
        details.className = 'panel-content';
        
        // Owner
        const ownerDiv = document.createElement('div');
        ownerDiv.className = 'info-row';
        if (province.ownerId) {
            const country = this.gameState.countries.get(province.ownerId);
            if (country) {
                ownerDiv.innerHTML = `<span class="label">Owner:</span> <span class="value">${country.name}</span>`;
                ownerDiv.style.color = country.color;
            }
        } else {
            ownerDiv.innerHTML = `<span class="label">Owner:</span> <span class="value">None</span>`;
        }
        details.appendChild(ownerDiv);
        
        // Type
        const typeDiv = document.createElement('div');
        typeDiv.className = 'info-row';
        typeDiv.innerHTML = `<span class="label">Type:</span> <span class="value">${ProvinceType[province.type]}</span>`;
        details.appendChild(typeDiv);
        
        // Level
        const levelDiv = document.createElement('div');
        levelDiv.className = 'info-row';
        levelDiv.innerHTML = `<span class="label">Level:</span> <span class="value">${ProvinceLevel[province.level]}</span>`;
        details.appendChild(levelDiv);
        
        // Religion
        if (province.religion) {
            const religionDiv = document.createElement('div');
            religionDiv.className = 'info-row';
            religionDiv.innerHTML = `<span class="label">Religion:</span> <span class="value">${province.religion}</span>`;
            details.appendChild(religionDiv);
        }
        
        // Unrest
        const unrestDiv = document.createElement('div');
        unrestDiv.className = 'info-row';
        unrestDiv.innerHTML = `<span class="label">Unrest:</span> <span class="value">${province.unrest}%</span>`;
        details.appendChild(unrestDiv);
        
        // Income
        const incomeDiv = document.createElement('div');
        incomeDiv.className = 'info-row';
        incomeDiv.innerHTML = `<span class="label">Income:</span> <span class="value">${province.income}</span>`;
        details.appendChild(incomeDiv);
        
        // Garrison
        const garrisonDiv = document.createElement('div');
        garrisonDiv.className = 'info-row';
        garrisonDiv.innerHTML = `<span class="label">Garrison:</span> <span class="value">${province.garrisonStrength}</span>`;
        details.appendChild(garrisonDiv);
        
        // Buildings
        if (province.buildings.length > 0) {
            const buildingsHeader = document.createElement('h3');
            buildingsHeader.textContent = 'Buildings';
            details.appendChild(buildingsHeader);
            
            const buildingsList = document.createElement('ul');
            buildingsList.className = 'buildings-list';
            
            province.buildings.forEach(building => {
                const buildingItem = document.createElement('li');
                buildingItem.textContent = building.name;
                buildingsList.appendChild(buildingItem);
            });
            
            details.appendChild(buildingsList);
        }
        
        // Armies
        if (province.armies.length > 0) {
            const armiesHeader = document.createElement('h3');
            armiesHeader.textContent = 'Armies';
            details.appendChild(armiesHeader);
            
            const armiesList = document.createElement('ul');
            armiesList.className = 'armies-list';
            
            province.armies.forEach(army => {
                const armyItem = document.createElement('li');
                
                // Get the country that owns this army
                const country = this.gameState!.countries.get(army.countryId);
                const countryName = country ? country.name : 'Unknown';
                
                armyItem.textContent = `${countryName}'s Army (${army.units.length} units)`;
                armyItem.style.color = country ? country.color : '#000';
                
                armiesList.appendChild(armyItem);
            });
            
            details.appendChild(armiesList);
        }
        
        // Actions
        if (province.ownerId === this.currentPlayer?.countryId) {
            const actionsHeader = document.createElement('h3');
            actionsHeader.textContent = 'Actions';
            details.appendChild(actionsHeader);
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'province-actions';
            
            // Upgrade province button
            const upgradeBtn = document.createElement('button');
            upgradeBtn.className = 'btn';
            upgradeBtn.textContent = 'Upgrade Province';
            upgradeBtn.addEventListener('click', () => {
                // TODO: Implement province upgrade
                alert('Province upgrade not implemented yet');
            });
            actionsDiv.appendChild(upgradeBtn);
            
            // Build building button
            const buildBtn = document.createElement('button');
            buildBtn.className = 'btn';
            buildBtn.textContent = 'Build Building';
            buildBtn.addEventListener('click', () => {
                // TODO: Implement building construction
                alert('Building construction not implemented yet');
            });
            actionsDiv.appendChild(buildBtn);
            
            details.appendChild(actionsDiv);
        }
        
        provincePanel.appendChild(details);
        this.rightMenu.appendChild(provincePanel);
    }
    
    // Render the map
    private renderMap(): void {
        if (!this.gameState || !this.mapRenderer) return;
        
        // Update the map renderer with game data
        this.mapRenderer.setGameData(this.gameState.provinces, this.gameState.countries);
        
        // Render the map
        this.mapRenderer.render();
        
        console.log('Map rendered');
    }
    
    // Add a chat message to the UI
    private addChatMessage(message: any): void {
        if (!this.chatMessages) {
            console.error('Cannot add chat message: Chat messages container not found');
            return;
        }
        
        console.log('Adding chat message to UI:', message);
        
        // Make sure the chat messages container exists and is visible
        this.chatMessages.style.display = 'block';
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        // Format timestamp
        let timeString = '';
        try {
            const timestamp = new Date(message.timestamp);
            timeString = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            timeString = '00:00'; // Fallback
        }
        
        // Create message content with proper escaping to prevent XSS
        const playerName = this.escapeHtml(message.playerName || 'Unknown');
        const messageText = this.escapeHtml(message.message || '');
        
        messageElement.innerHTML = `
            <span class="chat-time">[${timeString}]</span>
            <span class="chat-player">${playerName}:</span>
            <span class="chat-text">${messageText}</span>
        `;
        
        if (message.isAllyOnly) {
            messageElement.classList.add('ally-message');
        }
        
        // Add the message to the chat container
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to the bottom to show the new message
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Log confirmation that the message was added
        console.log('Chat message added to UI successfully');
    }
    
    // Helper method to escape HTML to prevent XSS
    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}