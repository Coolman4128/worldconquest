import { Unit } from './Unit';

export interface Army {
  id: string; // Unique identifier
  country_id: string; // ID of the owning country
  general_name: string; // Name of the general
  province_id: string; // ID of the current province
  units: Unit[]; // Array of units in the army
  moves_remaining: number; // Movement points left
}