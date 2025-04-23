import React, { useEffect, useState } from 'react';
import { useLobby } from '../contexts/LobbyContext';
import { useGame } from '../contexts/GameContext';
import styled from '@emotion/styled';
import { Country } from '../types/game';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #2c3e50;
  color: white;
  padding: 20px;
`;

const Header = styled.header`
  margin-bottom: 20px;
  text-align: center;
  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const LeftPanel = styled.div`
  flex: 1;
  background: #34495e;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const RightPanel = styled.div`
  flex: 1;
  background: #34495e;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const Button = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 10px;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    background: #95a5a6;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  background: #2c3e50;
  border: none;
  padding: 12px;
  color: white;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 1rem;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3498db;
  }
`;

const Select = styled.select`
  background: #2c3e50;
  border: none;
  padding: 12px;
  color: white;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 1rem;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3498db;
  }
`;

const LobbyList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 15px;
`;

const LobbyItem = styled.div`
  background: #2c3e50;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #3c536a;
  }

  h3 {
    margin-bottom: 5px;
  }

  p {
    color: #bdc3c7;
    font-size: 0.9rem;
  }
`;

const PlayerList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 15px;
`;

const PlayerItem = styled.div`
  background: #2c3e50;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;

  p {
    color: #bdc3c7;
    font-size: 0.9rem;
  }
`;

const CountrySelection = styled.div`
  margin-top: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
`;

const ErrorMessage = styled.div`
  background-color: #e74c3c;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-weight: bold;
`;

interface LobbyInterfaceProps {
  onJoinGame: () => void;
}

export const LobbyInterface: React.FC<LobbyInterfaceProps> = ({ onJoinGame }) => {
  const {
    lobbies,
    currentLobby,
    playerName,
    isConnected,
    error,
    gameStarted,
    connect,
    setPlayerName,
    createLobby,
    joinLobby,
    leaveLobby,
    startGame,
    refreshLobbies,
    selectCountry
  } = useLobby();
  
  // Get gameReady from GameContext
  const { gameReady } = useGame();
  
  const [nameInput, setNameInput] = useState('');
  const [lobbyNameInput, setLobbyNameInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
    
    const interval = setInterval(() => {
      if (isConnected) {
        refreshLobbies();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [connect, isConnected, refreshLobbies]);
  
  // Effect to handle game start for all players
  useEffect(() => {
    console.log('Checking if game has started:', gameStarted);
    console.log('Game ready status:', gameReady);
    
    if (gameStarted && gameReady) {
      console.log('Game has started with ID:', gameStarted, 'and is ready to display');
      console.log('Transitioning to game interface automatically');
      // The server has already added all players to the game and the game state is loaded
      // We can now transition to the game interface
      console.log('Calling onJoinGame to transition to game interface');
      onJoinGame();
    } else if (gameStarted && !gameReady) {
      console.log('Game has started but is not ready yet. Waiting for game state...');
    }
  }, [gameStarted, gameReady, onJoinGame]);
  
  const handleSetName = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
    }
  };
  
  const handleCreateLobby = () => {
    if (lobbyNameInput.trim()) {
      createLobby(lobbyNameInput.trim());
    }
  };
  
  const handleJoinLobby = (lobbyId: string) => {
    joinLobby(lobbyId);
  };
  
  const handleStartGame = () => {
    console.log('handleStartGame called');
    if (currentLobby && selectedCountry) {
      console.log('Host starting game with country:', selectedCountry);
      
      // Just tell the server to start the game
      // The server will handle creating the game and adding all players
      console.log('Calling startGame() to tell server to start the game');
      startGame();
      
      // The transition to game interface will happen automatically
      // through the useEffect that watches for currentLobby.inProgress
      console.log('Waiting for server to update lobby.inProgress');
    } else {
      console.log('Cannot start game:',
        !currentLobby ? 'No current lobby' : 'No country selected');
    }
  };
  
  // Get available countries (not selected by other players)
  const getAvailableCountries = (): Country[] => {
    if (!currentLobby || !currentLobby.availableCountries) return [];
    
    const selectedCountries = new Set<string>();
    currentLobby.players.forEach(player => {
      if (player.selectedCountry) {
        selectedCountries.add(player.selectedCountry);
      }
    });
    
    return currentLobby.availableCountries.filter(country => !selectedCountries.has(country.Id));
  };
  
  if (!playerName) {
    return (
      <Container>
        <Header>
          <h1>World Conquest</h1>
          <p>Enter your name to continue</p>
        </Header>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Content>
          <LeftPanel style={{ maxWidth: '400px', margin: '0 auto' }}>
            <FormGroup>
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
              />
            </FormGroup>
            <Button onClick={handleSetName} disabled={!nameInput.trim()}>
              Continue
            </Button>
          </LeftPanel>
        </Content>
      </Container>
    );
  }
  
  if (!currentLobby) {
    return (
      <Container>
        <Header>
          <h1>World Conquest</h1>
          <p>Welcome, {playerName}!</p>
        </Header>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Content>
          <LeftPanel>
            <h2>Available Lobbies</h2>
            <Button onClick={refreshLobbies}>Refresh Lobbies</Button>
            <LobbyList>
              {lobbies.length > 0 ? (
                lobbies.map(lobby => (
                  <LobbyItem key={lobby.id} onClick={() => handleJoinLobby(lobby.id)}>
                    <h3>{lobby.name}</h3>
                    <p>Players: {lobby.players.length}/{lobby.maxPlayers}</p>
                    <p>Status: {lobby.inProgress ? 'In Progress' : 'Waiting'}</p>
                  </LobbyItem>
                ))
              ) : (
                <p>No lobbies available. Create one!</p>
              )}
            </LobbyList>
          </LeftPanel>
          <RightPanel>
            <h2>Create New Lobby</h2>
            <FormGroup>
              <Label htmlFor="lobbyName">Lobby Name</Label>
              <Input
                id="lobbyName"
                type="text"
                value={lobbyNameInput}
                onChange={(e) => setLobbyNameInput(e.target.value)}
                placeholder="Enter lobby name"
              />
            </FormGroup>
            <Button onClick={handleCreateLobby} disabled={!lobbyNameInput.trim()}>
              Create Lobby
            </Button>
          </RightPanel>
        </Content>
      </Container>
    );
  }
  
  // Add debugging to help identify player name issues
  console.log('Current player name:', playerName);
  console.log('First player name:', currentLobby.players[0].name);
  console.log('Players in lobby:', currentLobby.players);
  console.log('Is creator?', playerName === currentLobby.players[0].name);
  
  // Add debugging for country selection
  console.log('All players have selected country?', currentLobby.players.every(p => p.selectedCountry !== null));
  currentLobby.players.forEach((p, index) => {
    console.log(`Player ${index}: ${p.name}, Country: ${p.selectedCountry}`);
  });

  return (
    <Container>
      <Header>
        <h1>Lobby: {currentLobby.name}</h1>
        <p>Waiting for players...</p>
      </Header>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Content>
        <LeftPanel>
          <h2>Players</h2>
          <PlayerList>
            {currentLobby.players.map(player => (
              <PlayerItem key={player.id}>
                <h3>{player.name} {player.name === playerName ? '(You)' : ''}</h3>
                {player.selectedCountry && currentLobby.availableCountries && (
                  <p>Country: {currentLobby.availableCountries.find((c: Country) => c.Id === player.selectedCountry)?.Name || 'Unknown'}</p>
                )}
              </PlayerItem>
            ))}
          </PlayerList>
          <Button onClick={leaveLobby}>Leave Lobby</Button>
        </LeftPanel>
        <RightPanel>
          <h2>Game Settings</h2>
          <CountrySelection>
            <FormGroup>
              <Label htmlFor="countrySelect">Select Your Country</Label>
              <Select
                id="countrySelect"
                value={selectedCountry}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  console.log('Selected country:', newCountry);
                  setSelectedCountry(newCountry);
                  
                  // Find the player in the lobby
                  const player = currentLobby.players.find(p => p.name === playerName);
                  if (player) {
                    console.log(`Updating player ${player.name} country to: ${newCountry}`);
                    // Use the selectCountry function from LobbyContext
                    selectCountry(newCountry);
                  }
                }}
              >
                <option value="">-- Select a Country --</option>
                {currentLobby && currentLobby.availableCountries ? (
                  getAvailableCountries().map(country => (
                    <option key={country.Id} value={country.Id}>
                      {country.Name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading countries...</option>
                )}
              </Select>
            </FormGroup>
            {/* Only show start game button to the lobby creator (first player) */}
            {currentLobby.players.length > 0 &&
              // Check if the current player is the first player in the lobby
              playerName === currentLobby.players[0].name ? (
              <>
                <Button
                  onClick={handleStartGame}
                  disabled={!selectedCountry || currentLobby.players.length < 2}
                >
                  Start Game
                </Button>
                {currentLobby.players.length < 2 && (
                  <p style={{ marginTop: '10px', color: '#e74c3c' }}>
                    Need at least 2 players to start
                  </p>
                )}
                {!selectedCountry && (
                  <p style={{ marginTop: '10px', color: '#e74c3c' }}>
                    You must select a country
                  </p>
                )}
              </>
            ) : (
              <p style={{ marginTop: '10px', color: '#e74c3c' }}>
                Waiting for lobby creator to start the game...
              </p>
            )}
          </CountrySelection>
        </RightPanel>
      </Content>
    </Container>
  );
};