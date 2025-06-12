import type { GameState } from '../interfaces/GameState';
import type { Lobby } from '../interfaces/Lobby';

export const games = new Map<string, GameState>();
export const lobbies = new Map<string, Lobby>();
export const playerLobbyMap = new Map<string, string>();
