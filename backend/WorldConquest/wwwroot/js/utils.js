/**
 * Utility functions for the World Conquest game
 */

// Generate a random integer between min and max (inclusive)
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Convert RGB values to a string ID in the format "R_G_B"
function rgbToId(r, g, b) {
    return `${r}_${g}_${b}`;
}

// Convert RGB values to a hex color string
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Parse RGB string to color object
function parseRgb(rgbStr) {
    // Parse from format rgb(r,g,b)
    const matches = rgbStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (matches) {
        const r = parseInt(matches[1], 10);
        const g = parseInt(matches[2], 10);
        const b = parseInt(matches[3], 10);
        return { r, g, b, hex: rgbToHex(r, g, b) };
    }
    return null;
}

// Get owner color based on owner name
function getOwnerColor(owner, countries) {
    // If owner starts with country ID prefix and countries array is provided, look up color in countries
    if ((owner.startsWith('kingdom_') || owner.startsWith('empire_') || 
        owner.startsWith('duchy_') || owner.startsWith('confederation_') || 
        owner.startsWith('purple_')) && countries) {
        
        // Find the country in provided countries array
        const country = countries.find(c => c.id === owner);
        if (country && country.color) {
            // Parse the RGB color and return it
            const parsedColor = parseRgb(country.color);
            if (parsedColor) {
                return parsedColor;
            }
        }
    }
    
    // Default colors for basic owners
    switch (owner) {
        case 'red':
            return { r: 231, g: 76, b: 60, hex: '#e74c3c' };
        case 'blue':
            return { r: 52, g: 152, b: 219, hex: '#3498db' };
        case 'green':
            return { r: 46, g: 204, b: 113, hex: '#2ecc71' };
        case 'water':
            return { r: 10, g: 50, b: 100, hex: '#0a3264' }; // Dark blue for water
        default:
            return { r: 189, g: 195, b: 199, hex: '#bdc3c7' }; // Default gray
    }
}

// Check if two colors are equal (within a tolerance)
function colorsEqual(color1, color2, tolerance = 0) {
    return Math.abs(color1.r - color2.r) <= tolerance &&
           Math.abs(color1.g - color2.g) <= tolerance &&
           Math.abs(color1.b - color2.b) <= tolerance;
}

// Format province details for display
function formatProvinceDetails(province, countries) {
    if (!province) {
        return '<p>Click on a province to see its details</p>';
    }
    
    const typeText = province.isWater ? 'Water' : 'Land';
    const typeClass = province.isWater ? 'province-water' : 'province-land';
    
    // Get the owner color in hex format for styling
    const ownerColor = getOwnerColor(province.owner, countries);
    const ownerColorStyle = `color: ${ownerColor.hex}; font-weight: bold;`;
    
    return `
        <div>
            <p><strong>ID:</strong> ${province.id}</p>
            <p><strong>Type:</strong> <span class="${typeClass}">${typeText}</span></p>
            <p><strong>Owner:</strong> <span style="${ownerColorStyle}">${province.owner.toUpperCase()}</span></p>
            <p><strong>Original Color:</strong> rgb(${province.originalColor.r}, ${province.originalColor.g}, ${province.originalColor.b})</p>
        </div>
    `;
}