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
  mapPosition: MapPosition;
  connect: () => void;
  createGame: () => void;
  joinGame: (gameId: string) => void;
  updateMapPosition: (position: Partial<MapPosition>) => void;
}