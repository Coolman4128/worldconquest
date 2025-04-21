// GameState Model

/**
 * Represents the current state of the game
 */
export class GameState {
    // Game state ID
    id: string;
    
    // Associated lobby ID
    lobbyId: string;
    
    // Current date in the game (year-month-day)
    currentDate: GameDate;
    
    // Current player's turn (index in the turn order)
    currentPlayerIndex: number;
    
    // Turn order (list of player IDs)
    turnOrder: string[];
    
    // All provinces in the game
    provinces: Map<string, Province>;
    
    // All countries in the game
    countries: Map<string, Country>;
    
    // All armies in the game
    armies: Map<string, Army>;
    
    // All players in the game
    players: Map<string, Player>;
    
    // Game chat messages
    chatMessages: ChatMessage[];
    
    // Last updated timestamp
    lastUpdated: Date;
    
    constructor(id: string, lobbyId: string) {
        this.id = id;
        this.lobbyId = lobbyId;
        this.currentDate = new GameDate(1444, 1, 1); // Start date
        this.currentPlayerIndex = 0;
        this.turnOrder = [];
        this.provinces = new Map<string, Province>();
        this.countries = new Map<string, Country>();
        this.armies = new Map<string, Army>();
        this.players = new Map<string, Player>();
        this.chatMessages = [];
        this.lastUpdated = new Date();
    }
    
    // Get the current player
    getCurrentPlayer(): Player | undefined {
        if (this.turnOrder.length === 0) return undefined;
        const currentPlayerId = this.turnOrder[this.currentPlayerIndex];
        return this.players.get(currentPlayerId);
    }
    
    // Get a player's country
    getPlayerCountry(playerId: string): Country | undefined {
        const player = this.players.get(playerId);
        if (!player || !player.countryId) return undefined;
        return this.countries.get(player.countryId);
    }
    
    // Get provinces owned by a country
    getCountryProvinces(countryId: string): Province[] {
        const result: Province[] = [];
        for (const province of this.provinces.values()) {
            if (province.ownerId === countryId) {
                result.push(province);
            }
        }
        return result;
    }
    
    // Get armies belonging to a country
    getCountryArmies(countryId: string): Army[] {
        const result: Army[] = [];
        for (const army of this.armies.values()) {
            if (army.countryId === countryId) {
                result.push(army);
            }
        }
        return result;
    }
    
    // Get armies in a province
    getProvincesArmies(provinceId: string): Army[] {
        const result: Army[] = [];
        for (const army of this.armies.values()) {
            if (army.currentProvinceId === provinceId) {
                result.push(army);
            }
        }
        return result;
    }
}

/**
 * Represents a date in the game
 */
export class GameDate {
    year: number;
    month: number;
    day: number;
    
    constructor(year: number, month: number, day: number) {
        this.year = year;
        this.month = month;
        this.day = day;
    }
    
    // Add months to the date
    addMonths(months: number): void {
        this.month += months;
        while (this.month > 12) {
            this.month -= 12;
            this.year++;
        }
    }
    
    // Format the date as a string
    toString(): string {
        return `${this.year}-${this.month.toString().padStart(2, '0')}-${this.day.toString().padStart(2, '0')}`;
    }
}

/**
 * Represents a chat message in the game
 */
export class ChatMessage {
    playerId: string;
    playerName: string;
    message: string;
    isAllyOnly: boolean;
    timestamp: Date;
    
    constructor(playerId: string, playerName: string, message: string, isAllyOnly: boolean = false) {
        this.playerId = playerId;
        this.playerName = playerName;
        this.message = message;
        this.isAllyOnly = isAllyOnly;
        this.timestamp = new Date();
    }
}

// Import related models
import { Province } from './Province';
import { Country } from './Country';
import { Army } from './Army';
import { Player } from './Player';