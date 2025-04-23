import { Global, css } from '@emotion/react';
import { useState } from 'react';
import { GameProvider } from './contexts/GameContext';
import { LobbyProvider } from './contexts/LobbyContext';
import { ProvinceSelectionProvider } from './contexts/ProvinceSelectionContext';
import { GameInterface } from './components/GameInterface';
import { LobbyInterface } from './components/LobbyInterface';

const globalStyles = css`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #2c3e50;
    color: white;
  }

  /* Prevent text selection during map drag */
  canvas {
    user-select: none;
    -webkit-user-select: none;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #2c3e50;
  }

  ::-webkit-scrollbar-thumb {
    background: #3498db;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #2980b9;
  }
`;

function App() {
  const [inGame, setInGame] = useState(false);

  // Create a function to be passed down to components to update the game state
  const setGameActive = (active: boolean) => {
    setInGame(active);
  };

  return (
    <LobbyProvider>
      <GameProvider>
        <ProvinceSelectionProvider>
          <Global styles={globalStyles} />
          {inGame ? (
            <GameInterface onLeaveGame={() => setGameActive(false)} />
          ) : (
            <LobbyInterface onJoinGame={() => setGameActive(true)} />
          )}
        </ProvinceSelectionProvider>
      </GameProvider>
    </LobbyProvider>
  );
}

export default App;
