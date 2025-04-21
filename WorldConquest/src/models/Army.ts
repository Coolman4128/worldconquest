// Army Model

/**
 * Represents an army in the game
 */
export class Army {
    // Army ID
    id: string;
    
    // Army name
    name: string;
    
    // Country ID that owns this army
    countryId: string;
    
    // General name
    general: string;
    
    // Current province ID where the army is located
    currentProvinceId: string;
    
    // Units in the army
    units: Unit[];
    
    // Remaining movement points for the current turn (max 5)
    movementPoints: number;
    
    constructor(id: string, name: string, countryId: string, general: string, startingProvinceId: string) {
        this.id = id;
        this.name = name;
        this.countryId = countryId;
        this.general = general;
        this.currentProvinceId = startingProvinceId;
        this.units = [];
        this.movementPoints = 5;
    }
    
    // Calculate the total maintenance cost of all units
    get maintenanceCost(): number {
        return this.units.reduce((total, unit) => total + unit.maintenanceCost, 0);
    }
    
    // Calculate the total strength of all units
    get totalStrength(): number {
        return this.units.reduce((total, unit) => total + unit.currentStrength, 0);
    }
    
    // Reset movement points for a new turn
    resetMovementPoints(): void {
        this.movementPoints = 5;
    }
    
    // Move the army to a new province
    moveToProvince(provinceId: string): boolean {
        if (this.movementPoints > 0) {
            this.currentProvinceId = provinceId;
            this.movementPoints--;
            return true;
        }
        return false;
    }
    
    // Apply battle casualties
    applyBattleCasualties(casualties: number, isWinner: boolean): void {
        // Calculate percentage of casualties
        const casualtyPercentage = casualties / this.totalStrength;
        
        // Apply casualties to each unit
        this.units.forEach(unit => {
            const unitCasualties = Math.floor(unit.currentStrength * casualtyPercentage);
            unit.currentStrength -= unitCasualties;
        });
        
        // If winner, consolidate units
        if (isWinner) {
            this.consolidateUnits();
        }
    }
    
    // Consolidate units after battle (units with <50% strength die, others go back to 100%)
    private consolidateUnits(): void {
        for (let i = this.units.length - 1; i >= 0; i--) {
            const unit = this.units[i];
            if (unit.currentStrength / unit.maxStrength < 0.5) {
                this.units.splice(i, 1);
            } else {
                unit.currentStrength = unit.maxStrength;
            }
        }
    }
}

// Import related models
import { Unit } from './Unit';