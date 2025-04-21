// Unit Model

/**
 * Represents a military unit in an army
 */
export class Unit {
    // Unit ID
    id: string;
    
    // Unit type
    type: string;
    
    // Unit level (technology level)
    level: number;
    
    // Maximum strength (number of soldiers)
    maxStrength: number;
    
    // Current strength (number of soldiers)
    currentStrength: number;
    
    // Recruitment cost
    recruitmentCost: number;
    
    // Maintenance cost per turn
    maintenanceCost: number;
    
    // Combat effectiveness (multiplier for strength)
    combatEffectiveness: number;
    
    constructor(id: string, type: string, level: number, maxStrength: number, recruitmentCost: number, maintenanceCost: number, combatEffectiveness: number = 1.0) {
        this.id = id;
        this.type = type;
        this.level = level;
        this.maxStrength = maxStrength;
        this.currentStrength = maxStrength;
        this.recruitmentCost = recruitmentCost;
        this.maintenanceCost = maintenanceCost;
        this.combatEffectiveness = combatEffectiveness;
    }
    
    // Calculate effective combat strength
    calculateEffectiveStrength(): number {
        return Math.floor(this.currentStrength * this.combatEffectiveness);
    }
    
    // Reinforce unit to full strength
    reinforce(): number {
        const soldiersNeeded = this.maxStrength - this.currentStrength;
        const cost = Math.floor((soldiersNeeded * this.recruitmentCost) / this.maxStrength);
        this.currentStrength = this.maxStrength;
        return cost;
    }
}

// Common unit types
export class UnitTypes {
    static readonly Infantry: string = "Infantry";
    static readonly Cavalry: string = "Cavalry";
    static readonly Artillery: string = "Artillery";
    static readonly Navy: string = "Navy";
}