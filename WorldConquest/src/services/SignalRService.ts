// SignalR Service

import * as signalR from '@microsoft/signalr';
import { GameState } from '../models/GameState';
import { Lobby } from '../models/Lobby';
import { Player } from '../models/Player';
import { ChatMessage } from '../models/GameState';

/**
 * This service handles communication with the SignalR hub
 */
export class SignalRService {
    private connection: signalR.HubConnection;
    private connectionPromise: Promise<void> | null = null;
    
    // Event callbacks
    private onConnectionEstablished: ((connectionId: string) => void) | null = null;
    private onError: ((error: string) => void) | null = null;
    private onLobbyCreated: ((lobby: Lobby) => void) | null = null;
    private onLobbyJoined: ((lobby: Lobby) => void) | null = null;
    private onPlayerJoined: ((player: Player) => void) | null = null;
    private onPlayerLeft: ((playerId: string) => void) | null = null;
    private onLobbiesReceived: ((lobbies: Lobby[]) => void) | null = null;
    private onLobbyListUpdated: ((lobbies: Lobby[]) => void) | null = null;
    private onPlayerReadyChanged: ((playerId: string, isReady: boolean) => void) | null = null;
    private onAllPlayersReady: (() => void) | null = null;
    private onGameStartedCallbacks: ((gameState: GameState) => void)[] = [];
    private onGameStateReceived: ((gameState: GameState) => void) | null = null;
    private onTurnEnded: ((playerId: string) => void) | null = null;
    private onNextTurnStarted: ((gameState: GameState) => void) | null = null;
    private onChatMessageReceived: ((message: ChatMessage) => void) | null = null;
    private onGameStateSaved: ((gameStateId: string) => void) | null = null;
    private onGameStateLoaded: ((gameState: GameState) => void) | null = null;
    
    constructor() {
        // Create the connection
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl('/gamehub')
            .withAutomaticReconnect()
            .build();
        
        // Set up event handlers
        this.setupEventHandlers();
    }
    
    // Start the connection
    async start(): Promise<void> {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        
        this.connectionPromise = this.connection.start();
        
        try {
            await this.connectionPromise;
            console.log('SignalR connection established');
        } catch (error) {
            console.error('SignalR connection failed:', error);
            this.connectionPromise = null;
            throw error;
        }
        
        return this.connectionPromise;
    }
    
    // Stop the connection
    async stop(): Promise<void> {
        if (this.connection) {
            await this.connection.stop();
            this.connectionPromise = null;
            console.log('SignalR connection stopped');
        }
    }
    
    // Set up event handlers
    private setupEventHandlers(): void {
        this.connection.on('ConnectionEstablished', (connectionId: string) => {
            console.log('Connection established with ID:', connectionId);
            if (this.onConnectionEstablished) {
                this.onConnectionEstablished(connectionId);
            }
        });
        
        this.connection.on('Error', (error: string) => {
            console.error('SignalR error:', error);
            if (this.onError) {
                this.onError(error);
            }
        });
        
        this.connection.on('LobbyCreated', (lobby: Lobby) => {
            console.log('Lobby created:', lobby);
            if (this.onLobbyCreated) {
                this.onLobbyCreated(lobby);
            }
        });
        
        this.connection.on('LobbyJoined', (lobby: Lobby) => {
            console.log('Lobby joined:', lobby);
            if (this.onLobbyJoined) {
                this.onLobbyJoined(lobby);
            }
        });
        
        this.connection.on('PlayerJoined', (player: Player) => {
            console.log('Player joined:', player);
            if (this.onPlayerJoined) {
                this.onPlayerJoined(player);
            }
        });
        
        this.connection.on('PlayerLeft', (playerId: string) => {
            console.log('Player left:', playerId);
            if (this.onPlayerLeft) {
                this.onPlayerLeft(playerId);
            }
        });
        
        this.connection.on('LobbiesReceived', (lobbies: Lobby[]) => {
            console.log('Lobbies received:', lobbies);
            if (this.onLobbiesReceived) {
                this.onLobbiesReceived(lobbies);
            }
        });
        
        this.connection.on('LobbyListUpdated', (lobbies: Lobby[]) => {
            console.log('Lobby list updated:', lobbies);
            if (this.onLobbyListUpdated) {
                this.onLobbyListUpdated(lobbies);
            }
        });
        
        this.connection.on('PlayerReadyChanged', (playerId: string, isReady: boolean) => {
            console.log('Player ready changed:', playerId, isReady);
            if (this.onPlayerReadyChanged) {
                this.onPlayerReadyChanged(playerId, isReady);
            }
        });
        
        this.connection.on('AllPlayersReady', () => {
            console.log('All players ready');
            if (this.onAllPlayersReady) {
                this.onAllPlayersReady();
            }
        });
        
        this.connection.on('GameStarted', (gameState: GameState) => {
            console.log('Game started:', gameState);
            // Call all registered callbacks
            for (const callback of this.onGameStartedCallbacks) {
                callback(gameState);
            }
        });
        
        this.connection.on('GameStateReceived', (gameState: GameState) => {
            console.log('Game state received:', gameState);
            if (this.onGameStateReceived) {
                this.onGameStateReceived(gameState);
            }
        });
        
        this.connection.on('TurnEnded', (playerId: string) => {
            console.log('Turn ended:', playerId);
            if (this.onTurnEnded) {
                this.onTurnEnded(playerId);
            }
        });
        
        this.connection.on('NextTurnStarted', (gameState: GameState) => {
            console.log('Next turn started:', gameState);
            if (this.onNextTurnStarted) {
                this.onNextTurnStarted(gameState);
            }
        });
        
        this.connection.on('ChatMessageReceived', (message: ChatMessage) => {
            console.log('Chat message received:', message);
            if (this.onChatMessageReceived) {
                this.onChatMessageReceived(message);
            }
        });
        
        this.connection.on('GameStateSaved', (gameStateId: string) => {
            console.log('Game state saved:', gameStateId);
            if (this.onGameStateSaved) {
                this.onGameStateSaved(gameStateId);
            }
        });
        
        this.connection.on('GameStateLoaded', (gameState: GameState) => {
            console.log('Game state loaded:', gameState);
            if (this.onGameStateLoaded) {
                this.onGameStateLoaded(gameState);
            }
        });
    }
    
    // Set event callbacks
    setOnConnectionEstablished(callback: (connectionId: string) => void): void {
        this.onConnectionEstablished = callback;
    }
    
    setOnError(callback: (error: string) => void): void {
        this.onError = callback;
    }
    
    setOnLobbyCreated(callback: (lobby: Lobby) => void): void {
        this.onLobbyCreated = callback;
    }
    
    setOnLobbyJoined(callback: (lobby: Lobby) => void): void {
        this.onLobbyJoined = callback;
    }
    
    setOnPlayerJoined(callback: (player: Player) => void): void {
        this.onPlayerJoined = callback;
    }
    
    setOnPlayerLeft(callback: (playerId: string) => void): void {
        this.onPlayerLeft = callback;
    }
    
    setOnLobbiesReceived(callback: (lobbies: Lobby[]) => void): void {
        this.onLobbiesReceived = callback;
    }
    
    setOnLobbyListUpdated(callback: (lobbies: Lobby[]) => void): void {
        this.onLobbyListUpdated = callback;
    }
    
    setOnPlayerReadyChanged(callback: (playerId: string, isReady: boolean) => void): void {
        this.onPlayerReadyChanged = callback;
    }
    
    setOnAllPlayersReady(callback: () => void): void {
        this.onAllPlayersReady = callback;
    }
    
    setOnGameStarted(callback: (gameState: GameState) => void): void {
        this.onGameStartedCallbacks.push(callback);
    }
    
    setOnGameStateReceived(callback: (gameState: GameState) => void): void {
        this.onGameStateReceived = callback;
    }
    
    setOnTurnEnded(callback: (playerId: string) => void): void {
        this.onTurnEnded = callback;
    }
    
    setOnNextTurnStarted(callback: (gameState: GameState) => void): void {
        this.onNextTurnStarted = callback;
    }
    
    setOnChatMessageReceived(callback: (message: ChatMessage) => void): void {
        this.onChatMessageReceived = callback;
    }
    
    setOnGameStateSaved(callback: (gameStateId: string) => void): void {
        this.onGameStateSaved = callback;
    }
    
    setOnGameStateLoaded(callback: (gameState: GameState) => void): void {
        this.onGameStateLoaded = callback;
    }
    
    // API methods
    
    // Test the connection
    async testConnection(): Promise<void> {
        await this.start();
        await this.connection.invoke('TestConnection');
    }
    
    // Lobby management
    
    async createLobby(playerName: string, lobbyName: string, maxPlayers: number, isPasswordProtected: boolean, password: string | null): Promise<void> {
        await this.start();
        await this.connection.invoke('CreateLobby', playerName, lobbyName, maxPlayers, isPasswordProtected, password);
    }
    
    async joinLobby(playerName: string, lobbyId: string, password: string | null): Promise<void> {
        await this.start();
        await this.connection.invoke('JoinLobby', playerName, lobbyId, password);
    }
    
    async leaveLobby(lobbyId: string): Promise<void> {
        await this.start();
        await this.connection.invoke('LeaveLobby', lobbyId);
    }
    
    async getLobbies(): Promise<void> {
        await this.start();
        await this.connection.invoke('GetLobbies');
    }
    
    async setPlayerReady(lobbyId: string, isReady: boolean): Promise<void> {
        await this.start();
        await this.connection.invoke('SetPlayerReady', lobbyId, isReady);
    }
    
    // Game management
    
    async startGame(lobbyId: string): Promise<void> {
        await this.start();
        await this.connection.invoke('StartGame', lobbyId);
    }
    
    async getGameState(gameStateId: string): Promise<void> {
        await this.start();
        await this.connection.invoke('GetGameState', gameStateId);
    }
    
    async endTurn(gameStateId: string): Promise<void> {
        await this.start();
        await this.connection.invoke('EndTurn', gameStateId);
    }
    
    // Chat functionality
    
    async sendChatMessage(gameStateId: string, message: string): Promise<void> {
        await this.start();
        await this.connection.invoke('SendChatMessage', gameStateId, message);
    }
    
    async saveGameState(gameStateId: string): Promise<void> {
        await this.start();
        await this.connection.invoke('SaveGameState', gameStateId);
    }
    
    async loadGameState(savedGamePath: string): Promise<void> {
        await this.start();
        await this.connection.invoke('LoadGameState', savedGamePath);
    }
}