import { Player } from "./Player";
import { Country } from "./Country";
import { Province } from "./Province";
import { DiplomaticRelation } from "./DiplomaticRelation";
import { Army } from "./Army";

export interface GameState {
  gameId: string;
  players: Player[];
  countries: Country[];
  provinces: Province[];
  diplomaticRelations: DiplomaticRelation[];
  currentDate: string; // ISO date string
  currentTurnPlayerId: string;
  armies: Army[];
}