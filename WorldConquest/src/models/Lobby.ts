// Lobby Model

/**
 * Represents a game lobby
 */
export class Lobby {
    // Lobby ID
    id: string;
    
    // Lobby name
    name: string;
    
    // Host player ID
    hostId: string;
    
    // Players in the lobby
    players: Player[];
    
    // Maximum number of players
    maxPlayers: number;
    
    // Is the lobby password protected
    isPasswordProtected: boolean;
    
    // Is the game in progress
    isGameStarted: boolean;
    
    // Game state ID associated with this lobby
    gameStateId: string | null;
    
    // Creation time
    createdAt: Date;
    
    constructor(id: string, name: string, hostId: string, maxPlayers: number = 8, isPasswordProtected: boolean = false) {
        this.id = id;
        this.name = name;
        this.hostId = hostId;
        this.players = [];
        this.maxPlayers = maxPlayers;
        this.isPasswordProtected = isPasswordProtected;
        this.isGameStarted = false;
        this.gameStateId = null;
        this.createdAt = new Date();
    }
    
    // Check if all players are ready
    areAllPlayersReady(): boolean {
        return this.players.length > 0 && this.players.every(p => p.isReady);
    }
    
    // Check if all players have finished their turn
    haveAllPlayersFinishedTurn(): boolean {
        return this.players.length > 0 && this.players.every(p => p.hasFinishedTurn);
    }
    
    // Get the host player
    getHost(): Player | undefined {
        return this.players.find(p => p.id === this.hostId);
    }
    
    // Check if a player is in the lobby
    hasPlayer(playerId: string): boolean {
        return this.players.some(p => p.id === playerId);
    }
    
    // Check if the lobby is full
    isFull(): boolean {
        return this.players.length >= this.maxPlayers;
    }
}

// Import related models
import { Player } from './Player';