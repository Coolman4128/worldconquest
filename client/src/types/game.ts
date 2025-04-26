export interface Province {
  Id: string;
  OwnerId: string | null;
  TroopIds: string[];
  BuildingIds: string[];
  Level: 'Countryside' | 'Village' | 'Town' | 'City';
  Religion: string;
  Type: 'Land' | 'Water';
  Unrest: number;
  Upgradable: boolean;
}

export interface Country {
  Id: string;
  Name: string;
  Color: string;
  Money: number;
  PlayerId: string | null;
  Stability: number;
  Population: number;
}

export interface Army {
  Id: string;
  OwnerId: string;
  ProvinceId: string;
  Units: Unit[];
  MovesRemaining: number;
}

export interface Unit {
  Id: string;
  Type: string;
  Count: number;
}

export interface GameState {
  GameId: string;
  Players: string[];
  Countries: Country[];
  Provinces: Province[];
  DiplomaticRelations: DiplomaticRelation[];
  CurrentDate: string;
  CurrentTurnPlayerId: string;
  Armies: Army[];
  PlayerCountries: Record<string, string>; // Maps playerId to countryId
}

export interface Lobby {
  id: string;
  name: string;
  players: LobbyPlayer[];
  maxPlayers: number;
  inProgress: boolean;
  createdAt: string;
  availableCountries: Country[];
}

export interface LobbyPlayer {
  id: string;
  name: string;
  selectedCountry: string | null;
}

export interface DiplomaticRelation {
  Country1Id: string;
  Country2Id: string;
  Type: 'Neutral' | 'Allied' | 'DefensivePact' | 'AtWar';
  TruceUntil?: string;
}

export interface MapPosition {
  x: number;
  y: number;
  scale: number;
  targetX: number;
  targetY: number;
  targetScale: number;
}

export interface GameContextType {
  gameState: GameState | null;
  playerId: string | null;
  playerName: string | null;
  mapPosition: MapPosition;
  gameReady: boolean; // Add gameReady property
  connect: () => void;
  createGame: (lobbyId: string) => void;
  joinGame: (gameId: string, countryId: string) => void;
  updateMapPosition: (position: Partial<MapPosition>) => void;
  selectCountry: (countryId: string) => void;
  leaveGame: () => void;
  endTurn: () => void; // Add endTurn function type
}

export interface LobbyContextType {
  lobbies: Lobby[];
  currentLobby: Lobby | null;
  playerName: string | null;
  isConnected: boolean;
  error: string | null;
  gameStarted: string | null; // ID of the game that was started
  socket: any; // Socket instance shared with GameContext
  connect: () => void;
  setPlayerName: (name: string) => void;
  createLobby: (name: string) => void;
  joinLobby: (lobbyId: string) => void;
  leaveLobby: () => void;
  startGame: () => void;
  refreshLobbies: () => void;
  selectCountry: (countryId: string) => void;
}