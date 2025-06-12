import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext'; // Import useGame
import { useProvinceSelection } from '../contexts/ProvinceSelectionContext';
import { Province, Country, Army } from '../types/game'; // Import Army type
import { memo } from 'react'; // Import memo

// Define fallback and border colors
const FALLBACK_COLORS = {
  Land: 'rgba(139, 69, 19, 0.7)', // Brownish for land
  Water: 'rgba(0, 0, 255, 0.7)', // Blue for water
  Wasteland: 'rgba(128, 128, 128, 0.7)', // Gray for wasteland
};
const BORDER_COLORS = {
  Internal: 'rgba(172, 172, 172, 0.2)', // Light gray
  External: 'rgba(0, 0, 0, 1)',      // Black
  Selected: 'rgba(184, 134, 11, 1)', // Darker Gold
};

// Helper to get province ID from color components
const rgbToId = (r: number, g: number, b: number): string => `${r}_${g}_${b}`;

// Helper to parse country color string
const parseCountryColor = (colorString: string): string => {
    // Assuming format "rgb(r, g, b)" or potentially just "r_g_b"
    if (colorString.startsWith('rgb')) {
        return `rgba(${colorString.substring(4, colorString.length - 1)}, 0.7)`; // Add alpha
    }
    // Fallback for "r_g_b" format if needed, though generate script seems inconsistent
    const parts = colorString.split('_');
    if (parts.length === 3) {
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0.7)`;
    }
    return 'rgba(255, 255, 255, 0.1)'; // Default fallback if format is unknown
};


// Interface for storing province group data
interface ProvinceGroup {
  countryId: string;
  provinceIds: Set<string>; // Use Set for efficient checking
  bounds: { minX: number; minY: number; maxX: number; maxY: number }; // In bitmap coordinates
}

interface GameMapProps {
  provinces: Province[];
  countries: Country[];
  // playerCountries: Record<string, string>; // Removed unused prop
}

// Rename the component implementation
const GameMapComponent: React.FC<GameMapProps> = ({ provinces, countries }) => { // Removed unused playerCountries prop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null); // For pixel data access
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [preRenderedMap, setPreRenderedMap] = useState<ImageBitmap | null>(null); // For the pre-rendered map with colors/external borders
  const [provinceMap, setProvinceMap] = useState<Map<string, Province>>(new Map()); // Cache for faster lookups
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map()); // Cache for faster lookups
  const [countryProvinceGroups, setCountryProvinceGroups] = useState<ProvinceGroup[]>([]); // NEW: State for calculated groups
  const [provinceBorders, setProvinceBorders] = useState<Map<string, { x: number, y: number }[]>>(new Map()); // Stores border pixel coordinates for each province
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null); // To manage animation frames
  const zoomAnimationFrameId = useRef<number | null>(null); // To manage zoom animation frames

  // Get map position, game state, and selection context data
  // Assuming playerCountryId will be provided by GameContext
  const { gameState, mapPosition, updateMapPosition, playerCountryId, sendGameAction } = useGame(); // Added sendGameAction
  const {
    selectProvince,
    selectedProvince,
  } = useProvinceSelection();

  // State for selected army and context menu
  const [selectedArmyId, setSelectedArmyId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
      x: number; // Screen X
      y: number; // Screen Y
      targetProvinceId: string;
      canMove: boolean;
  } | null>(null);

  // Attach wheel event listener with passive: false to allow preventDefault
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a new wheel listener inside the effect to ensure it captures the latest mapPosition
    const wheelListener = (e: WheelEvent) => {
      e.preventDefault();

      // Normalize deltaY based on the deltaMode
      let normalizedDelta = e.deltaY;

      // Apply different scaling factors based on the device type
      const zoomSensitivity = 0.025;

      // Apply non-linear scaling for better control
      const direction = normalizedDelta > 0 ? 1 : -1;
      const magnitude = Math.log1p(Math.abs(normalizedDelta)) * direction;

      const scaleFactor = Math.exp(-magnitude * zoomSensitivity);
      const newTargetScale = mapPosition.targetScale * scaleFactor;

      // Limit zoom range
      if (newTargetScale < 0.05 || newTargetScale > 20) return;

      // Calculate zoom center
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate target position to zoom towards mouse
      const newTargetX = mapPosition.targetX - (mouseX - mapPosition.targetX) * (scaleFactor - 1);
      const newTargetY = mapPosition.targetY - (mouseY - mapPosition.targetY) * (scaleFactor - 1);

      updateMapPosition({
        targetX: newTargetX,
        targetY: newTargetY,
        targetScale: newTargetScale
      });
    };

    canvas.addEventListener('wheel', wheelListener, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', wheelListener);
    };
  }, [canvasRef, mapPosition, updateMapPosition]); // Add mapPosition and updateMapPosition to dependencies

  // Load the bitmap image
  useEffect(() => {
    const loadBitmap = async () => {
      try {
        const response = await fetch('/assets/bitmap.png');
        const blob = await response.blob();
        const image = await createImageBitmap(blob);
        setBitmap(image);
        // Removed setting unused canvasSize state
      } catch (error) {
        console.error('Failed to load bitmap:', error);
      }
    };

    loadBitmap();
  }, []);

  // Pre-process props into maps for faster lookups when they change
  useEffect(() => {
    const newProvinceMap = new Map<string, Province>();
    provinces.forEach(p => newProvinceMap.set(p.Id, p));
    setProvinceMap(newProvinceMap);

    const newCountryMap = new Map<string, Country>();
    countries.forEach(c => newCountryMap.set(c.Id, c));
    setCountryMap(newCountryMap);
  }, [provinces, countries]); // Depend on props now


  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Trigger redraw via state change, not direct call
        // renderMap(); // Removed direct call
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [bitmap, provinceMap, countryMap]); // Removed gameState dependency

  // Effect to pre-render the map with colors and borders when data changes
  useEffect(() => {
    // Depend on props and derived maps, not gameState
    if (!bitmap || !provinceMap.size || !countryMap.size || !provinces || !countries) return;

    console.log("Pre-rendering map..."); // Log when pre-rendering happens

    // Ensure offscreen canvas exists and has the bitmap data
    if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreenCanvas = offscreenCanvasRef.current;
    let offscreenCtx: CanvasRenderingContext2D | null = null;

    // Ensure context allows readback ('willReadFrequently')
    if (offscreenCanvas.width !== bitmap.width || offscreenCanvas.height !== bitmap.height) {
        offscreenCanvas.width = bitmap.width;
        offscreenCanvas.height = bitmap.height;
        offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
        if (offscreenCtx) {
            offscreenCtx.drawImage(bitmap, 0, 0);
        } else {
            console.error("Failed to get offscreen canvas context during setup");
            return; // Cannot proceed without context
        }
    } else {
        // Get existing context, ensure it allows readback
        offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
         if (!offscreenCtx) {
             console.error("Failed to get existing offscreen canvas context");
             return; // Cannot proceed
         }
    }


    // Get pixel data from the original bitmap (via offscreen canvas)
    let originalImageData: ImageData | null = null;
    try {
        // Double check context exists before using it
        if (!offscreenCtx) {
             console.error("Offscreen context lost before getImageData");
             return;
        }
        originalImageData = offscreenCtx.getImageData(0, 0, bitmap.width, bitmap.height);
    } catch (e) {
        console.error("Error getting ImageData for pre-render (tainted canvas?):", e);
        // Handle error appropriately, maybe set a flag or default image
        return;
    }
    const originalPixels = originalImageData.data;

    // Create new ImageData for drawing colored/bordered map
    // Use a temporary canvas context to create ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
        console.error("Failed to create temporary context for ImageData");
        return;
    }
    const finalImageData = tempCtx.createImageData(bitmap.width, bitmap.height);
    const finalPixels = finalImageData.data;

    const getProvinceInfo = (x: number, y: number): { province: Province | undefined, owner: Country | undefined } => {
        if (x < 0 || x >= bitmap.width || y < 0 || y >= bitmap.height) {
            return { province: undefined, owner: undefined };
        }
        const index = (y * bitmap.width + x) * 4;
        const r = originalPixels[index];
        const g = originalPixels[index + 1];
        const b = originalPixels[index + 2];
        // Ignore pure alpha or fully transparent pixels if necessary
        // if (originalPixels[index + 3] < 255) return { province: undefined, owner: undefined };

        const provinceId = rgbToId(r, g, b);
        const province = provinceMap.get(provinceId);
        const owner = province?.OwnerId ? countryMap.get(province.OwnerId) : undefined;
        return { province, owner };
    };

    // --- Pixel iteration logic (copied from original renderMap) ---
    for (let y = 0; y < bitmap.height; y++) {
        for (let x = 0; x < bitmap.width; x++) {
            const { province, owner } = getProvinceInfo(x, y);
            const index = (y * bitmap.width + x) * 4;

            let finalColor = FALLBACK_COLORS.Land;
            let borderColor: string | null = null;

            if (province) {
                // 1. Determine base color
                if (owner) {
                    const country = countryMap.get(province.OwnerId!);
                    finalColor = country ? parseCountryColor(country.Color) : FALLBACK_COLORS.Land;
                } else {
                    finalColor = FALLBACK_COLORS[province.Type as keyof typeof FALLBACK_COLORS] || FALLBACK_COLORS.Land;
                }

                // 2. Check neighbors for borders (Top and Right only)
                // This logic now runs for all provinces to determine if a pixel IS a border
                const neighbors = [ { nx: x, ny: y - 1 }, { nx: x + 1, ny: y } ];
                for (const { nx, ny } of neighbors) {
                    const { province: neighborProvince, owner: neighborOwner } = getProvinceInfo(nx, ny);
                    if (neighborProvince && neighborProvince.Id !== province.Id) {
                        // Only identify EXTERNAL borders during pre-rendering
                        if (!owner || !neighborOwner || owner.Id !== neighborOwner.Id) {
                             borderColor = BORDER_COLORS.External; // Different owners or one is null
                        }
                        // Internal borders (owner && neighborOwner && owner.Id === neighborOwner.Id) are skipped

                        // If an external border is found, no need to check further for this pixel
                        if (borderColor === BORDER_COLORS.External) {
                            break;
                        }
                    } else if (!neighborProvince && province) { // Check edge of map/data (counts as external)
                         borderColor = BORDER_COLORS.External;
                         break;
                     }
                }
            }

            // 3. Set pixel color
            let colorToApply = finalColor; // Default to the province's base color
            if (borderColor) {
                // If it's a border pixel, decide which border color to use
                // If it's an external border pixel, use the external border color.
                // Otherwise, use the base province color.
                // Selection highlighting is removed from pre-rendering.
                if (borderColor === BORDER_COLORS.External) {
                    colorToApply = BORDER_COLORS.External;
                }
                // If borderColor is null (not an external border), colorToApply remains finalColor
            }
            // If borderColor is null, colorToApply remains finalColor (the base province color)

            const colorParts = colorToApply.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

            if (colorParts) {
                finalPixels[index] = parseInt(colorParts[1], 10);
                finalPixels[index + 1] = parseInt(colorParts[2], 10);
                finalPixels[index + 2] = parseInt(colorParts[3], 10);
                finalPixels[index + 3] = colorParts[4] ? Math.floor(parseFloat(colorParts[4]) * 255) : 255;
            } else {
                // Fallback
                finalPixels[index] = 128; finalPixels[index + 1] = 128; finalPixels[index + 2] = 128; finalPixels[index + 3] = 255;
            }
        }
    }
    // --- End of pixel iteration logic ---

    // Create an ImageBitmap from the final processed data
    let isCancelled = false; // Flag to prevent setting state after cleanup

    // Create an ImageBitmap from the final processed data
    createImageBitmap(finalImageData).then(newBitmap => {
        if (isCancelled) {
            // If cleanup already ran (component unmounted or deps changed quickly),
            // just close the newly created bitmap as it won't be used.
            console.log("Pre-render cancelled, closing newly created bitmap.");
            newBitmap.close();
            return;
        }
        // Set the new bitmap state using functional update
        setPreRenderedMap(prevMap => {
            // Close the previous map *after* returning the new one for the state update.
            // Check prevMap exists and is not the same object identity as newBitmap
            // (though createImageBitmap should always return a new object).
            if (prevMap && prevMap !== newBitmap) {
                 console.log("Closing previous preRenderedMap instance.");
                 prevMap.close();
            }
            return newBitmap; // Return the new map to React state
        });
        console.log("Pre-rendering complete, new map set.");

    }).catch(err => {
        // Only log error if the effect instance wasn't cancelled
        if (!isCancelled) {
             console.error("Error creating ImageBitmap from final data:", err);
        }
        // Don't change state on error, keep the potentially existing old map
    });

    // Cleanup function for this specific effect execution
    return () => {
        console.log("Cleaning up pre-render effect instance (setting isCancelled=true)...");
        // Set the flag to prevent the .then() callback from setting state if it hasn't run yet,
        // or to signal that the generated bitmap should be closed if .then() runs after cleanup.
        isCancelled = true;
        // Note: We no longer close the *current* state's preRenderedMap here.
        // The functional update closes the *previous* map when a *new* one is set.
        // The effect below handles closing the *last remaining* map on unmount.
    };

    // Use props in dependency array
  }, [bitmap, provinces, countries, provinceMap, countryMap]); // Dependencies for pre-rendering

  // Effect specifically to close the preRenderedMap instance when it's replaced or on unmount
  useEffect(() => {
      // Store the current map instance in a variable accessible by the cleanup closure.
      // This captures the specific ImageBitmap instance associated with this effect run.
      const mapInstance = preRenderedMap;

      // Return a cleanup function. This cleanup runs when:
      // 1. The component unmounts.
      // 2. The `preRenderedMap` state changes *before* the component unmounts
      //    (i.e., when a new map replaces the `mapInstance`).
      return () => {
          // Only close if mapInstance holds a valid ImageBitmap and it hasn't been closed already.
          // Checking mapInstance ensures we close the *correct* instance associated with this effect's lifecycle.
          if (mapInstance) {
              console.log("Closing preRenderedMap instance via cleanup effect.");
              // Attempt to close. If already closed, this is usually a no-op or might warn.
              try {
                  mapInstance.close();
              } catch (e) {
                  // Catch potential errors if closing an already closed bitmap throws
                  console.warn("Attempted to close map instance that might already be closed:", e);
              }
          }
      };
  }, [preRenderedMap]); // This effect depends only on the preRenderedMap state itself


  // Effect to calculate contiguous province groups AND border pixels
  useEffect(() => {
    // Ensure all necessary data is loaded - use props
    if (!bitmap || !provinceMap.size || !countryMap.size || !provinces || !countries) {
        setCountryProvinceGroups([]); // Clear groups if data is missing
        setProvinceBorders(new Map()); // Clear borders if data is missing
        return;
    }

    console.log("Calculating province groups and borders...");

    // Need original pixel data to determine adjacency, province IDs, and borders
    if (!offscreenCanvasRef.current) {
        console.error("Offscreen canvas not ready for group calculation.");
        setCountryProvinceGroups([]);
        return;
    }
    // Ensure the offscreen canvas has the bitmap data drawn if it wasn't already
    // This might be redundant if the pre-render effect always runs first, but safer
    if (offscreenCanvasRef.current.width !== bitmap.width || offscreenCanvasRef.current.height !== bitmap.height) {
         offscreenCanvasRef.current.width = bitmap.width;
         offscreenCanvasRef.current.height = bitmap.height;
         const setupCtx = offscreenCanvasRef.current.getContext('2d');
         if (setupCtx) setupCtx.drawImage(bitmap, 0, 0);
         else {
             console.error("Failed to get context to draw initial bitmap for group calculation.");
             setCountryProvinceGroups([]);
             return;
         }
    }

    const offscreenCtx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
     if (!offscreenCtx) {
        console.error("Offscreen context not available for group calculation.");
        setCountryProvinceGroups([]);
        return;
    }

    let originalImageData: ImageData;
    try {
        // Get image data fresh each time in case it was modified elsewhere (unlikely here)
        originalImageData = offscreenCtx.getImageData(0, 0, bitmap.width, bitmap.height);
    } catch (e) {
        console.error("Error getting ImageData for group calculation:", e);
        setCountryProvinceGroups([]);
        return;
    }
    const originalPixels = originalImageData.data;
    const width = bitmap.width;
    const height = bitmap.height;

    // Helper to get province ID and owner ID directly from pixel coordinates
    const getPixelDetails = (x: number, y: number): { provinceId: string | null, ownerId: string | null } => {
        if (x < 0 || x >= width || y < 0 || y >= height) return { provinceId: null, ownerId: null };
        const index = (y * width + x) * 4;
        // Add a check for alpha or a specific "empty" color if necessary
        if (originalPixels[index + 3] < 250) return { provinceId: null, ownerId: null }; // Consider near-transparent as empty

        const r = originalPixels[index];
        const g = originalPixels[index + 1];
        const b = originalPixels[index + 2];
        const provinceId = rgbToId(r, g, b);
        const province = provinceMap.get(provinceId);
        return { provinceId, ownerId: province?.OwnerId ?? null };
    };


    const visitedPixels = new Set<string>(); // Store "x_y" strings for BFS
    const calculatedGroups: ProvinceGroup[] = [];
    const calculatedBorders = new Map<string, { x: number, y: number }[]>(); // Temporary map for borders

    // --- First Pass: Identify all border pixels ---
    console.log("Identifying border pixels...");
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const { provinceId: currentProvinceId } = getPixelDetails(x, y);
            if (!currentProvinceId) continue; // Skip empty pixels

            let isBorderPixel = false;
            // Check neighbors (4-directional)
            const neighbors = [
                { nx: x + 1, ny: y }, { nx: x - 1, ny: y },
                { nx: x, ny: y + 1 }, { nx: x, ny: y - 1 },
            ];

            for (const { nx, ny } of neighbors) {
                // Check bounds
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const { provinceId: neighborProvinceId } = getPixelDetails(nx, ny);
                    if (neighborProvinceId !== currentProvinceId) {
                        isBorderPixel = true;
                        break; // Found a border, no need to check other neighbors
                    }
                } else {
                    // Edge of the map is also a border
                    isBorderPixel = true;
                    break;
                }
            }

            if (isBorderPixel) {
                if (!calculatedBorders.has(currentProvinceId)) {
                    calculatedBorders.set(currentProvinceId, []);
                }
                calculatedBorders.get(currentProvinceId)!.push({ x, y });
            }
        }
    }
    console.log(`Identified border pixels for ${calculatedBorders.size} provinces.`);
    setProvinceBorders(calculatedBorders); // Set the state for borders

    // --- Second Pass: Calculate province groups using BFS (as before) ---
    console.log("Calculating province groups (BFS)...");
    // Reset visited set for BFS
    visitedPixels.clear();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelKey = `${x}_${y}`;
            if (visitedPixels.has(pixelKey)) continue;

            const { provinceId: startProvinceId, ownerId: startOwnerId } = getPixelDetails(x, y);

            visitedPixels.add(pixelKey); // Mark visited regardless of owner

            // Only start BFS if the pixel belongs to a province owned by a country
            if (!startProvinceId || !startOwnerId) {
                continue;
            }

            // --- Start BFS for a new potential group ---
            const currentGroupProvinces = new Set<string>();
            let minX = x, minY = y, maxX = x, maxY = y;
            const queue: { x: number; y: number }[] = [{ x, y }];
            // Starting pixel is already marked visited

            while (queue.length > 0) {
                const { x: currentX, y: currentY } = queue.shift()!;

                // Get details for the current pixel (should match startOwnerId)
                const { provinceId: currentProvinceId } = getPixelDetails(currentX, currentY);
                 if (!currentProvinceId) continue; // Should not happen based on initial check

                // Add province to the group set (if not already added)
                currentGroupProvinces.add(currentProvinceId);

                // Update bounds
                minX = Math.min(minX, currentX);
                minY = Math.min(minY, currentY);
                maxX = Math.max(maxX, currentX);
                maxY = Math.max(maxY, currentY);

                // Check neighbors (4-directional)
                const neighbors = [
                    { nx: currentX + 1, ny: currentY }, { nx: currentX - 1, ny: currentY },
                    { nx: currentX, ny: currentY + 1 }, { nx: currentX, ny: currentY - 1 },
                ];

                for (const { nx, ny } of neighbors) {
                    const neighborKey = `${nx}_${ny}`;

                    // Check bounds and if already visited
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visitedPixels.has(neighborKey)) {
                         const { ownerId: neighborOwnerId } = getPixelDetails(nx, ny);
                         visitedPixels.add(neighborKey); // Mark neighbor visited

                         // If neighbor belongs to the same owner, add to queue
                         if (neighborOwnerId === startOwnerId) {
                             queue.push({ x: nx, y: ny });
                         }
                    }
                }
            }
            // --- End BFS ---

            // Store the completed group
            if (currentGroupProvinces.size > 0) {
                calculatedGroups.push({
                    countryId: startOwnerId, // Owner ID is known from the start
                    provinceIds: currentGroupProvinces,
                    bounds: { minX, minY, maxX, maxY },
                });
            }
        }
    }

    setCountryProvinceGroups(calculatedGroups); // Set the state for groups
    console.log(`Calculated ${calculatedGroups.length} province groups.`);
    // Use props in dependency array
}, [bitmap, provinces, countries, provinceMap, countryMap]); // Dependencies for group and border calculation

// Effect for smooth zoom and position animation
useEffect(() => {
  // Skip animation if everything is already at target values
  if (
    mapPosition.scale === mapPosition.targetScale &&
    mapPosition.x === mapPosition.targetX &&
    mapPosition.y === mapPosition.targetY
  ) {
    return;
  }

  const animateMapPosition = () => {
    // Animation speed factor (adjust for faster/slower animation)
    const smoothingFactor = 0.15;

    // Calculate the differences between current and target values
    const scaleDiff = mapPosition.targetScale - mapPosition.scale;
    const xDiff = mapPosition.targetX - mapPosition.x;
    const yDiff = mapPosition.targetY - mapPosition.y;

    // Check if we're close enough to all targets to stop animating
    const isCloseEnough =
      Math.abs(scaleDiff) < 0.001 &&
      Math.abs(xDiff) < 0.5 &&
      Math.abs(yDiff) < 0.5;

    if (isCloseEnough) {
      // Set exact target values and stop animation
      updateMapPosition({
        scale: mapPosition.targetScale,
        x: mapPosition.targetX,
        y: mapPosition.targetY
      });
      zoomAnimationFrameId.current = null;
      return;
    }

    // Calculate the new values by moving a percentage of the way to the targets
    const newScale = mapPosition.scale + scaleDiff * smoothingFactor;
    const newX = mapPosition.x + xDiff * smoothingFactor;
    const newY = mapPosition.y + yDiff * smoothingFactor;

    // Update all values
    updateMapPosition({
      scale: newScale,
      x: newX,
      y: newY
    });

    // Continue the animation
    zoomAnimationFrameId.current = requestAnimationFrame(animateMapPosition);
  };

  // Start the animation if not already running
  if (zoomAnimationFrameId.current === null) {
    zoomAnimationFrameId.current = requestAnimationFrame(animateMapPosition);
  }

  // Cleanup function
  return () => {
    if (zoomAnimationFrameId.current !== null) {
      cancelAnimationFrame(zoomAnimationFrameId.current);
      zoomAnimationFrameId.current = null;
    }
  };
}, [
  mapPosition.scale, mapPosition.targetScale,
  mapPosition.x, mapPosition.targetX,
  mapPosition.y, mapPosition.targetY,
  updateMapPosition
]);



  // Effect for drawing the map using requestAnimationFrame
  useEffect(() => {
    const draw = () => {
        // Add provinceBorders check
        if (!canvasRef.current || !preRenderedMap || !bitmap || !provinceMap.size || !countryMap.size || !provinceBorders.size) {
            animationFrameId.current = null;
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            animationFrameId.current = null;
            return;
        }

        const scale = mapPosition.scale;
        const invScale = 1 / scale; // For line widths, etc.

        // --- Calculate dynamic alphas based on zoom ---
        // Country names: Fade out (more transparent) as scale increases (zoom in)
        const nameMinScale = 0.3;
        const nameMaxScale = 3.0;
        const nameAlpha = Math.max(0, Math.min(1, Math.pow(1 - (scale - nameMinScale) / (nameMaxScale - nameMinScale), 0.7)));

        // Internal borders: Fade IN (more opaque) as scale increases (zoom in), matching name fade-out range
        const maxBorderAlpha = 0.4;
        const borderAlpha = Math.max(0, Math.min(maxBorderAlpha, (scale - nameMinScale) / (nameMaxScale - nameMinScale) * maxBorderAlpha));


        // --- Start Drawing ---
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply transform
        ctx.save();
        ctx.translate(mapPosition.x, mapPosition.y);
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = false; // Keep pixels crisp

        // 1. Draw the pre-rendered map (colors + external borders)
        try {
            ctx.drawImage(preRenderedMap, 0, 0);
        } catch (e) {
            console.error("Error drawing pre-rendered map:", e);
        }

        // --- Draw Dynamic Elements ---

        // 2. Draw Internal Borders (if visible) using pre-calculated data
        if (borderAlpha > 0) {
            const internalColorMatch = BORDER_COLORS.Internal.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (internalColorMatch) {
                const r = internalColorMatch[1];
                const g = internalColorMatch[2];
                const b = internalColorMatch[3];
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${borderAlpha})`; // Use calculated alpha

                // Iterate through all provinces that have borders calculated
                for (const [provinceId, borders] of provinceBorders.entries()) {
                    const province = provinceMap.get(provinceId);
                    // Only draw internal borders for provinces that BELONG to a country
                    if (province && province.OwnerId) {
                        // SIMPLIFICATION: Draw *all* borders for owned provinces with the internal style/alpha.
                        // External borders (already drawn on preRenderedMap) will be overdrawn, but that's acceptable for performance.
                        for (const { x, y } of borders) {
                            ctx.fillRect(x, y, 1, 1); // Draw the border pixel
                        }
                    }
                }
            }
        }

        // 3. Draw Selected Province Borders (always fully opaque) using pre-calculated data
        if (selectedProvince) {
            const borders = provinceBorders.get(selectedProvince.Id);
            if (borders) {
                ctx.fillStyle = BORDER_COLORS.Selected; // Use selected color
                for (const { x, y } of borders) {
                    ctx.fillRect(x, y, 1, 1); // Draw the border pixel
                }
            }
        }

        // 4. Draw Armies
        if (gameState && gameState.Armies) { // Check if Armies array exists
            // --- Add Logging Here ---
            console.log(`Rendering ${gameState.Armies.length} armies.`);
            // --- End Logging ---

            if (gameState.Armies.length > 0) { // Only proceed if there are armies
                const armyRadius = 3 * invScale; // Adjust size based on zoom

                for (const army of gameState.Armies) {
                    const provinceId = army.province_id; // Reverted back to lowercase 'p'
                    const borders = provinceBorders.get(provinceId);

                if (borders && borders.length > 0) {
                    // Calculate center by averaging border points
                    let sumX = 0;
                    let sumY = 0;
                    for (const p of borders) { sumX += p.x; sumY += p.y; }
                    const centerX = sumX / borders.length;
                    const centerY = sumY / borders.length;

                    // Style based on selection and ownership
                    const isSelected = army.id === selectedArmyId;
                    const isPlayerOwned = army.country_id === playerCountryId;

                    ctx.beginPath();
                    ctx.arc(centerX, centerY, armyRadius, 0, 2 * Math.PI);

                    // Fill color
                    ctx.fillStyle = isPlayerOwned ? 'rgba(0, 0, 150, 0.8)' : 'rgba(150, 0, 0, 0.8)'; // Blue for player, Red for others
                    ctx.fill();

                    // Border color for selection
                    if (isSelected) {
                        ctx.strokeStyle = 'rgba(255, 255, 0, 1)'; // Yellow border if selected
                        ctx.lineWidth = 1.5 * invScale; // Make border visible
                        ctx.stroke();
                    }
                } else {
                     // Optional: Log if borders aren't found for an army's province
                     // console.warn(`Could not find borders for province ${provinceId} to draw army ${army.id}`);
                }
            }
        }
    } // <-- Add missing closing brace for outer if (line 751)


        // 5. Draw Country Names (if visible) - No changes needed here
        if (nameAlpha > 0 && countryProvinceGroups.length > 0) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Basic text color - consider contrast with country colors later
            ctx.fillStyle = `rgba(255, 255, 255, ${nameAlpha * 0.9})`; // White with alpha, increased from 0.8
            ctx.strokeStyle = `rgba(0, 0, 0, ${nameAlpha})`; // Black outline with full nameAlpha
            ctx.lineWidth = 2 * invScale; // Thin outline

            for (const group of countryProvinceGroups) {
                const country = countryMap.get(group.countryId);
                if (!country || !country.Name) continue; // Skip if no country or name

                const bounds = group.bounds;
                const groupWidth = bounds.maxX - bounds.minX + 1;
                const groupHeight = bounds.maxY - bounds.minY + 1;
                const centerX = bounds.minX + groupWidth / 2;
                const centerY = bounds.minY + groupHeight / 2;

                // Simple max font size calculation (adjust multiplier as needed)
                // Target roughly 80% of the group width
                const targetWidth = groupWidth * 0.8;
                let fontSize = Math.min(groupHeight * 0.8, 30); // Start with height limit or max size
                ctx.font = `bold ${fontSize}px sans-serif`;
                let textMetrics = ctx.measureText(country.Name);

                // Reduce font size until it fits the width
                while (textMetrics.width > targetWidth && fontSize > 5) {
                    fontSize -= 1;
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    textMetrics = ctx.measureText(country.Name);
                }

                // Only draw if font size is reasonable
                if (fontSize > 5) {
                    ctx.strokeText(country.Name, centerX, centerY);
                    ctx.fillText(country.Name, centerX, centerY);
                }
            }
        }


        // --- End Drawing Dynamic Elements ---

        // Restore transform
        ctx.restore();

        // Reset animation frame ID as drawing is complete for this frame
        animationFrameId.current = null;
    };

    // Request animation frame if one isn't already pending
    if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(draw);
    }

    // Cleanup function for the drawing effect
    return () => {
        // Cancel any pending animation frame when dependencies change or component unmounts
        if (animationFrameId.current !== null) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }

        // Also cancel any zoom animation frame
        if (zoomAnimationFrameId.current !== null) {
            cancelAnimationFrame(zoomAnimationFrameId.current);
            zoomAnimationFrameId.current = null;
        }
    };
    // Added selectedArmyId to dependencies to redraw selection highlight
  }, [preRenderedMap, mapPosition, countryProvinceGroups, countryMap, selectedProvince, provinceBorders, gameState, playerCountryId, selectedArmyId]); // Use gameState directly as dependency

  // Handle mouse events for pan and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging if clicking on the context menu
    if (contextMenu && (e.target as HTMLElement).closest('#context-menu-div')) {
        return;
    }
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    updateMapPosition({
      targetX: mapPosition.targetX + dx,
      targetY: mapPosition.targetY + dy
    });

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // handleWheel function removed as it's now defined inside the useEffect

  // Remove the duplicate wheel event listener - we're now handling it in the effect above

  // --- Helper Function: Calculate Distance (BFS) ---
  const calculateDistance = useCallback((startId: string, targetId: string): number => {
      if (!provinceMap.size || startId === targetId) return 0;

      const queue: { id: string; distance: number }[] = [{ id: startId, distance: 0 }];
      const visited = new Set<string>([startId]);

      while (queue.length > 0) {
          const { id: currentId, distance: currentDistance } = queue.shift()!;

          if (currentId === targetId) {
              return currentDistance;
          }

          // Check distance limit
          if (currentDistance >= 5) { // Optimization: Stop searching if distance exceeds 5
              continue;
          }

          const currentProvince = provinceMap.get(currentId);
          if (currentProvince?.AdjacentProvinceIds) {
              for (const neighborId of currentProvince.AdjacentProvinceIds) {
                  // Basic check: ensure neighborId exists in provinceMap before adding
                  if (provinceMap.has(neighborId) && !visited.has(neighborId)) {
                      visited.add(neighborId);
                      queue.push({ id: neighborId, distance: currentDistance + 1 });
                  }
              }
          }
      }

      return Infinity; // Target not reachable within 5 steps or at all
  }, [provinceMap]); // Dependency: provinceMap

  // --- Event Handlers ---

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click handling if clicking on the context menu itself
    if ((e.target as HTMLElement).closest('#context-menu-div')) {
        return;
    }

    // Close context menu on any left click outside the menu
    if (contextMenu) {
        setContextMenu(null);
    }

    // Check props and state
    if (!canvasRef.current || !bitmap || !provinceMap.size || !countryMap.size || !gameState || !gameState.Armies || !playerCountryId) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Convert click coordinates to bitmap coordinates
    const clickXBitmap = (e.clientX - rect.left - mapPosition.x) / mapPosition.scale;
    const clickYBitmap = (e.clientY - rect.top - mapPosition.y) / mapPosition.scale;

    // --- Check for Army Click ---
    const armyClickRadiusBitmap = 5; // Click radius in bitmap pixels (adjust as needed)
    let clickedArmy: Army | null = null;

    // Iterate armies in reverse draw order (or consider z-index if implemented)
    // For now, simple iteration is fine.
    for (const army of gameState.Armies) {
        const borders = provinceBorders.get(army.province_id);
        if (borders && borders.length > 0) {
            // Calculate center (same logic as rendering)
            let sumX = 0;
            let sumY = 0;
            for (const p of borders) { sumX += p.x; sumY += p.y; }
            const centerX = sumX / borders.length;
            const centerY = sumY / borders.length;

            // Check distance from click to army center
            const dx = clickXBitmap - centerX;
            const dy = clickYBitmap - centerY;
            const distanceSq = dx * dx + dy * dy;

            // Use a slightly larger radius for clicking than for drawing if needed
            if (distanceSq <= armyClickRadiusBitmap * armyClickRadiusBitmap) {
                clickedArmy = army;
                break; // Found the clicked army
            }
        }
    }

    if (clickedArmy) {
        // Clicked on an army
        const armyOwner = countryMap.get(clickedArmy.country_id);
        // Check if the clicked army belongs to the current player
        if (armyOwner && armyOwner.Id === playerCountryId) {
             // Player owns this army, select it
             setSelectedArmyId(clickedArmy.id);
             selectProvince(null); // Deselect province when selecting army
             console.log("Selected player army:", clickedArmy.id);
             // Return ONLY if we successfully selected a player-owned army
             return;
        } else {
            // Clicked on an enemy/neutral army, deselect player's army/province
            setSelectedArmyId(null);
            selectProvince(null);
            console.log("Clicked non-player army, deselecting.");
            // DO NOT return here - allow province selection underneath non-player armies
        }
        // If we clicked a non-player army, we fall through to province selection
    }

    // --- If not clicking an army (or clicking a non-player army), proceed with Province Click ---
    setSelectedArmyId(null); // Deselect army if clicking elsewhere

    // Get color from the *original* bitmap to identify province
    if (!offscreenCanvasRef.current) return;
    const offscreenCtx = offscreenCanvasRef.current.getContext('2d');
    if (!offscreenCtx) return;

    try {
        const pixelData = offscreenCtx.getImageData(Math.floor(clickXBitmap), Math.floor(clickYBitmap), 1, 1).data;
        const r = pixelData[0];
        const g = pixelData[1];
        const b = pixelData[2];
        const provinceId = rgbToId(r, g, b);
        const province = provinceMap.get(provinceId); // Use the map for lookup

        if (province) {
          selectProvince(province);
        } else {
          selectProvince(null); // Deselect if clicking non-province area
        }
    } catch (e) {
         console.error("Error getting pixel data on click (tainted canvas?):", e);
         selectProvince(null); // Deselect on error
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu(null); // Close any existing menu first

      // Ensure playerCountryId is checked
      if (!selectedArmyId || !canvasRef.current || !bitmap || !provinceMap.size || !gameState || !gameState.Armies || !playerCountryId) {
          return; // Need a selected army and map data
      }

      const selectedArmy = gameState.Armies.find(a => a.id === selectedArmyId);
      if (!selectedArmy) {
          setSelectedArmyId(null); // Army disappeared? Deselect.
          return;
      }

      // Check if the selected army belongs to the player
      if (selectedArmy.country_id !== playerCountryId) {
          console.log("Cannot issue orders to non-player army.");
          setSelectedArmyId(null); // Deselect if somehow a non-player army was selected
          return;
      }

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      // Convert click coordinates to bitmap coordinates
      const clickXBitmap = (e.clientX - rect.left - mapPosition.x) / mapPosition.scale;
      const clickYBitmap = (e.clientY - rect.top - mapPosition.y) / mapPosition.scale;

      // Find clicked province ID
      if (!offscreenCanvasRef.current) return;
      const offscreenCtx = offscreenCanvasRef.current.getContext('2d');
      if (!offscreenCtx) return;

      let targetProvinceId: string | null = null;
      try {
          const pixelData = offscreenCtx.getImageData(Math.floor(clickXBitmap), Math.floor(clickYBitmap), 1, 1).data;
          const r = pixelData[0];
          const g = pixelData[1];
          const b = pixelData[2];
          const provinceId = rgbToId(r, g, b);
          if (provinceMap.has(provinceId)) {
              targetProvinceId = provinceId;
          }
      } catch (err) {
          console.error("Error getting pixel data on context menu:", err);
          return; // Don't show menu if we can't identify province
      }

      if (!targetProvinceId) {
          return; // Clicked outside a valid province
      }

      // Calculate distance
      const distance = calculateDistance(selectedArmy.province_id, targetProvinceId);

      // Determine if move is possible
      const canMove = distance <= 5 && selectedArmy.moves_remaining > 0;

      console.log(`Context menu: Army ${selectedArmyId} to ${targetProvinceId}. Distance: ${distance}, Moves left: ${selectedArmy.moves_remaining}, Can move: ${canMove}`);

      // Set context menu state
      setContextMenu({
          x: e.clientX, // Use screen coordinates for positioning
          y: e.clientY,
          targetProvinceId: targetProvinceId,
          canMove: canMove,
      });
  };

  const handleMoveClick = () => {
    if (contextMenu && contextMenu.canMove && selectedArmyId && sendGameAction) { // Check if sendGameAction is available
      const payload = {
        armyId: selectedArmyId,
        targetProvinceId: contextMenu.targetProvinceId,
      };
      console.log(`Sending MOVE_ARMY action:`, payload); // Log before sending
      sendGameAction('MOVE_ARMY', payload);
    } else {
      console.error("Cannot handle move click: missing context, army selection, or sendGameAction function.");
    }
    setContextMenu(null); // Close menu after click regardless of success/failure to send
  };

  // Removed the old useEffect that called renderMap directly

  return (
    <> {/* Use Fragment to return multiple elements */}
      <canvas
        ref={canvasRef}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', display: 'block' /* Prevents extra space below */ }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Use same handler for mouse leave
        onClick={handleClick}
        onContextMenu={handleContextMenu} // Add context menu handler
        // onWheel removed; handled by manual event listener for passive: false
      />
      {/* Context Menu */}
      {contextMenu && (
        <div
          id="context-menu-div" // Add ID for click/drag checks
          style={{
            position: 'absolute',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: 'white',
            border: '1px solid black',
            padding: '5px',
            zIndex: 1000, // Ensure it's above the canvas
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
            cursor: 'default', // Reset cursor for the menu itself
          }}
        >
          <button
            onClick={handleMoveClick}
            disabled={!contextMenu.canMove}
            style={{
              display: 'block',
              width: '100%',
              border: 'none',
              background: contextMenu.canMove ? '#e0e0e0' : '#f0f0f0',
              color: contextMenu.canMove ? 'black' : 'grey',
              padding: '4px 8px',
              textAlign: 'left',
              cursor: contextMenu.canMove ? 'pointer' : 'not-allowed',
            }}
          >
            Move Here
          </button>
          {/* Add other context menu options here later if needed */}
        </div>
      )}
    </>
  );
};

// Wrap the component with React.memo for performance optimization
// Custom comparison function for React.memo
const areMapPropsEqual = (prevProps: GameMapProps, nextProps: GameMapProps): boolean => {
  // Check if array lengths are different. If so, props are not equal.
  if (prevProps.provinces.length !== nextProps.provinces.length ||
      prevProps.countries.length !== nextProps.countries.length) {
    console.log("GameMap re-rendering due to array length change.");
    return false;
  }

  // Add more specific checks if needed, e.g., comparing specific elements or properties.
  // For now, if lengths are the same, assume props are equal to avoid expensive deep comparison.
  // console.log("GameMap skipping re-render (array lengths identical).");
  return true; // Assume equal if lengths match
};

// Wrap the component with React.memo and the custom comparison function
export const GameMap = memo(GameMapComponent, areMapPropsEqual);