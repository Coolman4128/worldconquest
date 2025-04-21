/**
 * Main game logic for the World Conquest game
 */

document.addEventListener('DOMContentLoaded', () => {
    // Get the canvas and its context
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Get the province details element
    const provinceDetails = document.getElementById('provinceDetails');
    
    // Get the control buttons
    const zoomInButton = document.getElementById('zoomIn');
    const zoomOutButton = document.getElementById('zoomOut');
    const resetViewButton = document.getElementById('resetView');
    const toggleHighResButton = document.getElementById('toggleHighRes');
    
    // Get the game info elements
    const yearDisplay = document.getElementById('yearDisplay');
    const currentTurnDisplay = document.getElementById('currentTurn');
    
    // Get the game action buttons
    const advanceTurnBtn = document.getElementById('advanceTurnBtn');
    const advanceYearBtn = document.getElementById('advanceYearBtn');
    const downloadStateBtn = document.getElementById('downloadStateBtn');
    const lobbyBtn = document.getElementById('lobbyBtn');
    
    // Get the lobby modal elements
    const lobbyModal = document.getElementById('lobbyModal');
    const playerNameInput = document.getElementById('playerName');
    const lobbyIdInput = document.getElementById('lobbyId');
    const countrySelect = document.getElementById('countrySelect');
    const countryDescription = document.getElementById('countryDescription');
    const joinLobbyBtn = document.getElementById('joinLobbyBtn');
    const createLobbyBtn = document.getElementById('createLobbyBtn');
    const refreshLobbiesBtn = document.getElementById('refreshLobbiesBtn');
    const lobbiesList = document.getElementById('lobbiesList');
    
    // Create a new map processor
    const mapProcessor = new MapProcessor();
    
    // Game state
    const state = {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
        selectedProvince: null,
        // Animation state
        needsRender: true,
        animationFrameId: null,
        // Performance monitoring
        lastFrameTime: 0,
        frameCount: 0,
        fps: 0,
        fpsUpdateInterval: 500, // Update FPS every 500ms
        lastFpsUpdate: 0,
        // Multiplayer state
        currentLobby: null,
        currentPlayer: null,
        isMultiplayer: false,
        year: 1100,
        currentTurn: '',
        // Country selection
        availableCountries: [],
        // Rendering settings
        useHighRes: false,         // Whether to use high-res rendering
        showCountryLabels: true    // Whether to show country labels
    };
    
    // Initialize the game
    async function init() {
        try {
            // Set canvas size to match container
            resizeCanvas();
            
            // Display loading message on canvas
            showLoadingMessage("Waiting for game data...");
            
            // Start the render loop (without map initially)
            startRenderLoop();
            
            // Add event listeners
            addEventListeners();
            
            // Initialize the API client
            initializeApiClient();
            
            // Load default game state to get available countries
            await loadDefaultGameState();
            
            // Show the lobby modal
            showLobbyModal();
            
            console.log('Game initialized successfully');
            
            // Add FPS counter to the DOM if it doesn't exist
            if (!document.getElementById('fpsCounter')) {
                const fpsCounter = document.createElement('div');
                fpsCounter.id = 'fpsCounter';
                fpsCounter.style.position = 'absolute';
                fpsCounter.style.top = '10px';
                fpsCounter.style.left = '10px';
                fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                fpsCounter.style.color = 'white';
                fpsCounter.style.padding = '5px';
                fpsCounter.style.borderRadius = '3px';
                fpsCounter.style.fontSize = '12px';
                fpsCounter.style.fontFamily = 'monospace';
                fpsCounter.textContent = 'FPS: 0';
                canvas.parentElement.appendChild(fpsCounter);
            }
        } catch (error) {
            console.error('Failed to initialize game:', error);
            provinceDetails.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    }
    
    // Load default game state to get available countries
    async function loadDefaultGameState() {
        try {
            const defaultGameState = await apiClient.getDefaultGameState();
            
            // Store available countries
            state.availableCountries = defaultGameState.countries || [];
            
            // Update country selection dropdown
            updateCountryDropdown();
        } catch (error) {
            console.error('Failed to load default game state:', error);
            countrySelect.innerHTML = '<option value="">Failed to load countries</option>';
        }
    }
    
    // Update country selection dropdown with available countries
    function updateCountryDropdown() {
        // Clear existing options
        countrySelect.innerHTML = '';
        
        if (state.availableCountries.length === 0) {
            countrySelect.innerHTML = '<option value="">No countries available</option>';
            return;
        }
        
        // Add default option
        countrySelect.innerHTML = '<option value="">Select a country</option>';
        
        // Add countries
        state.availableCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.id;
            option.textContent = country.name;
            option.style.color = country.color;
            countrySelect.appendChild(option);
        });
        
        // Add change event listener
        countrySelect.addEventListener('change', handleCountrySelectChange);
    }
    
    // Handle country selection change
    function handleCountrySelectChange() {
        const selectedCountryId = countrySelect.value;
        
        if (!selectedCountryId) {
            countryDescription.textContent = '';
            return;
        }
        
        // Find the selected country
        const selectedCountry = state.availableCountries.find(c => c.id === selectedCountryId);
        
        if (selectedCountry) {
            // Update the description
            countryDescription.textContent = selectedCountry.description || '';
            countryDescription.style.color = selectedCountry.color;
        } else {
            countryDescription.textContent = '';
        }
    }
    
    // Initialize the API client
    function initializeApiClient() {
        // Set up callbacks for the API client
        apiClient.setCallbacks({
            onPlayerJoined: handlePlayerJoined,
            onPlayerLeft: handlePlayerLeft,
            onLobbyJoined: handleLobbyJoined,
            onGameStateUpdated: handleGameStateUpdated,
            onError: handleApiError
        });
    }
    
    // Resize the canvas to match its container
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    // Reset the view to center the map
    function resetView() {
        // Calculate scale to fit the map in the canvas
        const scaleX = canvas.width / mapProcessor.width;
        const scaleY = canvas.height / mapProcessor.height;
        state.scale = Math.min(scaleX, scaleY) * 0.9; // 90% of the fit scale for some padding
        
        // Center the map
        state.offsetX = (canvas.width - mapProcessor.width * state.scale) / 2;
        state.offsetY = (canvas.height - mapProcessor.height * state.scale) / 2;
        
        // Clear selection
        state.selectedProvince = null;
        updateProvinceDetails();
        
        // Redraw the map
        drawMap();
    }
    
    // Start the render loop
    function startRenderLoop() {
        // Cancel any existing animation frame
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
        }
        
        // Start the render loop
        state.lastFrameTime = performance.now();
        state.lastFpsUpdate = state.lastFrameTime;
        state.frameCount = 0;
        
        function renderLoop(timestamp) {
            // Calculate FPS
            state.frameCount++;
            const elapsed = timestamp - state.lastFpsUpdate;
            
            if (elapsed >= state.fpsUpdateInterval) {
                state.fps = Math.round((state.frameCount * 1000) / elapsed);
                state.lastFpsUpdate = timestamp;
                state.frameCount = 0;
                
                // Update FPS counter
                const fpsCounter = document.getElementById('fpsCounter');
                if (fpsCounter) {
                    fpsCounter.textContent = `FPS: ${state.fps}`;
                }
            }
            
            // Only render if needed
            if (state.needsRender) {
                drawMap();
                state.needsRender = false;
            }
            
            // Continue the render loop
            state.animationFrameId = requestAnimationFrame(renderLoop);
        }
        
        // Start the render loop
        state.animationFrameId = requestAnimationFrame(renderLoop);
    }
    
    // Show a loading message on the canvas
    function showLoadingMessage(message) {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the loading message
        ctx.save();
        ctx.font = '24px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
    
    // Draw the map
    function drawMap() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // If map is not loaded yet, show loading message
        if (!mapProcessor.mapRendered) {
            showLoadingMessage("Loading map...");
            return;
        }
        
        // Get countries data for labels
        const countries = state.isMultiplayer && state.currentLobby ? 
            state.currentLobby.gameState.countries : 
            state.availableCountries;
        
        // Draw the map with country data for labels
        mapProcessor.drawMap(ctx, state.scale, state.offsetX, state.offsetY, countries, state.useHighRes);
        
        // Draw a border around the selected province if any
        if (state.selectedProvince) {
            drawSelectedProvinceBorder();
        }
    }
    
    // Draw a border around the selected province
    function drawSelectedProvinceBorder() {
        const province = state.selectedProvince;
        if (!province) return;
        
        const { minX, minY, maxX, maxY } = province.bounds;
        
        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(
            minX * state.scale + state.offsetX,
            minY * state.scale + state.offsetY,
            (maxX - minX + 1) * state.scale,
            (maxY - minY + 1) * state.scale
        );
        ctx.stroke();
        ctx.restore();
    }
    
    // Update the province details panel
    function updateProvinceDetails() {
        // Get countries from state for color lookup
        const countries = state.isMultiplayer && state.currentLobby ? 
            state.currentLobby.gameState.countries : 
            state.availableCountries;
            
        provinceDetails.innerHTML = formatProvinceDetails(state.selectedProvince, countries);
    }
    
    // Add event listeners
    function addEventListeners() {
        // Mouse events for dragging
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        
        // Mouse wheel for zooming
        canvas.addEventListener('wheel', handleWheel);
        
        // Click event for selecting provinces
        canvas.addEventListener('click', handleClick);
        
        // Control buttons
        zoomInButton.addEventListener('click', handleZoomIn);
        zoomOutButton.addEventListener('click', handleZoomOut);
        resetViewButton.addEventListener('click', resetView);
        toggleHighResButton.addEventListener('click', handleToggleHighRes);
        
        // Game action buttons
        advanceTurnBtn.addEventListener('click', handleAdvanceTurn);
        advanceYearBtn.addEventListener('click', handleAdvanceYear);
        downloadStateBtn.addEventListener('click', handleDownloadState);
        lobbyBtn.addEventListener('click', showLobbyModal);
        
        // Lobby buttons
        joinLobbyBtn.addEventListener('click', handleJoinLobby);
        createLobbyBtn.addEventListener('click', handleCreateLobby);
        refreshLobbiesBtn.addEventListener('click', handleRefreshLobbies);
        
        // Window resize
        window.addEventListener('resize', handleResize);
    }
    
    // Show the lobby modal
    function showLobbyModal() {
        lobbyModal.classList.add('show');
        handleRefreshLobbies();
    }
    
    // Hide the lobby modal
    function hideLobbyModal() {
        lobbyModal.classList.remove('show');
    }
    
    // Handle refresh lobbies button click
    async function handleRefreshLobbies() {
        try {
            lobbiesList.innerHTML = '<p>Loading lobbies...</p>';
            const lobbies = await apiClient.getLobbies();
            
            if (lobbies.length === 0) {
                lobbiesList.innerHTML = '<p>No active lobbies found.</p>';
                return;
            }
            
            lobbiesList.innerHTML = '';
            lobbies.forEach(lobby => {
                const lobbyItem = document.createElement('div');
                lobbyItem.className = 'lobby-item';
                lobbyItem.innerHTML = `
                    <strong>${lobby.name}</strong>
                    <div>Players: ${lobby.playerCount}</div>
                `;
                lobbyItem.addEventListener('click', () => {
                    lobbyIdInput.value = lobby.id;
                });
                lobbiesList.appendChild(lobbyItem);
            });
        } catch (error) {
            console.error('Failed to get lobbies:', error);
            lobbiesList.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    }
    
    // Handle join lobby button click
    async function handleJoinLobby() {
        const playerName = playerNameInput.value.trim();
        const lobbyId = lobbyIdInput.value.trim();
        const selectedCountryId = countrySelect.value;
        
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        
        if (!lobbyId) {
            alert('Please enter a lobby ID or select one from the list');
            return;
        }
        
        if (!selectedCountryId) {
            alert('Please select a country');
            return;
        }
        
        try {
            const success = await apiClient.joinLobby(lobbyId, playerName, selectedCountryId);
            if (success) {
                // The selected country will be assigned to the player by the server
                state.currentPlayer = {
                    name: playerName
                };
                hideLobbyModal();
            } else {
                alert('Failed to join lobby');
            }
        } catch (error) {
            console.error('Failed to join lobby:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Handle create lobby button click
    async function handleCreateLobby() {
        const playerName = playerNameInput.value.trim();
        const selectedCountryId = countrySelect.value;
        
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        
        if (!selectedCountryId) {
            alert('Please select a country');
            return;
        }
        
        try {
            const lobby = await apiClient.createLobby(`${playerName}'s Lobby`);
            lobbyIdInput.value = lobby.id;
            await handleJoinLobby();
        } catch (error) {
            console.error('Failed to create lobby:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Handle advance turn button click
    async function handleAdvanceTurn() {
        if (!state.isMultiplayer || !state.currentLobby) return;
        
        try {
            await apiClient.advanceTurn(state.currentLobby.id);
        } catch (error) {
            console.error('Failed to advance turn:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Handle advance year button click
    async function handleAdvanceYear() {
        if (!state.isMultiplayer || !state.currentLobby) return;
        
        try {
            await apiClient.advanceYear(state.currentLobby.id);
        } catch (error) {
            console.error('Failed to advance year:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Handle download state button click
    function handleDownloadState() {
        if (state.isMultiplayer && state.currentLobby) {
            apiClient.downloadGameState(state.currentLobby.gameState, `worldconquest_${state.year}.json`);
        } else {
            // Create a game state from the current map
            const gameState = {
                provinces: {},
                players: [],
                year: state.year,
                currentTurn: state.currentTurn
            };
            
            // Add provinces
            mapProcessor.provinces.forEach((province, id) => {
                gameState.provinces[id] = {
                    id,
                    originalColor: province.originalColor,
                    owner: province.owner,
                    isWater: province.isWater,
                    bounds: province.bounds
                };
            });
            
            apiClient.downloadGameState(gameState, `worldconquest_${state.year}.json`);
        }
    }
    
    // Handle player joined event
    function handlePlayerJoined(player) {
        console.log('Player joined:', player);
        // Update UI if needed
    }
    
    // Handle player left event
    function handlePlayerLeft(playerId) {
        console.log('Player left:', playerId);
        // Update UI if needed
    }
    
    // Handle lobby joined event
    async function handleLobbyJoined(lobby) {
        console.log('Joined lobby:', lobby);
        state.currentLobby = lobby;
        state.isMultiplayer = true;
        
        try {
            // Show loading message
            showLoadingMessage("Loading game state...");
            
            // Get the game state from the backend
            const gameState = await apiClient.getGameState(lobby.id);
            
            // Update the game state
            state.currentLobby.gameState = gameState;
            state.year = gameState.year;
            state.currentTurn = gameState.currentTurn;
            
            // If map hasn't been loaded yet, load it now
            if (!mapProcessor.imageData) {
                showLoadingMessage("Loading map...");
                await mapProcessor.loadMap('assets/bitmap.png');
                
                // Set initial view to center the map
                resetView();
            }
            
            // Update the map with the provinces from the game state
            updateMapFromGameState(gameState);
            
            console.log(`Loaded game state with ${Object.keys(gameState.provinces).length} provinces`);
            
            // Update UI
            updateGameInfo();
            
            // Redraw the map
            state.needsRender = true;
        } catch (error) {
            console.error('Failed to get game state:', error);
            alert(`Error loading game state: ${error.message}`);
        }
    }
    
    // Handle game state updated event
    function handleGameStateUpdated(gameState) {
        console.log('Game state updated:', gameState);
        
        if (!state.isMultiplayer) return;
        
        // Update the game state
        state.currentLobby.gameState = gameState;
        state.year = gameState.year;
        state.currentTurn = gameState.currentTurn;
        
        // Only update the map if it has been loaded
        if (mapProcessor.imageData) {
            // Update the map
            updateMapFromGameState(gameState);
            
            // Update UI
            updateGameInfo();
            
            // Redraw the map
            state.needsRender = true;
        }
    }
    
    // Handle API error
    function handleApiError(error) {
        console.error('API error:', error);
        alert(`Error: ${error}`);
    }
    
    // Update the map from the game state
    function updateMapFromGameState(gameState) {
        if (!gameState || !gameState.provinces) {
            console.error('Invalid game state:', gameState);
            return;
        }
        
        // Make sure the map is loaded
        if (!mapProcessor.imageData) {
            console.warn('Map not loaded yet, cannot update from game state');
            return;
        }
        
        // Update provinces
        Object.values(gameState.provinces).forEach(province => {
            const existingProvince = mapProcessor.provinces.get(province.id);
            if (existingProvince) {
                // Update province properties from the game state
                existingProvince.owner = province.owner;
                existingProvince.isWater = province.isWater;
            } else {
                console.warn(`Province ${province.id} not found in map processor`);
            }
        });
        
        // Re-render the map with countries for color mapping
        mapProcessor.renderMapToCache(gameState.countries);
    }
    
    // Update game info display
    function updateGameInfo() {
        yearDisplay.textContent = `Year: ${state.year} AD`;
        
        if (state.isMultiplayer && state.currentLobby) {
            const currentPlayer = state.currentLobby.gameState.players.find(p => p.id === state.currentTurn);
            currentTurnDisplay.textContent = `Current Turn: ${currentPlayer ? currentPlayer.name : 'None'}`;
        } else {
            currentTurnDisplay.textContent = 'Current Turn: None';
        }
    }
    
    // Handle mouse down event
    function handleMouseDown(event) {
        state.isDragging = true;
        state.lastMouseX = event.clientX;
        state.lastMouseY = event.clientY;
        canvas.style.cursor = 'grabbing';
    }
    
    // Handle mouse move event
    function handleMouseMove(event) {
        if (state.isDragging) {
            // Calculate the mouse movement
            const deltaX = event.clientX - state.lastMouseX;
            const deltaY = event.clientY - state.lastMouseY;
            
            // Update the last mouse position
            state.lastMouseX = event.clientX;
            state.lastMouseY = event.clientY;
            
            // Update the offset
            state.offsetX += deltaX;
            state.offsetY += deltaY;
            
            // Mark that a render is needed
            state.needsRender = true;
        }
    }
    
    // Handle mouse up event
    function handleMouseUp() {
        state.isDragging = false;
        canvas.style.cursor = 'grab';
    }
    
    // Handle mouse wheel event for zooming
    function handleWheel(event) {
        event.preventDefault();
        
        // Get the mouse position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Calculate the mouse position in the world space
        const worldX = (mouseX - state.offsetX) / state.scale;
        const worldY = (mouseY - state.offsetY) / state.scale;
        
        // Calculate the zoom factor
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        
        // Update the scale
        state.scale *= zoomFactor;
        
        // Limit the scale
        state.scale = Math.max(0.1, Math.min(state.scale, 10));
        
        // Update the offset to zoom towards the mouse position
        state.offsetX = mouseX - worldX * state.scale;
        state.offsetY = mouseY - worldY * state.scale;
        
        // Mark that a render is needed
        state.needsRender = true;
    }
    
    // Handle click event for selecting provinces
    function handleClick(event) {
        // Get the mouse position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Calculate the mouse position in the world space
        const worldX = (mouseX - state.offsetX) / state.scale;
        const worldY = (mouseY - state.offsetY) / state.scale;
        
        // Get the province at the mouse position
        const province = mapProcessor.getProvinceAt(worldX, worldY);
        
        // Update the selected province
        state.selectedProvince = province;
        
        // Update the province details
        updateProvinceDetails();
        
        // Mark that a render is needed
        state.needsRender = true;
    }
    
    // Handle zoom in button click
    function handleZoomIn() {
        // Calculate the center of the canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Calculate the center in the world space
        const worldX = (centerX - state.offsetX) / state.scale;
        const worldY = (centerY - state.offsetY) / state.scale;
        
        // Update the scale
        state.scale *= 1.2;
        
        // Limit the scale
        state.scale = Math.min(state.scale, 10);
        
        // Update the offset to zoom towards the center
        state.offsetX = centerX - worldX * state.scale;
        state.offsetY = centerY - worldY * state.scale;
        
        // Mark that a render is needed
        state.needsRender = true;
    }
    
    // Handle zoom out button click
    function handleZoomOut() {
        // Calculate the center of the canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Calculate the center in the world space
        const worldX = (centerX - state.offsetX) / state.scale;
        const worldY = (centerY - state.offsetY) / state.scale;
        
        // Update the scale
        state.scale *= 0.8;
        
        // Limit the scale
        state.scale = Math.max(0.1, state.scale);
        
        // Update the offset to zoom towards the center
        state.offsetX = centerX - worldX * state.scale;
        state.offsetY = centerY - worldY * state.scale;
        
        // Mark that a render is needed
        state.needsRender = true;
    }
    
    // Handle window resize
    function handleResize() {
        // Save the current center in world space
        const centerX = (canvas.width / 2 - state.offsetX) / state.scale;
        const centerY = (canvas.height / 2 - state.offsetY) / state.scale;
        
        // Resize the canvas
        resizeCanvas();
        
        // Update the offset to keep the center
        state.offsetX = canvas.width / 2 - centerX * state.scale;
        state.offsetY = canvas.height / 2 - centerY * state.scale;
        
        // Mark that a render is needed
        state.needsRender = true;
    }
    
    // Handle toggle high-res button click
    function handleToggleHighRes() {
        state.useHighRes = !state.useHighRes;
        
        // Toggle the active class on the button
        if (state.useHighRes) {
            toggleHighResButton.classList.add('active');
            toggleHighResButton.setAttribute('title', 'HD Mode On');
        } else {
            toggleHighResButton.classList.remove('active');
            toggleHighResButton.setAttribute('title', 'HD Mode Off');
        }
        
        state.needsRender = true;
    }
    
    // Initialize the game
    init();
});