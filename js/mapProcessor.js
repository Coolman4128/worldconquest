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
     */
    renderMapToCache() {
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
                    const ownerColor = province.isWater ? this.waterColor : getOwnerColor(province.owner);
                    
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
     * Draw the map with province ownership colors
     * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
     * @param {number} scale - Scale factor for drawing
     * @param {number} offsetX - X offset for drawing
     * @param {number} offsetY - Y offset for drawing
     */
    drawMap(ctx, scale, offsetX, offsetY) {
        // If the map hasn't been loaded yet, we can't draw it
        if (!this.imageData) {
            return;
        }
        
        // If the map hasn't been rendered to cache yet, do it now
        if (!this.mapRendered) {
            this.renderMapToCache();
        }
        
        // Draw the cached map on the main canvas with scaling and offset
        ctx.save();
        ctx.scale(scale, scale);
        ctx.drawImage(this.cachedMapCanvas, offsetX / scale, offsetY / scale);
        ctx.restore();
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
}