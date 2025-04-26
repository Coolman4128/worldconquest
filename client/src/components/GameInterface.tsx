import React, { useMemo } from 'react'; // Import useMemo
import { useGame } from '../contexts/GameContext';
import { useProvinceSelection } from '../contexts/ProvinceSelectionContext';
import { useLobby } from '../contexts/LobbyContext';
import { GameMap } from './GameMap';
import styled from '@emotion/styled';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const Header = styled.header`
  height: 60px;
  background: #2c3e50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const MainContent = styled.main`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

interface SidePanelProps {
  side: 'left' | 'right';
}

const SidePanel = styled.div<SidePanelProps>`
  width: 500px; /* Increased width further */
  flex-shrink: 0; /* Prevent shrinking below the specified width */
  background: #34495e;
  color: white;
  padding: 20px;
  overflow-y: auto;
  box-shadow: ${({ side }) => side === 'left' ? '2px' : '-2px'} 0 4px rgba(0,0,0,0.2);
`;

const MapContainer = styled.div`
  flex: 1;
  position: relative;
  background: #2c3e50;
`;

const ChatContainer = styled.div`
  height: 200px;
  background: #34495e;
  color: white;
  padding: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
`;

const ChatInput = styled.input`
  background: #2c3e50;
  border: none;
  padding: 10px;
  color: white;
  border-radius: 4px;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3498db;
  }
`;

const Button = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin: 0 5px;

  &:hover {
    background: #2980b9;
  }
`;

const ProvinceInfo = styled.div`
  margin-top: 15px; /* Add some space above */
  h4 {
    margin-bottom: 10px; /* Space below header */
  }
  p {
    font-size: 1.1em; /* Increase font size */
    line-height: 1.6; /* Increase line spacing */
    margin-bottom: 5px; /* Space between lines */
  }
`;

interface GameInterfaceProps {
  onLeaveGame: () => void;
}

export const GameInterface: React.FC<GameInterfaceProps> = ({ onLeaveGame }) => {
  const { gameState, playerName, leaveGame, endTurn } = useGame(); // Removed unused playerId
  const { selectedProvince } = useProvinceSelection();
  const { currentLobby } = useLobby();

  const handleLeaveGame = () => {
    leaveGame();
    onLeaveGame();
  };

  const handleEndTurn = () => {
    if (endTurn) { // Check if endTurn is available from context
      endTurn();
    } else {
      console.error("endTurn function not available in GameContext");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  // Memoize map data to prevent unnecessary GameMap re-renders
  const provinces = useMemo(() => gameState?.Provinces || [], [gameState?.Provinces]);
  const countries = useMemo(() => gameState?.Countries || [], [gameState?.Countries]);

  return (
    <Container>
      <Header>
        <div>
          {gameState ? (
            <>
              <span>Date: {formatDate(gameState.CurrentDate)}</span>
              <span style={{ margin: '0 20px' }}>
                Turn: {(() => {
                  const currentTurnPlayer = currentLobby?.players.find(p => p.id === gameState.CurrentTurnPlayerId);
                  if (currentTurnPlayer && currentTurnPlayer.name === playerName) {
                    return <strong style={{ fontWeight: 'bold' }}>Your Turn</strong>;
                  }
                  return `${currentTurnPlayer?.name || 'Unknown Player'}'s Turn`;
                })()}
              </span>
              <span>Lobby: {currentLobby?.name || 'Unknown'}</span>
            </>
          ) : (
            <span>Loading game...</span>
          )}
        </div>
        <div>
          {gameState && currentLobby?.players.find(p => p.id === gameState.CurrentTurnPlayerId)?.name === playerName && (
            <Button style={{ marginRight: '10px' }} onClick={handleEndTurn}>End Turn</Button>
          )}
          <Button onClick={handleLeaveGame}>Leave Game</Button>
        </div>
      </Header>

      <MainContent>
        <SidePanel side="left">
          <h3>Game Info</h3>
          {selectedProvince && (
            <ProvinceInfo> {/* Use the styled component */}
              <h4>Selected Province</h4>
              <p><strong>ID:</strong> {selectedProvince.Id}</p>
              <p>Owner: {
                selectedProvince.OwnerId
                  ? (() => {
                      // Get the owner country
                      const ownerCountry = gameState?.Countries.find(c => c.Id === selectedProvince.OwnerId);
                      if (!ownerCountry) return 'Unknown';
                      
                      // Find which player owns this country (if any)
                      let ownerPlayerId = null;
                      let ownerName = 'N/A';
                      
                      // Loop through PlayerCountries to find who owns this country
                      if (gameState?.PlayerCountries) {
                        for (const [pid, cid] of Object.entries(gameState.PlayerCountries)) {
                          if (cid === ownerCountry.Id) {
                            ownerPlayerId = pid;
                            break;
                          }
                        }
                      }
                      
                      // If no player owns this country, return N/A
                      if (!ownerPlayerId) return 'N/A';
                      
                      // Find the player name
                      const ownerPlayer = currentLobby?.players.find(p => p.id === ownerPlayerId);
                      ownerName = ownerPlayer?.name || 'Unknown Player';
                      
                      // Check if it's the current player's country by comparing names instead of IDs
                      // This is more reliable since socket IDs might change but names are consistent
                      if (ownerPlayer && ownerPlayer.name === playerName) {
                        return `${ownerName} (You)`;
                      }
                      
                      return ownerName;
                    })()
                  : 'N/A'
              }</p>
              <p>Level: {selectedProvince.Level}</p>
              <p>Religion: {selectedProvince.Religion}</p>
              <p>Type: {selectedProvince.Type}</p>
              <p>Unrest: {selectedProvince.Unrest}</p>
            </ProvinceInfo>
          )}
        </SidePanel>

        <MapContainer>
          {gameState ? (
            <GameMap
              provinces={provinces} // Use memoized version
              countries={countries} // Use memoized version
            />
          ) : (
            <div>Loading Map...</div> // Or some other placeholder
          )}
        </MapContainer>

        <SidePanel side="right">
          <h3>Actions</h3>
          {selectedProvince && selectedProvince.Upgradable && (
            <Button>Upgrade Province</Button>
          )}
        </SidePanel>
      </MainContent>

      <ChatContainer>
        <ChatMessages>
          {/* Chat messages will go here */}
        </ChatMessages>
        <ChatInput
          type="text"
          placeholder="Type a message... (Use /ally for ally chat)"
        />
      </ChatContainer>
    </Container>
  );
};