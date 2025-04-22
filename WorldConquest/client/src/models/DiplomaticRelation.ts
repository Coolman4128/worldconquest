export enum DiplomaticStatus {
  Neutral = "Neutral",
  AtWar = "AtWar",
  Allies = "Allies",
  DefensiveAlliance = "DefensiveAlliance",
  Truce = "Truce"
}

export interface DiplomaticRelation {
  // Unique Id for the relation (could be composite of both country ids)
  id: string;

  // First country in the relation
  countryAId: string;

  // Second country in the relation
  countryBId: string;

  // Current status of the relation
  status: DiplomaticStatus;

  // If there is a truce, when does it end (null if not in truce)
  truceEndDate: string | null; // ISO date string or null
}