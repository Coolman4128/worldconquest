import { LobbyPlayer } from "./LobbyPlayer";
import { Country } from "./Country";

export interface Lobby {
  id: string;
  name: string;
  players: LobbyPlayer[];
  maxPlayers: number;
  inProgress: boolean;
  createdAt: string;
  availableCountries: Country[]; // Add countries to the lobby
}