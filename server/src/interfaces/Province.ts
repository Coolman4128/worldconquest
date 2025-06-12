export interface Province { // Add Province type definition locally
  Id: string;
  AdjacentProvinceIds: string[];
  [key: string]: any; // Allow other properties
}