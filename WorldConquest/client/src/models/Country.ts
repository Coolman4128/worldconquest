export interface Country {
  // Unique country Id
  id: string;

  // Display name of the country
  name: string;

  // Color used for provinces (e.g., "R_G_B" or hex)
  color: string;

  // Money owned by the country
  money: number;

  // Player Id controlling this country (null if AI or unassigned)
  playerId: string | null;

  // Additional metrics (expand as needed)
  stability: number;
  population: number;
}