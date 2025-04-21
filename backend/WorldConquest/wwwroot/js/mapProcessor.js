/**
 * Map Processor for the World Conquest game
 * Handles loading and processing the bitmap image
 */

class MapProcessor {
    constructor() {
        this.provinces = new Map(); // Map to store province data by ID
        this.imageData = null;      // Raw image data
        this.width = 0;             // Image width
        this.height = 0;            // Image height
        this.owners = ['red', 'blue', 'green']; // Possible province owners
        this.waterColor = { r: 10, g: 50, b: 100, hex: '#0a3264' }; // Dark blue for water
        
        // Define color ranges for water provinces based on the map
        this.waterColorRanges = [
            // Light blue/cyan water colors from the map
            { min: { r: 0, g: 180, b: 200 }, max: { r: 100, g: 255, b: 255 } }
        ];
        
        // Cached rendered map
        this.cachedMapCanvas = null;
        this.cachedMapCtx = null;
        this.mapRendered = false;
        
        // Pixel to province ID lookup for faster province detection
        this.provinceIdLookup = null;
        
        // Loading state
        this.isLoading = false;

        // High resolution rendering
        this.highResCanvas = null;
        this.highResCtx = null;
        this.highResScale = 4; // Scale factor for high-res rendering
        this.highResRendered = false;
        
        // Country label rendering
        this.countryLabels = new Map(); // Map to store country label positions and sizes
        this.minZoomForLabels = 0.5;    // Minimum zoom level to show labels
        this.maxZoomForLabels = 2.0;    // Maximum zoom level before labels fade out
    }

    /**
     * Load the bitmap image and process it
     * @param {string} imagePath - Path to the bitmap image
     * @returns {Promise} - Resolves when the image is loaded and processed
     */
    async loadMap(imagePath) {
        // Set loading state
        this.isLoading = true;
        
        return new Promise((resolve, reject) => {
            console.time('loadMap');
            const img = new Image();
            img.onload = () => {
                this.width = img.width;
                this.height = img.height;
                
                // Create a temporary canvas to extract image data
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.width;
                tempCanvas.height = this.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Draw the image on the canvas
                tempCtx.drawImage(img, 0, 0);
                
                // Get the image data
                this.imageData = tempCtx.getImageData(0, 0, this.width, this.height);
                
                // Process the image data to identify provinces
                this.processProvinces();
                
                // Reset loading state
                this.isLoading = false;
                
                console.timeEnd('loadMap');
                resolve();
            };
            
            img.onerror = () => {
                this.isLoading = false;
                reject(new Error(`Failed to load image: ${imagePath}`));
            };
            
            img.src = imagePath;
        });
    }

    /**
     * Process the image data to identify unique provinces
     */
    processProvinces() {
        console.time('processProvinces');
        const { data, width, height } = this.imageData;
        const visitedPixels = new Set();
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Up, down, left, right
        
        // Create lookup array for faster province detection
        this.provinceIdLookup = new Uint32Array(width * height);
        
        // Helper function to get pixel index
        const getPixelIndex = (x, y) => (y * width + x) * 4;
        
        // Helper function to get pixel color
        const getPixelColor = (x, y) => {
            const idx = getPixelIndex(x, y);
            return {
                r: data[idx],
                g: data[idx + 1],
                b: data[idx + 2],
                a: data[idx + 3]
            };
        };
        
        // Helper function to check if a pixel is within bounds
        const isValidPixel = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
        
        // Helper function to get pixel key for visited set
        const getPixelKey = (x, y) => `${x},${y}`;
        
        // Flood fill algorithm to identify connected regions (provinces)
        const floodFill = (startX, startY, provinceColor) => {
            const queue = [[startX, startY]];
            const provincePixels = [];
            
            while (queue.length > 0) {
                const [x, y] = queue.shift();
                const pixelKey = getPixelKey(x, y);
                
                if (visitedPixels.has(pixelKey)) continue;
                
                const color = getPixelColor(x, y);
                
                // Skip transparent or non-matching pixels
                if (color.a < 255 || !colorsEqual(color, provinceColor, 3)) continue;
                
                visitedPixels.add(pixelKey);
                provincePixels.push([x, y]);
                
                // Check neighboring pixels
                for (const [dx, dy] of directions) {
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    if (isValidPixel(newX, newY) && !visitedPixels.has(getPixelKey(newX, newY))) {
                        queue.push([newX, newY]);
                    }
                }
            }
            
            return provincePixels;
        };
        
        // Scan the image to find provinces
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (visitedPixels.has(getPixelKey(x, y))) continue;
                
                const color = getPixelColor(x, y);
                
                // Skip transparent pixels
                if (color.a < 255) continue;
                
                // Find all pixels in this province
                const provincePixels = floodFill(x, y, color);
                
                if (provincePixels.length > 0) {
                    // Create a province ID from the color
                    const id = rgbToId(color.r, color.g, color.b);
                    
                    // Determine if this is a water province based on color ranges
                    const isWater = this.isWaterColor(color);
                    
                    // Randomly assign an owner (only for land provinces)
                    const owner = isWater ? 'water' : this.owners[getRandomInt(0, this.owners.length - 1)];
                    
                    // Store the province data
                    this.provinces.set(id, {
                        id,
                        originalColor: { r: color.r, g: color.g, b: color.b },
                        owner,
                        isWater,
                        pixels: provincePixels,
                        bounds: this.calculateBounds(provincePixels)
                    });
                    
                    // Store province ID in lookup array for each pixel
                    const numericId = this.colorToNumericId(color.r, color.g, color.b);
                    for (const [px, py] of provincePixels) {
                        this.provinceIdLookup[py * width + px] = numericId;
                    }
                }
            }
        }
        
        // Create and initialize the cached map canvas
        this.initCachedMap();
        
        console.timeEnd('processProvinces');
        console.log(`Processed ${this.provinces.size} provinces`);
    }
    
    /**
     * Convert RGB color to a numeric ID for faster lookups
     * @param {number} r - Red component
     * @param {number} g - Green component
     * @param {number} b - Blue component
     * @returns {number} - Numeric ID
     */
    colorToNumericId(r, g, b) {
        // Pack RGB into a single 32-bit integer
        return (r << 16) | (g << 8) | b;
    }
    
    /**
     * Initialize the cached map canvas with pre-rendered map
     */
    initCachedMap() {
        console.time('initCachedMap');
        // Create a canvas for the cached map
        this.cachedMapCanvas = document.createElement('canvas');
        this.cachedMapCanvas.width = this.width;
        this.cachedMapCanvas.height = this.height;
        this.cachedMapCtx = this.cachedMapCanvas.getContext('2d', { alpha: false });
        
        // Render the map with province colors and borders
        this.renderMapToCache();
        
        console.timeEnd('initCachedMap');
    }
    
    /**
     * Render the map to the cache canvas
     * @param {Array} countries - Optional array of countries for color mapping
     */
    renderMapToCache(countries) {
        // Create a new ImageData object for the map
        const mapData = new ImageData(this.width, this.height);
        
        // Fill the map with province colors based on ownership
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                const originalIdx = idx;
                
                // Get the original pixel color
                const r = this.imageData.data[originalIdx];
                const g = this.imageData.data[originalIdx + 1];
                const b = this.imageData.data[originalIdx + 2];
                const a = this.imageData.data[originalIdx + 3];
                
                // Skip transparent pixels
                if (a < 255) {
                    mapData.data[idx] = 0;
                    mapData.data[idx + 1] = 0;
                    mapData.data[idx + 2] = 0;
                    mapData.data[idx + 3] = 0;
                    continue;
                }
                
                // Get the province ID from the color
                const id = rgbToId(r, g, b);
                const province = this.provinces.get(id);
                
                if (province) {
                    // Get the color based on whether it's water or land
                    const ownerColor = province.isWater ? this.waterColor : getOwnerColor(province.owner, countries);
                    
                    // Set the pixel color to the owner's color
                    mapData.data[idx] = ownerColor.r;
                    mapData.data[idx + 1] = ownerColor.g;
                    mapData.data[idx + 2] = ownerColor.b;
                    mapData.data[idx + 3] = 255;
                } else {
                    // Use the original color if no province is found
                    mapData.data[idx] = r;
                    mapData.data[idx + 1] = g;
                    mapData.data[idx + 2] = b;
                    mapData.data[idx + 3] = a;
                }
            }
        }
        
        // Put the map data on the cached canvas
        this.cachedMapCtx.putImageData(mapData, 0, 0);
        
        // Draw province borders
        this.drawProvinceBordersToCache();
        
        this.mapRendered = true;
    }

    /**
     * Calculate the bounding box for a set of pixels
     * @param {Array} pixels - Array of [x, y] coordinates
     * @returns {Object} - Bounding box {minX, minY, maxX, maxY}
     */
    calculateBounds(pixels) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const [x, y] of pixels) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
        
        return { minX, minY, maxX, maxY };
    }

    /**
     * Get province at a specific pixel coordinate
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} - Province object or null if no province at coordinates
     */
    getProvinceAt(x, y) {
        // If the map hasn't been loaded yet, we can't get a province
        if (!this.imageData || !this.provinceIdLookup) {
            return null;
        }
        
        // Convert screen coordinates to image coordinates
        const imageX = Math.floor(x);
        const imageY = Math.floor(y);
        
        // Check if coordinates are within image bounds
        if (imageX < 0 || imageX >= this.width || imageY < 0 || imageY >= this.height) {
            return null;
        }
        
        // Use the lookup array for faster province detection
        const lookupIndex = imageY * this.width + imageX;
        const numericId = this.provinceIdLookup[lookupIndex];
        
        if (numericId === 0) return null; // No province at this pixel
        
        // Convert numeric ID back to RGB
        const r = (numericId >> 16) & 0xFF;
        const g = (numericId >> 8) & 0xFF;
        const b = numericId & 0xFF;
        
        // Get the province ID from the color
        const id = rgbToId(r, g, b);
        
        // Return the province if it exists
        return this.provinces.get(id) || null;
    }

    /**
     * Draw the map with high resolution and country labels
     * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
     * @param {number} scale - Scale factor for drawing
     * @param {number} offsetX - X offset for drawing
     * @param {number} offsetY - Y offset for drawing
     * @param {Array} countries - Optional array of countries for labels
     * @param {boolean} useHighRes - Whether to use high resolution rendering
     */
    drawMap(ctx, scale, offsetX, offsetY, countries, useHighRes = false) {
        // If the map hasn't been loaded yet, we can't draw it
        if (!this.imageData) {
            console.log('No image data available, cannot draw map');
            return;
        }
        
        // If the map hasn't been rendered to cache yet, do it now
        if (!this.mapRendered) {
            console.log('Map not rendered to cache yet, doing it now');
            this.renderMapToCache();
        }
        
        // Initialize high-res map if needed and not already done
        if (useHighRes && !this.highResRendered) {
            try {
                console.log('Initializing high-res map on demand');
                this.initHighResMap();
            } catch (error) {
                console.error('Failed to initialize high-res map:', error);
                useHighRes = false;
            }
        }
        
        ctx.save();
        
        if (useHighRes && this.highResRendered) {
            // Draw the high-resolution map
            console.log('Drawing high-resolution map');
            const highResScale = scale / this.highResScale;
            ctx.scale(highResScale, highResScale);
            ctx.drawImage(this.highResCanvas, offsetX / highResScale, offsetY / highResScale);
        } else {
            // Draw the standard resolution map
            console.log('Drawing standard resolution map');
            ctx.scale(scale, scale);
            ctx.drawImage(this.cachedMapCanvas, offsetX / scale, offsetY / scale);
        }
        
        ctx.restore();
        
        // Draw country labels if provided and we're at an appropriate zoom level
        if (countries && scale >= this.minZoomForLabels && scale <= this.maxZoomForLabels * 2) {
            // Generate country labels if needed
            if (this.countryLabels.size === 0) {
                console.log('Generating country labels');
                this.generateCountryLabels(countries);
            }
            
            console.log('Drawing country labels');
            this.drawCountryLabels(ctx, scale, offsetX, offsetY);
        }
    }
    
    /**
     * Check if a color is within the water color ranges
     * @param {Object} color - Color object with r, g, b properties
     * @returns {boolean} - True if the color is a water color
     */
    isWaterColor(color) {
        // Check if the color is within any of the water color ranges
        for (const range of this.waterColorRanges) {
            if (
                color.r >= range.min.r && color.r <= range.max.r &&
                color.g >= range.min.g && color.g <= range.max.g &&
                color.b >= range.min.b && color.b <= range.max.b
            ) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Draw borders around provinces
     * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
     */
    /**
     * Draw borders around provinces to the cached canvas
     */
    drawProvinceBordersToCache() {
        console.time('drawProvinceBorders');
        const directions = [
            [-1, 0],  // Left
            [1, 0],   // Right
            [0, -1],  // Up
            [0, 1]    // Down
        ];
        
        // Set up border colors
        const sameBorderColor = 'rgba(200, 200, 200, 0.5)';  // Light gray for same owner
        const diffBorderColor = 'rgba(0, 0, 0, 0.8)';        // Dark black for different owner
        
        // Create an array to store border pixels for batch rendering
        const sameBorderPixels = [];
        const diffBorderPixels = [];
        
        // Process each pixel to check for borders
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Get the province at the current pixel using the lookup array
                const lookupIndex = y * this.width + x;
                const currentNumericId = this.provinceIdLookup[lookupIndex];
                
                if (currentNumericId === 0) continue; // No province at this pixel
                
                // Convert numeric ID back to RGB for province lookup
                const r = (currentNumericId >> 16) & 0xFF;
                const g = (currentNumericId >> 8) & 0xFF;
                const b = currentNumericId & 0xFF;
                const id = rgbToId(r, g, b);
                const currentProvince = this.provinces.get(id);
                
                if (!currentProvince) continue;
                
                // Check neighboring pixels
                for (const [dx, dy] of directions) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    // Skip if out of bounds
                    if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
                    
                    // Get the neighboring province using the lookup array
                    const neighborLookupIndex = ny * this.width + nx;
                    const neighborNumericId = this.provinceIdLookup[neighborLookupIndex];
                    
                    // If no neighbor or different province, add a border pixel
                    if (neighborNumericId !== currentNumericId) {
                        if (neighborNumericId === 0) {
                            // No province at neighbor, use different owner border
                            diffBorderPixels.push([x, y]);
                        } else {
                            // Convert neighbor numeric ID back to RGB for province lookup
                            const nr = (neighborNumericId >> 16) & 0xFF;
                            const ng = (neighborNumericId >> 8) & 0xFF;
                            const nb = neighborNumericId & 0xFF;
                            const neighborId = rgbToId(nr, ng, nb);
                            const neighborProvince = this.provinces.get(neighborId);
                            
                            // Determine border color based on ownership
                            if (!neighborProvince || neighborProvince.owner !== currentProvince.owner) {
                                diffBorderPixels.push([x, y]); // Different owner - black border
                            } else {
                                sameBorderPixels.push([x, y]); // Same owner - light gray border
                            }
                        }
                        break; // Only need to draw one border per pixel
                    }
                }
            }
        }
        
        // Draw same-owner borders
        this.cachedMapCtx.fillStyle = sameBorderColor;
        for (const [x, y] of sameBorderPixels) {
            this.cachedMapCtx.fillRect(x, y, 1, 1);
        }
        
        // Draw different-owner borders
        this.cachedMapCtx.fillStyle = diffBorderColor;
        for (const [x, y] of diffBorderPixels) {
            this.cachedMapCtx.fillRect(x, y, 1, 1);
        }
        
        console.timeEnd('drawProvinceBorders');
    }

    /**
     * Initialize the high-resolution map canvas
     */
    initHighResMap() {
        console.time('initHighResMap');
        console.log('Starting high-res map initialization');
        
        try {
            // Create a canvas for the high-resolution map
            this.highResCanvas = document.createElement('canvas');
            this.highResCanvas.width = this.width * this.highResScale;
            this.highResCanvas.height = this.height * this.highResScale;
            console.log(`Created high-res canvas: ${this.highResCanvas.width}x${this.highResCanvas.height}`);
            
            this.highResCtx = this.highResCanvas.getContext('2d', { alpha: false });
            
            // Render the high-resolution map
            console.log('About to render high-res map');
            this.renderHighResMap();
            
            console.timeEnd('initHighResMap');
            console.log('High-res map initialization completed');
        } catch (error) {
            console.error('Error in initHighResMap:', error);
        }
    }
    
    /**
     * Render the map in high resolution
     */
    renderHighResMap() {
        console.time('renderHighResMap');
        console.log('Starting high-res map rendering');
        
        try {
            const ctx = this.highResCtx;
            
            // Clear the canvas
            ctx.clearRect(0, 0, this.highResCanvas.width, this.highResCanvas.height);
            
            // Draw provinces with anti-aliasing
            ctx.save();
            ctx.scale(this.highResScale, this.highResScale);
            
            console.log(`Processing ${this.provinces.size} provinces for high-res rendering`);
            let processedCount = 0;
            
            // Iterate through all provinces and draw them with smooth edges
            this.provinces.forEach((province, id) => {
                try {
                    if (!province.pixels || province.pixels.length === 0) return;
                    
                    const ownerColor = province.isWater ? this.waterColor : getOwnerColor(province.owner);
                    
                    // Use the province path for smooth rendering
                    const path = this.createProvincePath(province.pixels);
                    
                    ctx.fillStyle = `rgb(${ownerColor.r}, ${ownerColor.g}, ${ownerColor.b})`;
                    ctx.fill(path);
                    
                    processedCount++;
                    if (processedCount % 50 === 0) {
                        console.log(`Processed ${processedCount} provinces`);
                    }
                } catch (error) {
                    console.error(`Error rendering province ${id}:`, error);
                }
            });
            
            ctx.restore();
            
            console.log('Starting border rendering in high-res');
            // Draw province borders
            this.drawProvinceBordersHighRes();
            
            this.highResRendered = true;
            console.timeEnd('renderHighResMap');
            console.log('High-res map rendering completed');
        } catch (error) {
            console.error('Error in renderHighResMap:', error);
        }
    }
    
    /**
     * Create a Path2D object from province pixels for smooth rendering
     * @param {Array} pixels - Array of [x, y] coordinates
     * @returns {Path2D} - Path representing the province shape
     */
    createProvincePath(pixels) {
        try {
            const path = new Path2D();
            
            // Use boundary tracing algorithm to get smooth borders
            const boundary = this.traceBoundary(pixels);
            
            if (boundary.length > 0) {
                path.moveTo(boundary[0][0], boundary[0][1]);
                
                for (let i = 1; i < boundary.length; i++) {
                    path.lineTo(boundary[i][0], boundary[i][1]);
                }
                
                path.closePath();
            }
            
            return path;
        } catch (error) {
            console.error('Error in createProvincePath:', error);
            return new Path2D(); // Return an empty path on error
        }
    }
    
    /**
     * Trace the boundary of a set of pixels
     * @param {Array} pixels - Array of [x, y] coordinates
     * @returns {Array} - Array of boundary points
     */
    traceBoundary(pixels) {
        if (pixels.length === 0) return [];
        
        try {
            // For maps with many provinces, limit the tracing to improve performance
            if (pixels.length > 1000) {
                // For large provinces, simplify by using fewer points
                const simplifiedPixels = [];
                for (let i = 0; i < pixels.length; i += 10) { // Sample every 10th pixel
                    simplifiedPixels.push(pixels[i]);
                }
                return simplifiedPixels;
            }
            
            // Create a set of pixel keys for fast lookup
            const pixelSet = new Set(pixels.map(([x, y]) => `${x},${y}`));
            
            // Find the leftmost pixel as starting point
            const startPixel = pixels.reduce((left, pixel) => 
                (pixel[0] < left[0] || (pixel[0] === left[0] && pixel[1] < left[1])) ? pixel : left
            );
            
            const boundary = [startPixel];
            let current = startPixel;
            let direction = 0; // 0: right, 1: down, 2: left, 3: up
            
            // Directions: right, down, left, up (clockwise)
            const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
            
            // Keep track of visited boundary pixels to avoid infinite loops
            const visited = new Set([`${startPixel[0]},${startPixel[1]}`]);
            
            // Maximum number of steps to prevent infinite loops
            const maxSteps = Math.min(pixels.length * 2, 2000); // Cap at 2000 steps
            let steps = 0;
            
            while (steps < maxSteps) {
                // Try to move in the current direction
                let found = false;
                
                for (let i = 0; i < 4; i++) {
                    const newDir = (direction + i) % 4;
                    const [dx, dy] = dirs[newDir];
                    const next = [current[0] + dx, current[1] + dy];
                    const key = `${next[0]},${next[1]}`;
                    
                    if (pixelSet.has(key)) {
                        if (!visited.has(key)) {
                            boundary.push(next);
                            visited.add(key);
                        }
                        current = next;
                        direction = newDir;
                        found = true;
                        break;
                    }
                }
                
                if (!found) break;
                steps++;
                
                // Check if we've returned to the starting position
                if (current[0] === startPixel[0] && current[1] === startPixel[1] && steps > 2) {
                    break;
                }
            }
            
            // Sample the boundary to reduce points if it's very large
            if (boundary.length > 500) {
                const sampledBoundary = [];
                for (let i = 0; i < boundary.length; i += 2) { // Take every other point
                    sampledBoundary.push(boundary[i]);
                }
                return sampledBoundary;
            }
            
            return boundary;
        } catch (error) {
            console.error('Error in traceBoundary:', error);
            return []; // Return empty array on error
        }
    }
    
    /**
     * Draw province borders in high resolution
     */
    drawProvinceBordersHighRes() {
        console.time('drawProvinceBordersHighRes');
        console.log('Starting high-res border rendering');
        
        try {
            const ctx = this.highResCtx;
            
            // Set up border colors
            const sameBorderColor = 'rgba(200, 200, 200, 0.5)';  // Light gray for same owner
            const diffBorderColor = 'rgba(0, 0, 0, 0.8)';        // Dark black for different owner
            
            // Scale for high res
            ctx.save();
            ctx.scale(this.highResScale, this.highResScale);
            
            // Use a simplified approach for borders to improve performance
            ctx.strokeStyle = diffBorderColor;
            ctx.lineWidth = 0.5;
            
            let processed = 0;
            this.provinces.forEach((province) => {
                // Skip provinces with too many pixels to improve performance
                if (province.pixels && province.pixels.length > 0 && province.pixels.length < 5000) {
                    const boundary = this.traceBoundary(province.pixels);
                    
                    if (boundary.length > 0) {
                        // Draw the boundary
                        ctx.beginPath();
                        ctx.moveTo(boundary[0][0], boundary[0][1]);
                        
                        for (let i = 1; i < boundary.length; i++) {
                            ctx.lineTo(boundary[i][0], boundary[i][1]);
                        }
                        
                        ctx.closePath();
                        ctx.stroke();
                    }
                }
                
                processed++;
                if (processed % 50 === 0) {
                    console.log(`Processed borders for ${processed} provinces`);
                }
            });
            
            ctx.restore();
            
            console.timeEnd('drawProvinceBordersHighRes');
            console.log('High-res border rendering completed');
        } catch (error) {
            console.error('Error in drawProvinceBordersHighRes:', error);
        }
    }
    
    /**
     * Generate country labels for all countries
     * @param {Array} countries - Array of country objects
     */
    generateCountryLabels(countries) {
        // Clear existing labels
        this.countryLabels.clear();
        
        if (!countries || countries.length === 0) return;
        
        // Group provinces by country/owner
        const countryProvinces = new Map();
        
        this.provinces.forEach(province => {
            // Skip water provinces
            if (province.isWater) return;
            
            const owner = province.owner;
            if (!countryProvinces.has(owner)) {
                countryProvinces.set(owner, []);
            }
            countryProvinces.get(owner).push(province);
        });
        
        // For each country, find connected province groups and calculate label positions
        countryProvinces.forEach((provinces, owner) => {
            // Find the country object
            const country = countries.find(c => c.id === owner) || { name: owner.toUpperCase(), color: '#FFFFFF' };
            
            // Find connected province groups
            const groups = this.findConnectedProvinceGroups(provinces);
            
            // Calculate label position and size for each group
            groups.forEach(group => {
                // Calculate the bounding box of the group
                const minX = Math.min(...group.flatMap(p => p.pixels.map(([x]) => x)));
                const minY = Math.min(...group.flatMap(p => p.pixels.map(([_, y]) => y)));
                const maxX = Math.max(...group.flatMap(p => p.pixels.map(([x]) => x)));
                const maxY = Math.max(...group.flatMap(p => p.pixels.map(([_, y]) => y)));
                
                // Calculate the center of the group
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                // Estimate the size based on the area
                const width = maxX - minX;
                const height = maxY - minY;
                const area = width * height;
                const size = Math.sqrt(area) * 0.15; // Scale font size based on area
                
                // Store the label information
                this.countryLabels.set(`${owner}-${this.countryLabels.size}`, {
                    text: country.name,
                    x: centerX,
                    y: centerY,
                    color: typeof country.color === 'string' ? country.color : `rgb(${country.color.r}, ${country.color.g}, ${country.color.b})`,
                    size: Math.min(Math.max(size, 12), 72), // Min 12px, max 72px
                    width,
                    height,
                    angle: width > height ? 0 : -Math.PI / 2 // Rotate if taller than wide
                });
            });
        });
    }
    
    /**
     * Find connected groups of provinces
     * @param {Array} provinces - Array of province objects
     * @returns {Array} - Array of connected province groups
     */
    findConnectedProvinceGroups(provinces) {
        if (!provinces || provinces.length === 0) return [];
        
        const visited = new Set();
        const groups = [];
        
        // Helper function to check if two provinces share a border
        const areNeighbors = (a, b) => {
            // Simple check: if the distance between any pixel in a and any pixel in b is 1
            for (const [ax, ay] of a.pixels) {
                for (const [bx, by] of b.pixels) {
                    const dx = Math.abs(ax - bx);
                    const dy = Math.abs(ay - by);
                    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                        return true;
                    }
                }
            }
            return false;
        };
        
        // For each province, find its connected group
        for (const province of provinces) {
            if (visited.has(province.id)) continue;
            
            // Start a new group with this province
            const group = [province];
            visited.add(province.id);
            
            // Use a queue for breadth-first search
            const queue = [province];
            
            while (queue.length > 0) {
                const current = queue.shift();
                
                // Check all other provinces for neighbors
                for (const other of provinces) {
                    if (visited.has(other.id)) continue;
                    
                    if (areNeighbors(current, other)) {
                        group.push(other);
                        visited.add(other.id);
                        queue.push(other);
                    }
                }
            }
            
            groups.push(group);
        }
        
        return groups;
    }
    
    /**
     * Draw country labels on the map
     * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
     * @param {number} scale - Scale factor for drawing
     * @param {number} offsetX - X offset for drawing
     * @param {number} offsetY - Y offset for drawing
     */
    drawCountryLabels(ctx, scale, offsetX, offsetY) {
        ctx.save();
        
        // Calculate opacity based on zoom
        let opacity = 1.0;
        if (scale > this.maxZoomForLabels) {
            // Fade out as we zoom in further
            opacity = 1.0 - Math.min(1.0, (scale - this.maxZoomForLabels) / this.maxZoomForLabels);
        }
        
        this.countryLabels.forEach(label => {
            // Position in screen space
            const screenX = label.x * scale + offsetX;
            const screenY = label.y * scale + offsetY;
            
            // Check if the label is visible on screen
            if (
                screenX + label.width * scale / 2 < 0 || 
                screenX - label.width * scale / 2 > ctx.canvas.width ||
                screenY + label.height * scale / 2 < 0 ||
                screenY - label.height * scale / 2 > ctx.canvas.height
            ) {
                return; // Skip if not visible
            }
            
            // Set up text rendering
            ctx.font = `bold ${label.size * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add stroke for better visibility
            ctx.strokeStyle = 'rgba(0, 0, 0, ' + (0.5 * opacity) + ')';
            ctx.lineWidth = 5 * scale;
            
            // Apply rotation if needed
            ctx.translate(screenX, screenY);
            ctx.rotate(label.angle);
            
            // Draw text stroke
            ctx.globalAlpha = opacity;
            ctx.strokeText(label.text, 0, 0);
            
            // Draw text fill
            ctx.fillStyle = label.color;
            ctx.fillText(label.text, 0, 0);
            
            // Reset transformation
            ctx.rotate(-label.angle);
            ctx.translate(-screenX, -screenY);
        });
        
        ctx.restore();
    }
}