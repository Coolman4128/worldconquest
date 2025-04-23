import React, { useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useProvinceSelection } from '../contexts/ProvinceSelectionContext';
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

export const GameInterface: React.FC = () => {
  const { gameState, playerId, connect, createGame } = useGame();
  const { selectedProvince } = useProvinceSelection();

  useEffect(() => {
    connect();
  }, [connect]);

  const handleCreateGame = () => {
    createGame();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
    <Container>
      <Header>
        <div>
          {gameState ? (
            <>
              <span>Date: {formatDate(gameState.CurrentDate)}</span>
              <span style={{ margin: '0 20px' }}>
                Turn: {gameState.CurrentTurnPlayerId === playerId ? 'Your Turn' : 'Waiting'}
              </span>
            </>
          ) : (
            <Button onClick={handleCreateGame}>Create New Game</Button>
          )}
        </div>
        {gameState?.CurrentTurnPlayerId === playerId && (
          <Button>End Turn</Button>
        )}
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
                  ? gameState?.Countries.find(c => c.Id === selectedProvince.OwnerId)?.Name ?? 'Unknown'
                  : 'Unowned'
              }</p>
              <p>Level: {selectedProvince.Level}</p>
              <p>Religion: {selectedProvince.Religion}</p>
              <p>Type: {selectedProvince.Type}</p>
              <p>Unrest: {selectedProvince.Unrest}</p>
            </ProvinceInfo>
          )}
        </SidePanel>

        <MapContainer>
          <GameMap />
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