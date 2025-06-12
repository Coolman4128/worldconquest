import json

# File paths
old_gamestate_path = 'assets/default-gamestateOLD.json'
new_gamestate_path = 'assets/default_gamestate.json'

# Load the old gamestate
try:
    with open(old_gamestate_path, 'r', encoding='utf-8') as f:
        old_gamestate_data = json.load(f)
    # Create a dictionary for faster lookup
    old_provinces_dict = old_gamestate_data.get('provinces', {})
    print(f"Successfully loaded old gamestate from {old_gamestate_path}")
    print(f"Found {len(old_provinces_dict)} provinces in old gamestate.")
except FileNotFoundError:
    print(f"Error: Old gamestate file not found at {old_gamestate_path}")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {old_gamestate_path}")
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred while loading {old_gamestate_path}: {e}")
    exit(1)

# Load the new gamestate
try:
    with open(new_gamestate_path, 'r', encoding='utf-8') as f:
        new_gamestate_data = json.load(f)
    new_provinces_list = new_gamestate_data.get('Provinces', [])
    print(f"Successfully loaded new gamestate from {new_gamestate_path}")
    print(f"Found {len(new_provinces_list)} provinces in new gamestate.")
except FileNotFoundError:
    print(f"Error: New gamestate file not found at {new_gamestate_path}")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {new_gamestate_path}")
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred while loading {new_gamestate_path}: {e}")
    exit(1)

# Process provinces (only provinces will be affected, not countries or other parts)
updated_count = 0
skipped_count = 0
water_count = 0
owner_updated_count = 0

for new_province in new_provinces_list:
    province_id = new_province.get('Id')
    if not province_id:
        print(f"Warning: Province found in new gamestate without an 'Id'. Skipping.")
        skipped_count += 1
        continue

    if province_id in old_provinces_dict:
        old_province = old_provinces_dict[province_id]
        old_owner = old_province.get('owner')
        is_water = old_province.get('isWater', False)

        # Update OwnerId (transfer ownership from old gamestate to new gamestate)
        if old_owner and old_owner.lower() != 'water':
            new_province['OwnerId'] = old_owner
            owner_updated_count += 1
        else:
            # Ensure OwnerId is null if old owner is 'water' or missing
            new_province['OwnerId'] = None

        # Update Type if it's water
        if is_water:
            new_province['Type'] = 'Water'
            water_count += 1

        updated_count += 1
    else:
        # print(f"Province {province_id} not found in old gamestate. Skipping.")
        skipped_count += 1

print(f"\nProcessing complete.")
print(f" - Provinces updated: {updated_count}")
print(f"   - Owners transferred: {owner_updated_count}")
print(f"   - Types set to Water: {water_count}")
print(f" - Provinces skipped (not in old gamestate): {skipped_count}")


# Save the updated new gamestate
try:
    with open(new_gamestate_path, 'w', encoding='utf-8') as f:
        json.dump(new_gamestate_data, f, indent=2) # Use indent=2 for readability
    print(f"\nSuccessfully saved updated gamestate to {new_gamestate_path}")
except IOError:
    print(f"Error: Could not write updated gamestate to {new_gamestate_path}")
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred while saving {new_gamestate_path}: {e}")
    exit(1)