import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { Province } from '../types/game';

interface CanvasSize {
  width: number;
  height: number;
}

export const GameMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const {
    gameState,
    mapPosition,
    updateMapPosition,
    selectProvince,
  } = useGame();

  // Load the bitmap image
  useEffect(() => {
    const loadBitmap = async () => {
      try {
        const response = await fetch('/assets/bitmap.png');
        const blob = await response.blob();
        const image = await createImageBitmap(blob);
        setBitmap(image);
        setCanvasSize({
          width: image.width,
          height: image.height
        });
      } catch (error) {
        console.error('Failed to load bitmap:', error);
      }
    };

    loadBitmap();
  }, []);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        renderMap();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [bitmap, gameState, mapPosition]);

  // Render the map
  const renderMap = useCallback(() => {
    if (!canvasRef.current || !bitmap) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform for pan and zoom
    ctx.save();
    ctx.translate(mapPosition.x, mapPosition.y);
    ctx.scale(mapPosition.scale, mapPosition.scale);

    // Draw bitmap
    ctx.drawImage(bitmap, 0, 0);

    // Draw province colors
    if (gameState) {
      gameState.Provinces.forEach((province) => {
        if (province.OwnerId) {
          const country = gameState.Countries.find(c => c.Id === province.OwnerId);
          if (country) {
            const [r, g, b] = province.Id.split('_').map(Number);
            ctx.fillStyle = `rgba(${country.Color}, 0.5)`;
            ctx.fillRect(r, g, 1, 1);
          }
        }
      });
    }

    ctx.restore();
  }, [bitmap, gameState, mapPosition]);

  // Handle mouse events for pan and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    updateMapPosition({
      x: mapPosition.x + dx,
      y: mapPosition.y + dy
    });

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = mapPosition.scale * scaleFactor;

    // Limit zoom range
    if (newScale < 0.1 || newScale > 10) return;

    // Calculate zoom center
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Update position to zoom towards mouse
    const newX = mouseX - (mouseX - mapPosition.x) * scaleFactor;
    const newY = mouseY - (mouseY - mapPosition.y) * scaleFactor;

    updateMapPosition({
      x: newX,
      y: newY,
      scale: newScale
    });
  };

  // Handle province selection
  const handleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !bitmap || !gameState) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Convert click coordinates to bitmap coordinates
    const x = (e.clientX - rect.left - mapPosition.x) / mapPosition.scale;
    const y = (e.clientY - rect.top - mapPosition.y) / mapPosition.scale;

    // Find clicked province
    const provinceId = `${Math.floor(x)}_${Math.floor(y)}_0`;
    const province = gameState.Provinces.find(p => p.Id === provinceId);
    
    if (province) {
      selectProvince(province);
    }
  };

  useEffect(() => {
    renderMap();
  }, [renderMap]);

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onWheel={handleWheel}
    />
  );
};