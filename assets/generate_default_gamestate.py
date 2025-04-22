import json
from datetime import datetime
from collections import defaultdict
from PIL import Image

def rgb_to_id(rgb):
    return f"{rgb[0]}_{rgb[1]}_{rgb[2]}"

def get_unique_colors(image_path):
    img = Image.open(image_path).convert("RGB")
    pixels = img.getdata()
    unique_colors = set(pixels)
    return unique_colors

def main():
    # Path to bitmap (try bmp first, fallback to png)
    try:
        unique_colors = get_unique_colors("assets/bitmap.bmp")
    except FileNotFoundError:
        unique_colors = get_unique_colors("assets/bitmap.png")

    provinces = []
    for color in unique_colors:
        province = {
            "Id": rgb_to_id(color),
            "OwnerId": None,
            "TroopIds": [],
            "BuildingIds": [],
            "Level": "Countryside",
            "Religion": "christian",
            "Type": "Land",
            "Unrest": 0,
            "Upgradable": True
        }
        provinces.append(province)

    gamestate = {
        "GameId": "1",
        "Players": [],
        "Countries": [
            {
                "Id": "red_kingdom",
                "Name": "The Red Kingdom",
                "Color": "255_0_0",
                "Money": 0,
                "PlayerId": None,
                "Stability": 100,
                "Population": 0
            }
        ],
        "Provinces": provinces,
        "DiplomaticRelations": [],
        "CurrentDate": "1080-01-01T00:00:00",
        "CurrentTurnPlayerId": "",
        "Armies": []
    }

    with open("assets/default_gamestate.json", "w") as f:
        json.dump(gamestate, f, indent=2)

    print("Default gamestate generated at assets/default_gamestate.json")

if __name__ == "__main__":
    main()