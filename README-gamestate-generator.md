# World Conquest Game State Generator

This script generates a default game state JSON file for the World Conquest game by reading provinces from a bitmap image.

## What it does

1. Reads the bitmap image (`assets/bitmap.bmp`) to identify unique provinces based on their colors
2. Processes each province to determine if it's water or land
3. Sets land provinces to have "red" as their owner and water provinces to have "water" as their owner
4. Generates a complete game state JSON with all provinces
5. Writes the result to `backend/WorldConquest/default-gamestate.json`

## Requirements

- Python 3.6+
- PIL (Python Imaging Library) / Pillow
- NumPy

## Installation

Install the required packages:

```bash
pip install pillow numpy
```

## Usage

Run the script from the project root directory:

```bash
python generate_gamestate.py
```

## How it works

The script uses a flood fill algorithm to identify connected regions of the same color in the bitmap image. Each unique color represents a province. The script then determines if a province is water or land based on predefined color ranges.

For each province, it:
1. Creates a unique ID based on its RGB color values
2. Determines if it's water or land
3. Sets the owner to "water" for water provinces and "red" for land provinces
4. Calculates the bounding box for the province
5. Adds it to the game state

The resulting game state JSON file includes:
- All provinces with their properties
- Default players
- Starting year (1100)
- Initial current turn

## Integration with the game

The backend has been modified to:
1. Load the default game state from the JSON file instead of creating it programmatically
2. Assign "red" as the owner for all land provinces and "water" for water provinces

The frontend has been modified to:
1. Load province states from the backend when joining a lobby
2. Update the map with the provinces from the game state

## Troubleshooting

If you encounter any issues:
1. Make sure the bitmap file exists at `assets/bitmap.bmp`
2. Check that you have the required Python packages installed
3. Ensure you're running the script from the project root directory
4. Check the console output for any error messages