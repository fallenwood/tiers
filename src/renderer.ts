import { RELATIONSHIP_SYMBOLS } from './types';
import type { Node, Connection } from './types';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;
  }

  clear(): void {
    // Reset transform for background
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply scale and offset
    this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    
    // Draw grid in world coordinates
    this.ctx.strokeStyle = '#2a2a4e';
    this.ctx.lineWidth = 1 / this.scale;
    const gridSize = 30;
    
    // Calculate visible world bounds
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
    
    const startX = Math.floor(topLeft.x / gridSize) * gridSize;
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize;
    const startY = Math.floor(topLeft.y / gridSize) * gridSize;
    const endY = Math.ceil(bottomRight.y / gridSize) * gridSize;
    
    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, topLeft.y);
      this.ctx.lineTo(x, bottomRight.y);
      this.ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(topLeft.x, y);
      this.ctx.lineTo(bottomRight.x, y);
      this.ctx.stroke();
    }
  }

  drawNode(node: Node, isSelected: boolean = false, isConnecting: boolean = false): void {
    const { x, y, width, height, label, color, imageUrl } = node;

    // Shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;

    // Node background
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 8);
    this.ctx.fill();

    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Selection border
    if (isSelected) {
      this.ctx.strokeStyle = '#00ff88';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.roundRect(x - 2, y - 2, width + 4, height + 4, 10);
      this.ctx.stroke();
    }

    // Connecting indicator
    if (isConnecting) {
      this.ctx.strokeStyle = '#ffaa00';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.roundRect(x - 4, y - 4, width + 8, height + 8, 12);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw image if present
    if (imageUrl) {
      const imageSize = 64;
      const imageX = x + (width - imageSize) / 2;
      const imageY = y + 8;

      // Check if image is in cache
      let img = this.imageCache.get(imageUrl);
      if (!img) {
        // Create and cache the image
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        this.imageCache.set(imageUrl, img);
        
        // Redraw when image loads
        img.onload = () => {
          this.drawImageInNode(img!, imageX, imageY, imageSize);
        };
      } else if (img.complete && img.naturalHeight !== 0) {
        // Image is already loaded
        this.drawImageInNode(img, imageX, imageY, imageSize);
      }

      // Node label below image (multiline with max 3 lines)
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      const textY = y + imageY + imageSize + 8;
      const maxWidth = width - 16;
      this.drawMultilineText(label, x + width / 2, textY, maxWidth, 3);
    } else {
      // Node label centered (no image, multiline with max 3 lines)
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const maxWidth = width - 16;
      this.drawMultilineText(label, x + width / 2, y + height / 2, maxWidth, 3, true);
    }

    // Connection points (circles on the sides)
    this.drawConnectionPoint(x, y + height / 2); // Left
    this.drawConnectionPoint(x + width, y + height / 2); // Right
    this.drawConnectionPoint(x + width / 2, y); // Top
    this.drawConnectionPoint(x + width / 2, y + height); // Bottom
  }

  private drawMultilineText(text: string, x: number, y: number, maxWidth: number, maxLines: number, centered: boolean = false): void {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Word wrap
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    // Truncate to max lines with ellipsis
    const displayLines = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      displayLines[maxLines - 1] = displayLines[maxLines - 1] + '...';
    }

    // Draw lines
    const lineHeight = 14;
    const totalHeight = displayLines.length * lineHeight;
    const startY = centered ? y - totalHeight / 2 + lineHeight / 2 : y;

    displayLines.forEach((line, index) => {
      this.ctx.fillText(line, x, startY + index * lineHeight, maxWidth);
    });
  }

  private drawImageInNode(img: HTMLImageElement, x: number, y: number, size: number): void {
    this.ctx.save();
    
    // Clip to rounded rectangle
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, size, size, 6);
    this.ctx.clip();
    
    // Draw image
    this.ctx.drawImage(img, x, y, size, size);
    
    this.ctx.restore();
    
    // Optional: draw border around image
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, size, size, 6);
    this.ctx.stroke();
  }

  private drawConnectionPoint(x: number, y: number): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  drawConnection(
    fromNode: Node,
    toNode: Node,
    connection: Connection,
    isSelected: boolean = false
  ): void {
    const fromCenter = {
      x: fromNode.x + fromNode.width / 2,
      y: fromNode.y + fromNode.height / 2,
    };
    const toCenter = {
      x: toNode.x + toNode.width / 2,
      y: toNode.y + toNode.height / 2,
    };

    // Calculate edge points
    const fromPoint = this.getEdgePoint(fromNode, toCenter);
    const toPoint = this.getEdgePoint(toNode, fromCenter);

    // Draw curved line
    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;
    const controlOffset = 50;

    // Calculate perpendicular offset for curve
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;

    const controlX = midX + nx * controlOffset * 0.3;
    const controlY = midY + ny * controlOffset * 0.3;

    this.ctx.strokeStyle = isSelected ? '#00ff88' : '#6c5ce7';
    this.ctx.lineWidth = isSelected ? 4 : 3;
    this.ctx.beginPath();
    this.ctx.moveTo(fromPoint.x, fromPoint.y);
    this.ctx.quadraticCurveTo(controlX, controlY, toPoint.x, toPoint.y);
    this.ctx.stroke();

    // Draw arrow
    this.drawArrow(controlX, controlY, toPoint.x, toPoint.y, isSelected ? '#00ff88' : '#6c5ce7');

    // Draw relationship label
    const symbol = RELATIONSHIP_SYMBOLS[connection.relationship];
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.beginPath();
    this.ctx.arc(midX, midY, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = isSelected ? '#00ff88' : '#6c5ce7';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(symbol, midX, midY);
  }

  private getEdgePoint(node: Node, target: { x: number; y: number }): { x: number; y: number } {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;

    const dx = target.x - centerX;
    const dy = target.y - centerY;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const halfWidth = node.width / 2;
    const halfHeight = node.height / 2;

    if (absDx * halfHeight > absDy * halfWidth) {
      // Intersect with left or right edge
      const sign = dx > 0 ? 1 : -1;
      return {
        x: centerX + sign * halfWidth,
        y: centerY + (dy * halfWidth) / absDx,
      };
    } else {
      // Intersect with top or bottom edge
      const sign = dy > 0 ? 1 : -1;
      return {
        x: centerX + (dx * halfHeight) / absDy,
        y: centerY + sign * halfHeight,
      };
    }
  }

  private drawArrow(fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    const headLength = 12;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawConnectionPreview(fromNode: Node, mouseX: number, mouseY: number): void {
    const fromPoint = this.getEdgePoint(fromNode, { x: mouseX, y: mouseY });

    this.ctx.strokeStyle = '#ffaa00';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(fromPoint.x, fromPoint.y);
    this.ctx.lineTo(mouseX, mouseY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setScale(newScale: number, centerX: number, centerY: number): void {
    // Calculate world position before scaling
    const worldX = (centerX - this.offsetX) / this.scale;
    const worldY = (centerY - this.offsetY) / this.scale;
    
    // Update scale
    this.scale = Math.max(0.1, Math.min(5, newScale));
    
    // Calculate new offset to keep the same world position under cursor
    this.offsetX = centerX - worldX * this.scale;
    this.offsetY = centerY - worldY * this.scale;
  }

  getScale(): number {
    return this.scale;
  }

  pan(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.scale + this.offsetX,
      y: worldY * this.scale + this.offsetY,
    };
  }
}
