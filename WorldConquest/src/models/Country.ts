// Country Model

/**
 * Represents a country in the game
 */
export class Country {
    // Country ID
    id: string;
    
    // Country name
    name: string;
    
    // Country color (RGB values for map display)
    color: string;
    
    // Player ID who controls this country
    playerId: string;
    
    // Money amount
    money: number;
    
    // List of province IDs owned by this country
    ownedProvinceIds: string[];
    
    // List of army IDs belonging to this country
    armyIds: string[];
    
    // Diplomatic relations with other countries
    diplomaticRelations: Map<string, DiplomaticRelation>;
    
    // Researched technologies
    researchedTechnologies: string[];
    
    // Current research project
    currentResearch: string | null;
    
    // Turns remaining on current research
    researchTurnsRemaining: number;
    
    constructor(id: string, name: string, color: string, playerId: string, startingMoney: number = 1000) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.playerId = playerId;
        this.money = startingMoney;
        this.ownedProvinceIds = [];
        this.armyIds = [];
        this.diplomaticRelations = new Map<string, DiplomaticRelation>();
        this.researchedTechnologies = [];
        this.currentResearch = null;
        this.researchTurnsRemaining = 0;
    }
    
    // Calculate total income from all provinces
    calculateTotalIncome(allProvinces: Map<string, Province>): number {
        let totalIncome = 0;
        
        for (const provinceId of this.ownedProvinceIds) {
            const province = allProvinces.get(provinceId);
            if (province) {
                totalIncome += province.income;
                
                // Add income from buildings
                for (const building of province.buildings) {
                    totalIncome += building.income;
                }
            }
        }
        
        return totalIncome;
    }
    
    // Calculate total expenses from armies and buildings
    calculateTotalExpenses(allArmies: Map<string, Army>): number {
        let totalExpenses = 0;
        
        for (const armyId of this.armyIds) {
            const army = allArmies.get(armyId);
            if (army) {
                totalExpenses += army.maintenanceCost;
            }
        }
        
        return totalExpenses;
    }
}

// Diplomatic relation enum
export enum DiplomaticRelation {
    Neutral,
    Allied,
    DefensiveAlliance,
    AtWar,
    Truce
}

// Import related models
import { Province } from './Province';
import { Army } from './Army';