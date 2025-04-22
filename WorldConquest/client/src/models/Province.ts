export enum ProvinceLevel {
  Countryside = "Countryside",
  Village = "Village",
  Town = "Town",
  City = "City"
}

export enum ProvinceType {
  Land = "Land",
  Water = "Water",
  Wasteland = "Wasteland"
}

export interface Province {
  // Province Id in the form "R_G_B"
  id: string;

  // Country Id or null if unowned
  ownerId: string | null;

  // List of Army Ids or Unit Ids present in the province
  troopIds: string[];

  // List of Building Ids present in the province
  buildingIds: string[];

  // Province level (countryside, village, town, city, etc)
  level: ProvinceLevel;

  // Religion of the province
  religion: string;

  // Province type: Land, Water, or Wasteland
  type: ProvinceType;

  // Unrest value (0 = no unrest, higher = more unrest)
  unrest: number;

  // Whether the province can be upgraded (inferred from level/money in logic)
  upgradable: boolean;
}