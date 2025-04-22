export enum ArmyStatus {
  Active = "Active",
  Retreating = "Retreating",
  Destroyed = "Destroyed"
}

export interface Army {
  // Unique army Id
  id: string;

  // Name of the army (optional)
  name: string;

  // Country Id that owns this army
  countryId: string;

  // Province Id where the army is currently located
  provinceId: string;

  // List of troop/unit Ids in the army
  troopIds: string[];

  // Number of moves left this turn
  movesLeft: number;

  // General Id (optional, null if no general)
  generalId: string | null;

  // Is this army a province garrison
  isGarrison: boolean;

  // Status of the army
  status: ArmyStatus;
}