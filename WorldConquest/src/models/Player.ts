// Player Model

/**
 * Represents a player in the game
 */
export class Player {
    // Player ID (connection ID)
    id: string;
    
    // Player name
    name: string;
    
    // Country ID controlled by this player
    countryId: string | null;
    
    // Is the player currently connected
    isConnected: boolean;
    
    // Is the player ready to start the game
    isReady: boolean;
    
    // Has the player finished their turn
    hasFinishedTurn: boolean;
    
    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.countryId = null;
        this.isConnected = true;
        this.isReady = false;
        this.hasFinishedTurn = false;
    }
    
    // Assign a country to this player
    assignCountry(countryId: string): void {
        this.countryId = countryId;
    }
    
    // Mark the player as ready to start
    markAsReady(): void {
        this.isReady = true;
    }
    
    // Mark the player as having finished their turn
    finishTurn(): void {
        this.hasFinishedTurn = true;
    }
    
    // Reset the player's turn status for a new turn
    resetTurn(): void {
        this.hasFinishedTurn = false;
    }
    
    // Mark the player as connected/disconnected
    setConnectionStatus(isConnected: boolean): void {
        this.isConnected = isConnected;
    }
}