// Province Model

/**
 * Represents a province in the game
 * Each province is identified by its RGB color value from the map bitmap
 */
export class Province {
    // Province ID in the format R_G_B from the bitmap
    id: string;
    
    // Province name
    name: string;
    
    // Owner country ID, null if unowned
    ownerId: string | null;
    
    // Province type (land, water, wasteland)
    type: ProvinceType;
    
    // Province development level (countryside, village, town, city)
    level: ProvinceLevel;
    
    // Religion of the province
    religion: string;
    
    // Unrest level (0-100)
    unrest: number;
    
    // Buildings in the province
    buildings: Building[];
    
    // Armies stationed in the province
    armies: Army[];
    
    constructor(id: string, name: string, type: ProvinceType = ProvinceType.Land) {
        this.id = id;
        this.name = name;
        this.ownerId = null;
        this.type = type;
        this.level = ProvinceLevel.Countryside;
        this.religion = "";
        this.unrest = 0;
        this.buildings = [];
        this.armies = [];
    }
    
    // Get garrison strength based on province level
    get garrisonStrength(): number {
        return this.level * 100;
    }
    
    // Get income generated per turn
    get income(): number {
        return this.level * 50;
    }
}

// Province type enum
export enum ProvinceType {
    Land,
    Water,
    Wasteland
}

// Province level enum
export enum ProvinceLevel {
    Countryside = 1,
    Village = 2,
    Town = 3,
    City = 4,
    Metropolis = 5
}

// Import related models
import { Building } from './Building';
import { Army } from './Army';