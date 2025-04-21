import json
import os
from PIL import Image
import numpy as np
from collections import defaultdict

# Custom JSON encoder to handle NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

def main():
    print("Starting gamestate generation from bitmap...")
    
    # Path to the bitmap image
    bitmap_path = "assets/bitmap.bmp"
    output_path = "backend/WorldConquest/default-gamestate.json"
    
    # Check if the bitmap exists
    if not os.path.exists(bitmap_path):
        print(f"Error: Bitmap file not found at {bitmap_path}")
        return
    
    # Load the bitmap image
    print(f"Loading bitmap from {bitmap_path}...")
    img = Image.open(bitmap_path)
    width, height = img.size
    print(f"Bitmap dimensions: {width}x{height}")
    
    # Convert image to numpy array for faster processing
    img_array = np.array(img)
    
    # Dictionary to store provinces by color
    provinces = {}
    
    # Set to track visited pixels
    visited = set()
    
    # Define water color ranges (similar to the JavaScript code)
    water_color_ranges = [
        {"min": (0, 180, 200), "max": (100, 255, 255)}  # Light blue/cyan water colors
    ]
    
    # Function to check if a color is water
    def is_water_color(color):
        r, g, b = color
        for range_def in water_color_ranges:
            min_r, min_g, min_b = range_def["min"]
            max_r, max_g, max_b = range_def["max"]
            if (min_r <= r <= max_r and 
                min_g <= g <= max_g and 
                min_b <= b <= max_b):
                return True
        return False
    
    # Function to get a unique ID from RGB values
    def rgb_to_id(r, g, b):
        return f"{r}_{g}_{b}"
    
    # Directions for flood fill (up, down, left, right)
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    
    # Function to check if pixel is valid
    def is_valid_pixel(x, y):
        return 0 <= x < width and 0 <= y < height
    
    # Flood fill algorithm to identify connected regions (provinces)
    def flood_fill(start_x, start_y, province_color):
        queue = [(start_x, start_y)]
        province_pixels = []
        
        while queue:
            x, y = queue.pop(0)
            pixel_key = (x, y)
            
            if pixel_key in visited:
                continue
            
            color = tuple(img_array[y, x, :3])  # Get RGB values
            
            # Skip if color doesn't match province color
            if color != province_color:
                continue
            
            visited.add(pixel_key)
            province_pixels.append((x, y))
            
            # Check neighboring pixels
            for dx, dy in directions:
                new_x, new_y = x + dx, y + dy
                
                if is_valid_pixel(new_x, new_y) and (new_x, new_y) not in visited:
                    queue.append((new_x, new_y))
        
        return province_pixels
    
    # Calculate bounds for a set of pixels
    def calculate_bounds(pixels):
        if not pixels:
            return {"minX": 0, "minY": 0, "maxX": 0, "maxY": 0}
        
        x_values = [x for x, y in pixels]
        y_values = [y for x, y in pixels]
        
        return {
            "minX": min(x_values),
            "minY": min(y_values),
            "maxX": max(x_values),
            "maxY": max(y_values)
        }
    
    print("Processing provinces...")
    province_count = 0
    
    # Scan the image to find provinces
    for y in range(height):
        for x in range(width):
            if (x, y) in visited:
                continue
            
            color = tuple(img_array[y, x, :3])  # Get RGB values
            
            # Find all pixels in this province
            province_pixels = flood_fill(x, y, color)
            
            if province_pixels:
                r, g, b = color
                province_id = rgb_to_id(r, g, b)
                
                # Determine if this is a water province
                is_water = is_water_color(color)
                
                # Set owner based on whether it's water or land
                owner = "water" if is_water else "neutral"
                
                # Store the province data
                provinces[province_id] = {
                    "id": province_id,
                    "originalColor": {
                        "r": r,
                        "g": g,
                        "b": b
                    },
                    "owner": owner,
                    "isWater": is_water,
                    "bounds": calculate_bounds(province_pixels)
                }
                
                province_count += 1
                if province_count % 100 == 0:
                    print(f"Processed {province_count} provinces...")
    
    print(f"Finished processing. Found {len(provinces)} provinces.")
    
    # Define 5 default countries
    countries = [
        {
            "id": "kingdom_red",
            "name": "Kingdom of Redoria",
            "color": "red",
            "description": "A wealthy kingdom known for its military might"
        },
        {
            "id": "empire_blue",
            "name": "Blue Empire",
            "color": "blue",
            "description": "An ancient empire with strong naval traditions"
        },
        {
            "id": "duchy_green",
            "name": "Green Duchy",
            "color": "green",
            "description": "A small but prosperous realm with fertile lands"
        },
        {
            "id": "confederation_yellow",
            "name": "Yellow Confederation",
            "color": "yellow",
            "description": "An alliance of city-states with advanced trade networks"
        },
        {
            "id": "purple_dominion",
            "name": "Purple Dominion",
            "color": "purple",
            "description": "A mysterious realm ruled by scholars and mages"
        }
    ]
    
    # Create the game state object - now with countries and without pre-defined players
    game_state = {
        "provinces": provinces,
        "players": [],
        "countries": countries,
        "year": 1100,
        "currentTurn": ""
    }
    
    # Write the game state to the output file
    print(f"Writing game state to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(game_state, f, indent=2, cls=NumpyEncoder)
    
    print("Done! Default game state has been generated.")

if __name__ == "__main__":
    main()