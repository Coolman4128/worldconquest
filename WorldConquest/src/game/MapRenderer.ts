// Map Renderer
// Handles rendering the game map on the canvas

import { Province, ProvinceType } from '../models/Province';
import { Country } from '../models/Country';
import { Army } from '../models/Army';

export class MapRenderer {
    // Canvas and rendering context
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    // Map image
    private mapImage: HTMLImageElement | null = null;
    private mapData: ImageData | null = null;
    
    // Viewport state
    private viewportX: number = 0;
    private viewportY: number = 0;
    private zoomLevel: number = 1;
    private isDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    
    // Province data
    private provinces: Map<string, Province> = new Map();
    private countries: Map<string, Country> = new Map();
    
    // Selected province
    private selectedProvinceId: string | null = null;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get canvas context');
        }
        this.ctx = context;
        
        // Load the map image
        this.loadMapImage();
        
        // Set up event listeners
        this.setupEventListeners();
        this.setupMapControls();
    }
    
    // Load the map image
    private async loadMapImage(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.mapImage = new Image();
            this.mapImage.onload = () => {
                console.log('Map image loaded successfully');
                resolve();
            };
            this.mapImage.onerror = (error) => {
                console.error('Failed to load map image:', error);
                reject(error);
            };
            this.mapImage.src = '/assets/bitmap.png';
        });
    }
    
    // Set up event listeners for map interaction
    private setupEventListeners(): void {
        // Mouse wheel for zooming
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            
            // Calculate zoom center (mouse position)
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Calculate world coordinates before zoom
            const worldX = (mouseX / this.zoomLevel) + this.viewportX;
            const worldY = (mouseY / this.zoomLevel) + this.viewportY;
            
            // Adjust zoom level
            const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
            this.zoomLevel *= zoomDelta;
            
            // Clamp zoom level
            this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel));
            
            // Calculate new viewport position to keep mouse position fixed
            this.viewportX = worldX - (mouseX / this.zoomLevel);
            this.viewportY = worldY - (mouseY / this.zoomLevel);
            
            // Render the map
            this.render();
        });
        
        // Mouse down for dragging
        this.canvas.addEventListener('mousedown', (event) => {
            if (event.button === 0 || event.button === 1) { // Left or middle button
                this.isDragging = true;
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        // Mouse move for dragging
        window.addEventListener('mousemove', (event) => {
            if (this.isDragging) {
                const deltaX = event.clientX - this.lastMouseX;
                const deltaY = event.clientY - this.lastMouseY;
                
                this.viewportX -= deltaX / this.zoomLevel;
                this.viewportY -= deltaY / this.zoomLevel;
                
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
                
                this.render();
            }
            
            // Handle mouse at edge of screen for panning
            const rect = this.canvas.getBoundingClientRect();
            const edgeSize = 20;
            
            if (event.clientX >= rect.left && event.clientX <= rect.right &&
                event.clientY >= rect.top && event.clientY <= rect.bottom) {
                
                const isAtLeftEdge = event.clientX - rect.left < edgeSize;
                const isAtRightEdge = rect.right - event.clientX < edgeSize;
                const isAtTopEdge = event.clientY - rect.top < edgeSize;
                const isAtBottomEdge = rect.bottom - event.clientY < edgeSize;
                
                if (isAtLeftEdge || isAtRightEdge || isAtTopEdge || isAtBottomEdge) {
                    // Only pan if not dragging
                    if (!this.isDragging) {
                        const panSpeed = 5 / this.zoomLevel;
                        
                        if (isAtLeftEdge) this.viewportX -= panSpeed;
                        if (isAtRightEdge) this.viewportX += panSpeed;
                        if (isAtTopEdge) this.viewportY -= panSpeed;
                        if (isAtBottomEdge) this.viewportY += panSpeed;
                        
                        this.render();
                    }
                }
            }
        });
        
        // Mouse up to end dragging
        window.addEventListener('mouseup', (event) => {
            if (event.button === 0 || event.button === 1) { // Left or middle button
                this.isDragging = false;
                this.canvas.style.cursor = 'default';
            }
        });
        
        // Click to select province
        this.canvas.addEventListener('click', (event) => {
            if (this.mapData) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                
                // Convert to world coordinates
                const worldX = Math.floor((mouseX / this.zoomLevel) + this.viewportX);
                const worldY = Math.floor((mouseY / this.zoomLevel) + this.viewportY);
                
                // Check if within map bounds
                if (this.mapImage && 
                    worldX >= 0 && worldX < this.mapImage.width && 
                    worldY >= 0 && worldY < this.mapImage.height) {
                    
                    // Get the pixel color at the clicked position
                    const index = (worldY * this.mapImage.width + worldX) * 4;
                    const r = this.mapData.data[index];
                    const g = this.mapData.data[index + 1];
                    const b = this.mapData.data[index + 2];
                    
                    // Create province ID from RGB values
                    const provinceId = `${r}_${g}_${b}`;
                    
                    // Set as selected province
                    this.selectedProvinceId = provinceId;
                    
                    // Trigger province selection event
                    this.onProvinceSelected(provinceId);
                    
                    // Render the map
                    this.render();
                }
            }
        });
        
        // Keyboard controls for panning
        window.addEventListener('keydown', (event) => {
            const panSpeed = 10 / this.zoomLevel;
            
            switch (event.key) {
                case 'w':
                case 'ArrowUp':
                    this.viewportY -= panSpeed;
                    break;
                case 's':
                case 'ArrowDown':
                    this.viewportY += panSpeed;
                    break;
                case 'a':
                case 'ArrowLeft':
                    this.viewportX -= panSpeed;
                    break;
                case 'd':
                case 'ArrowRight':
                    this.viewportX += panSpeed;
                    break;
            }
            
            this.render();
        });
    }
    
    // Set up map control buttons
    private setupMapControls(): void {
        // Zoom in button
        const zoomInBtn = document.getElementById('zoom-in-btn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                // Zoom in centered on the middle of the viewport
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                // Calculate world coordinates before zoom
                const worldX = (centerX / this.zoomLevel) + this.viewportX;
                const worldY = (centerY / this.zoomLevel) + this.viewportY;
                
                // Adjust zoom level
                this.zoomLevel *= 1.2;
                
                // Clamp zoom level
                this.zoomLevel = Math.min(3, this.zoomLevel);
                
                // Calculate new viewport position to keep center fixed
                this.viewportX = worldX - (centerX / this.zoomLevel);
                this.viewportY = worldY - (centerY / this.zoomLevel);
                
                this.render();
            });
        }
        
        // Zoom out button
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                // Zoom out centered on the middle of the viewport
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                // Calculate world coordinates before zoom
                const worldX = (centerX / this.zoomLevel) + this.viewportX;
                const worldY = (centerY / this.zoomLevel) + this.viewportY;
                
                // Adjust zoom level
                this.zoomLevel *= 0.8;
                
                // Clamp zoom level
                this.zoomLevel = Math.max(0.5, this.zoomLevel);
                
                // Calculate new viewport position to keep center fixed
                this.viewportX = worldX - (centerX / this.zoomLevel);
                this.viewportY = worldY - (centerY / this.zoomLevel);
                
                this.render();
            });
        }
        
        // Reset view button
        const resetViewBtn = document.getElementById('reset-view-btn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                // Reset zoom and position
                this.zoomLevel = 1;
                this.viewportX = 0;
                this.viewportY = 0;
                
                this.render();
            });
        }
    }
    
    // Set the game data
    setGameData(provinces: Map<string, Province>, countries: Map<string, Country>): void {
        this.provinces = provinces;
        this.countries = countries;
        this.render();
    }
    
    // Render the map
    render(): void {
        if (!this.ctx || !this.mapImage) return;
        
        // Clear the canvas
        this.ctx.fillStyle = '#a5d6a7';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context state
        this.ctx.save();
        
        // Apply zoom and pan transformations
        this.ctx.translate(-this.viewportX * this.zoomLevel, -this.viewportY * this.zoomLevel);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        // Draw the map image
        this.ctx.drawImage(this.mapImage, 0, 0);
        
        // Get the map data for province detection
        if (!this.mapData && this.mapImage.complete) {
            // Create a temporary canvas to get the image data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.mapImage.width;
            tempCanvas.height = this.mapImage.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
                tempCtx.drawImage(this.mapImage, 0, 0);
                this.mapData = tempCtx.getImageData(0, 0, this.mapImage.width, this.mapImage.height);
            }
        }
        
        // Draw province borders
        this.drawProvinceBorders();
        
        // Draw country names when zoomed out
        if (this.zoomLevel < 1.5) {
            this.drawCountryNames();
        }
        
        // Draw armies
        this.drawArmies();
        
        // Highlight selected province
        if (this.selectedProvinceId) {
            this.highlightProvince(this.selectedProvinceId);
        }
        
        // Restore context state
        this.ctx.restore();
        
        // Draw UI elements that should not be affected by zoom/pan
        this.drawUI();
    }
    
    // Draw province borders
    private drawProvinceBorders(): void {
        // This is a placeholder for now
        // In a real implementation, we would need to detect province edges
        // This would require analyzing the bitmap to find edges between different colors
    }
    
    // Draw country names
    private drawCountryNames(): void {
        if (!this.ctx) return;
        
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.lineWidth = 3;
        
        // For each country, calculate center position and draw name
        this.countries.forEach(country => {
            // Find all provinces owned by this country
            const ownedProvinces = Array.from(this.provinces.values())
                .filter(province => province.ownerId === country.id);
            
            if (ownedProvinces.length > 0) {
                // Calculate center of owned provinces (this is simplified)
                // In a real implementation, we would need to know the actual positions
                // of provinces on the map
                
                // For now, just use a placeholder position
                const x = Math.random() * this.canvas.width / this.zoomLevel;
                const y = Math.random() * this.canvas.height / this.zoomLevel;
                
                // Draw country name with outline for visibility
                this.ctx.strokeStyle = 'black';
                this.ctx.strokeText(country.name, x, y);
                this.ctx.fillStyle = country.color;
                this.ctx.fillText(country.name, x, y);
            }
        });
    }
    
    // Draw armies on the map
    private drawArmies(): void {
        if (!this.ctx) return;
        
        // For each province, draw armies stationed there
        this.provinces.forEach(province => {
            if (province.armies.length > 0) {
                // In a real implementation, we would need to know the actual position
                // of the province on the map
                
                // For now, just use a placeholder
                // This would be replaced with actual province center coordinates
                const x = Math.random() * this.canvas.width / this.zoomLevel;
                const y = Math.random() * this.canvas.height / this.zoomLevel;
                
                // Draw army icon
                this.ctx.fillStyle = 'black';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw army size
                this.ctx.font = '12px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(province.armies.length.toString(), x, y + 4);
            }
        });
    }
    
    // Highlight a selected province
    private highlightProvince(provinceId: string): void {
        // This is a placeholder
        // In a real implementation, we would need to highlight the actual province
        // This would require knowing the province boundaries
    }
    
    // Draw UI elements
    private drawUI(): void {
        if (!this.ctx) return;
        
        // Draw zoom level indicator
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Zoom: ${this.zoomLevel.toFixed(1)}x`, 10, 20);
        
        // Draw selected province info
        if (this.selectedProvinceId) {
            const province = this.provinces.get(this.selectedProvinceId);
            if (province) {
                this.ctx.fillText(`Selected: ${province.name}`, 10, 40);
                
                if (province.ownerId) {
                    const country = this.countries.get(province.ownerId);
                    if (country) {
                        this.ctx.fillText(`Owner: ${country.name}`, 10, 60);
                    }
                } else {
                    this.ctx.fillText('Owner: None', 10, 60);
                }
                
                this.ctx.fillText(`Level: ${province.level}`, 10, 80);
                this.ctx.fillText(`Income: ${province.income}`, 10, 100);
            }
        }
    }
    
    // Handle province selection
    private onProvinceSelected(provinceId: string): void {
        console.log(`Province selected: ${provinceId}`);
        
        // Get the province
        const province = this.provinces.get(provinceId);
        if (province) {
            console.log(`Province name: ${province.name}`);
            
            // Trigger a custom event
            const event = new CustomEvent('provinceSelected', { detail: province });
            this.canvas.dispatchEvent(event);
        }
    }
    
    // Resize the canvas
    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        this.render();
    }
}