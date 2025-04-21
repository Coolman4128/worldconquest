// Building Model

/**
 * Represents a building in a province
 */
export class Building {
    // Building ID
    id: string;
    
    // Building name
    name: string;
    
    // Building type
    type: BuildingType;
    
    // Building level (for upgradable buildings)
    level: number;
    
    // Construction cost
    cost: number;
    
    // Maintenance cost per turn
    maintenance: number;
    
    // Income generated per turn
    income: number;
    
    // Effects provided by the building
    effects: BuildingEffects;
    
    constructor(id: string, name: string, type: BuildingType, cost: number, maintenance: number = 0, income: number = 0) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.level = 1;
        this.cost = cost;
        this.maintenance = maintenance;
        this.income = income;
        this.effects = new BuildingEffects();
    }
}

// Building type enum
export enum BuildingType {
    Economic,
    Military,
    Administrative,
    Religious,
    Special
}

// Building effects class
export class BuildingEffects {
    // Economic effects
    taxModifier: number = 0;
    productionModifier: number = 0;
    
    // Military effects
    garrisonBonus: number = 0;
    recruitmentBonus: number = 0;
    
    // Administrative effects
    unrestReduction: number = 0;
}