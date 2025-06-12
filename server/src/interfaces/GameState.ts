import { Country } from './Country';
import { Army } from './Army'; // Import the Army interface

export interface GameState {
  GameId: string;
  Players: string[];
  Countries: Country[];
  PlayerCountries: Record<string, string>;
  Armies: Army[]; // Add Armies collection
  [key: string]: any; // Allow other properties
}