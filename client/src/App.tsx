import { Global, css } from '@emotion/react';
import { GameProvider } from './contexts/GameContext';
import { ProvinceSelectionProvider } from './contexts/ProvinceSelectionContext';
import { GameInterface } from './components/GameInterface';

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
  return (
    <GameProvider>
      <ProvinceSelectionProvider>
        <Global styles={globalStyles} />
        <GameInterface />
      </ProvinceSelectionProvider>
    </GameProvider>
  );
}

export default App;
