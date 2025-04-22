export interface Player {
  // Unique player Id
  id: string;

  // Player display name
  name: string;

  // Country Id controlled by this player (null if not assigned)
  countryId: string | null;

  // Is the player currently connected
  isConnected: boolean;
}