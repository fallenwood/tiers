import { RelationshipType } from './types';
import type { Node, Connection, GraphState } from './types';
import { CanvasRenderer } from './renderer';
import { saveState, loadState, clearState } from './storage';

const NODE_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
  '#f39c12',
  '#1abc9c',
  '#e91e63',
  '#00bcd4',
];

export class NodeGraphEditor {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private nodes: Node[] = [];
  private toolbarNodes: Node[] = [];
  private connections: Connection[] = [];
  private selectedNode: Node | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private mousePos = { x: 0, y: 0 };
  private nodeCounter = 0;
  private selectedConnection: Connection | null = null;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  public onStateChange: (() => void) | null = null;
  public onToolbarChange: (() => void) | null = null;
  public onValidationChange: ((result: { valid: boolean; errors: string[] }) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);
    this.setupEventListeners();
    this.loadFromStorage();
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.resizeCanvas();
    });
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 600;
      this.renderer.resize(width, height);
      this.render();
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private getMousePosition(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;
    return this.renderer.screenToWorld(screenX, screenY);
  }

  private handleMouseDown(e: MouseEvent): void {
    // Only process left mouse button clicks
    if (e.button !== 0) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;

    const { x, y } = this.getMousePosition(e);

    const clickedNode = this.getNodeAtPosition(x, y);

    // Check if clicking on a connection
    const clickedConnection = this.getConnectionAtPosition(x, y);
    if (clickedConnection && !clickedNode) {
      this.selectedConnection = clickedConnection;
      this.selectedNode = null;
      this.render();
      return;
    }

    if (clickedNode) {
      // Don't allow connections for nodes in toolbar
      if (clickedNode.isInToolbar) {
        return;
      }

      // If a node is already selected and shift+clicking another node
      if (e.shiftKey && this.selectedNode && this.selectedNode.id !== clickedNode.id) {
        // Create connection from selected node to clicked node
        this.showConnectionDialog(this.selectedNode, clickedNode);
        this.render();
        return;
      }

      // Normal click on a node - select it and prepare for dragging
      this.selectedNode = clickedNode;
      this.selectedConnection = null;
      this.isDragging = true;
      this.dragOffset = {
        x: x - clickedNode.x,
        y: y - clickedNode.y,
      };
    } else {
      // Clicked on empty canvas - start panning with left click
      this.selectedNode = null;
      this.selectedConnection = null;
      this.isPanning = true;
      this.panStart = { x: screenX, y: screenY };
      this.canvas.style.cursor = 'grabbing';
    }
    this.render();
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;
    
    if (this.isPanning) {
      const dx = screenX - this.panStart.x;
      const dy = screenY - this.panStart.y;
      this.renderer.pan(dx, dy);
      this.panStart = { x: screenX, y: screenY };
      this.render();
      return;
    }
    
    const { x, y } = this.getMousePosition(e);
    this.mousePos.x = x;
    this.mousePos.y = y;

    if (this.isDragging && this.selectedNode) {
      this.selectedNode.x = this.mousePos.x - this.dragOffset.x;
      this.selectedNode.y = this.mousePos.y - this.dragOffset.y;
      
      this.render();
    }
  }

  private handleMouseUp(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }
    if (this.isDragging) {
      this.isDragging = false;
      this.saveToStorage();
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    const { x, y } = this.getMousePosition(e);

    const clickedNode = this.getNodeAtPosition(x, y);

    if (clickedNode) {
      // Rename node
      const newLabel = prompt('Enter new label:', clickedNode.label);
      if (newLabel !== null && newLabel.trim() !== '') {
        clickedNode.label = newLabel.trim();
        this.saveToStorage();
        this.render();
      }
    } else {
      // Create new node at position
      this.addNode(x - 60, y - 25);
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const { x, y } = this.getMousePosition(e);

    const clickedNode = this.getNodeAtPosition(x, y);
    if (clickedNode && !clickedNode.isInToolbar) {
      const action = confirm(`Move "${clickedNode.label}" back to library?\nClick Cancel to keep it on canvas.`);
      if (action) {
        this.moveNodeToToolbar(clickedNode);
      }
      return;
    }

    const clickedConnection = this.getConnectionAtPosition(x, y);
    if (clickedConnection && !clickedNode) {
      if (confirm('Delete this connection?')) {
        this.deleteConnection(clickedConnection.id);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedNode) {
        // Move node back to toolbar instead of deleting
        this.moveNodeToToolbar(this.selectedNode);
      } else if (this.selectedConnection) {
        this.deleteConnection(this.selectedConnection.id);
      }
    } else if (e.key === 'Escape') {
      this.selectedNode = null;
      this.selectedConnection = null;
      this.render();
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const currentScale = this.renderer.getScale();
    const newScale = currentScale * zoomFactor;
    
    this.renderer.setScale(newScale, mouseX, mouseY);
    this.render();
  }

  private getNodeAtPosition(x: number, y: number): Node | null {
    // Check in reverse order (top-most first)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (
        x >= node.x &&
        x <= node.x + node.width &&
        y >= node.y &&
        y <= node.y + node.height
      ) {
        return node;
      }
    }
    return null;
  }

  private getConnectionAtPosition(x: number, y: number): Connection | null {
    for (const connection of this.connections) {
      const fromNode = this.nodes.find((n) => n.id === connection.fromNodeId);
      const toNode = this.nodes.find((n) => n.id === connection.toNodeId);
      if (!fromNode || !toNode) continue;

      // Check if click is near the midpoint (where the relationship symbol is)
      const midX = (fromNode.x + fromNode.width / 2 + toNode.x + toNode.width / 2) / 2;
      const midY = (fromNode.y + fromNode.height / 2 + toNode.y + toNode.height / 2) / 2;
      
      const distance = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2);
      if (distance < 20) {
        return connection;
      }
    }
    return null;
  }

  private async showConnectionDialog(fromNode: Node, toNode: Node): Promise<void> {
    console.log('showConnectionDialog called from:', fromNode.label, 'to:', toNode.label);
    const existingConnection = this.connections.find(
      (c) =>
        (c.fromNodeId === fromNode.id && c.toNodeId === toNode.id) ||
        (c.fromNodeId === toNode.id && c.toNodeId === fromNode.id)
    );

    if (existingConnection) {
      console.log('Existing connection found, showing selector');
      // Show dialog to change relationship
      await this.showRelationshipSelector(existingConnection);
    } else {
      console.log('No existing connection, prompting for relationship');
      // Create new connection with dialog
      const relationship = await this.promptRelationship();
      console.log('User selected relationship:', relationship);
      if (relationship) {
        this.addConnection(fromNode.id, toNode.id, relationship);
      } else {
        console.log('No relationship selected (user cancelled)');
      }
    }
  }

  private promptRelationship(): Promise<RelationshipType | null> {
    console.log('promptRelationship called');
    return new Promise((resolve) => {
      const modal = document.getElementById('relationshipModal');
      if (!modal) {
        console.error('Modal not found');
        resolve(null);
        return;
      }

      modal.classList.remove('hidden');
      modal.classList.add('flex');

      const handleSelection = (e: Event) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.rel-option') as HTMLButtonElement;
        if (button) {
          const type = button.dataset.type as RelationshipType;
          console.log('Selected relationship:', type);
          cleanup();
          resolve(type);
        }
      };

      const handleCancel = () => {
        console.log('Cancelled relationship selection');
        cleanup();
        resolve(null);
      };

      const cleanup = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.removeEventListener('click', handleSelection);
        const cancelBtn = document.getElementById('cancelRelationship');
        cancelBtn?.removeEventListener('click', handleCancel);
      };

      modal.addEventListener('click', handleSelection);
      const cancelBtn = document.getElementById('cancelRelationship');
      cancelBtn?.addEventListener('click', handleCancel);
    });
  }

  private async showRelationshipSelector(connection: Connection): Promise<void> {
    const relationship = await this.promptRelationship();
    if (relationship) {
      connection.relationship = relationship;
      this.saveToStorage();
      this.render();
    }
  }

  addNode(x?: number, y?: number): Node {
    this.nodeCounter++;
    const node: Node = {
      id: `node-${Date.now()}-${this.nodeCounter}`,
      x: x ?? 100 + (this.nodes.length % 5) * 150,
      y: y ?? 100 + Math.floor(this.nodes.length / 5) * 100,
      width: 120,
      height: 50,
      label: `Node ${this.nodeCounter}`,
      color: NODE_COLORS[(this.nodeCounter - 1) % NODE_COLORS.length],
    };
    this.nodes.push(node);
    this.saveToStorage();
    this.render();
    return node;
  }

  async loadFromFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      const fileName = file.name.toLowerCase();
      let items: Array<{ label: string; imageUrl?: string }> = [];

      if (fileName.endsWith('.json')) {
        // Parse JSON file
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          // Extract text and image from each element
          items = data.map(item => {
            if (typeof item === 'string') {
              return { label: item };
            } else if (typeof item === 'object' && item !== null) {
              // Try common properties for text and image
              const label = item.text || item.label || item.name || item.value || JSON.stringify(item);
              const imageUrl = item.image || item.imageUrl || item.img || item.picture || item.thumbnail || item.url;
              return { label, imageUrl };
            }
            return { label: String(item) };
          });
        } else {
          throw new Error('JSON file must contain an array');
        }
      } else {
        // Parse as text file - each line is a node
        items = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => ({ label: line }));
      }

      // Create toolbar nodes from items
      this.toolbarNodes = [];
      items.forEach((item) => {
        this.nodeCounter++;
        const hasImage = !!item.imageUrl;
        const node: Node = {
          id: `toolbar-${Date.now()}-${this.nodeCounter}`,
          x: 0,
          y: 0,
          width: 120,
          height: hasImage ? 120 : 50,
          label: item.label,
          color: NODE_COLORS[(this.nodeCounter - 1) % NODE_COLORS.length],
          isInToolbar: true,
          imageUrl: item.imageUrl,
        };
        this.toolbarNodes.push(node);
      });

      this.saveToStorage();
      this.onToolbarChange?.();
      this.render();

      console.log(`Loaded ${items.length} nodes to toolbar from ${file.name}`);
    } catch (error) {
      console.error('Error loading file:', error);
      alert(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  deleteNode(nodeId: string): void {
    const nodeToDelete = this.nodes.find(n => n.id === nodeId);
    
    this.nodes = this.nodes.filter((n) => n.id !== nodeId);
    this.connections = this.connections.filter(
      (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
    );
    this.selectedNode = null;
    
    // Add node back to toolbar
    if (nodeToDelete) {
      const toolbarNode: Node = {
        ...nodeToDelete,
        id: `toolbar-${Date.now()}-${++this.nodeCounter}`,
        x: 0,
        y: 0,
        isInToolbar: true,
      };
      this.toolbarNodes.push(toolbarNode);
      this.onToolbarChange?.();
    }
    
    this.saveToStorage();
    this.render();
  }

  moveNodeToCanvas(toolbarNode: Node, x: number, y: number): void {
    // Create a copy of the toolbar node for the canvas
    const canvasNode: Node = {
      ...toolbarNode,
      id: `node-${Date.now()}-${++this.nodeCounter}`,
      x: x - toolbarNode.width / 2,
      y: y - toolbarNode.height / 2,
      isInToolbar: false,
    };
    this.nodes.push(canvasNode);
    
    // Remove from toolbar
    this.toolbarNodes = this.toolbarNodes.filter(n => n.id !== toolbarNode.id);
    this.onToolbarChange?.();
    this.saveToStorage();
    this.render();
  }

  moveNodeToToolbar(canvasNode: Node): void {
    // Remove from canvas
    this.nodes = this.nodes.filter(n => n.id !== canvasNode.id);
    
    // Remove any connections to this node
    this.connections = this.connections.filter(
      c => c.fromNodeId !== canvasNode.id && c.toNodeId !== canvasNode.id
    );
    
    // Add to toolbar
    const toolbarNode: Node = {
      ...canvasNode,
      id: `toolbar-${Date.now()}-${++this.nodeCounter}`,
      x: 0,
      y: 0,
      isInToolbar: true,
    };
    this.toolbarNodes.push(toolbarNode);
    this.onToolbarChange?.();
    
    this.selectedNode = null;
    this.saveToStorage();
    this.render();
  }

  getToolbarNodes(): Node[] {
    return this.toolbarNodes;
  }

  addConnection(
    fromNodeId: string,
    toNodeId: string,
    relationship: RelationshipType
  ): Connection {
    const connection: Connection = {
      id: `conn-${Date.now()}`,
      fromNodeId,
      toNodeId,
      relationship,
    };
    this.connections.push(connection);
    this.saveToStorage();
    this.render();
    return connection;
  }

  deleteConnection(connectionId: string): void {
    this.connections = this.connections.filter((c) => c.id !== connectionId);
    this.selectedConnection = null;
    this.saveToStorage();
    this.render();
  }

  private saveToStorage(): void {
    const state: GraphState = {
      nodes: this.nodes,
      connections: this.connections,
      toolbarNodes: this.toolbarNodes,
    };
    saveState(state);
    this.onStateChange?.();
    
    // Trigger real-time validation
    const validationResult = this.validate();
    this.onValidationChange?.(validationResult);
  }

  private loadFromStorage(): void {
    const state = loadState();
    if (state) {
      this.nodes = state.nodes;
      this.connections = state.connections;
      this.toolbarNodes = state.toolbarNodes || [];
      // Calculate node counter from existing nodes
      this.nodeCounter = this.nodes.length + this.toolbarNodes.length;
      this.onToolbarChange?.();
      
      // Trigger initial validation
      const validationResult = this.validate();
      this.onValidationChange?.(validationResult);
    }
  }

  getConnectionsInfo(): Array<{ fromLabel: string; toLabel: string; symbol: string }> {
    return this.connections.map((conn) => {
      const fromNode = this.nodes.find((n) => n.id === conn.fromNodeId);
      const toNode = this.nodes.find((n) => n.id === conn.toNodeId);
      const symbols: Record<string, string> = {
        equals: '=',
        greater: '>',
        greater_or_equals: '≥',
        less: '<',
        less_or_equals: '≤',
      };
      return {
        fromLabel: fromNode?.label || 'Unknown',
        toLabel: toNode?.label || 'Unknown',
        symbol: symbols[conn.relationship] || '?',
      };
    });
  }

  areNodesConnected(nodeId1: string, nodeId2: string): boolean {
    return this.connections.some(
      (c) =>
        (c.fromNodeId === nodeId1 && c.toNodeId === nodeId2) ||
        (c.fromNodeId === nodeId2 && c.toNodeId === nodeId1)
    );
  }

  clearAll(): void {
    if (confirm('Are you sure you want to clear all nodes and connections?')) {
      // Move all canvas nodes back to toolbar
      this.nodes.forEach(node => {
        if (!node.isInToolbar) {
          node.isInToolbar = true;
          this.toolbarNodes.push(node);
        }
      });
      
      this.nodes = [];
      this.connections = [];
      this.selectedNode = null;
      this.selectedConnection = null;
      clearState();
      this.saveToStorage();
      this.onStateChange?.();
      this.onToolbarChange?.();
      this.render();
    }
  }

  clearToolbar(): void {
    this.toolbarNodes = [];
    this.saveToStorage();
    this.onToolbarChange?.();
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check 1: All nodes are connected (graph connectivity)
    if (this.nodes.length > 1) {
      if (!this.isGraphConnected()) {
        errors.push('Not all nodes are connected. Every node must be reachable from every other node.');
      }
    }

    // Check 2: No contradictory cycles with strict inequalities
    const cycleError = this.checkForContradictoryCycles();
    if (cycleError) {
      errors.push(cycleError);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isGraphConnected(): boolean {
    if (this.nodes.length === 0) return true;

    // Build adjacency list (treat connections as undirected for connectivity check)
    const adjacency = new Map<string, Set<string>>();
    this.nodes.forEach(node => adjacency.set(node.id, new Set()));

    this.connections.forEach(conn => {
      adjacency.get(conn.fromNodeId)?.add(conn.toNodeId);
      adjacency.get(conn.toNodeId)?.add(conn.fromNodeId);
    });

    // BFS from first node
    const visited = new Set<string>();
    const queue = [this.nodes[0].id];
    visited.add(this.nodes[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) || new Set();
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return visited.size === this.nodes.length;
  }

  private checkForContradictoryCycles(): string | null {
    // Build directed adjacency list including both strict and non-strict inequalities
    const strictEdges = new Map<string, string[]>();
    const nonStrictEdges = new Map<string, string[]>();
    
    this.nodes.forEach(node => {
      strictEdges.set(node.id, []);
      nonStrictEdges.set(node.id, []);
    });

    this.connections.forEach(conn => {
      const { fromNodeId, toNodeId, relationship } = conn;
      
      if (relationship === RelationshipType.LESS) {
        // fromNode < toNode
        strictEdges.get(fromNodeId)?.push(toNodeId);
      } else if (relationship === RelationshipType.GREATER) {
        // fromNode > toNode means toNode < fromNode
        strictEdges.get(toNodeId)?.push(fromNodeId);
      } else if (relationship === RelationshipType.LESS_OR_EQUALS) {
        // fromNode <= toNode
        nonStrictEdges.get(fromNodeId)?.push(toNodeId);
      } else if (relationship === RelationshipType.GREATER_OR_EQUALS) {
        // fromNode >= toNode means toNode <= fromNode
        nonStrictEdges.get(toNodeId)?.push(fromNodeId);
      } else if (relationship === RelationshipType.EQUALS) {
        // Both directions for equality
        nonStrictEdges.get(fromNodeId)?.push(toNodeId);
        nonStrictEdges.get(toNodeId)?.push(fromNodeId);
      }
    });

    // Check for cycles that include at least one strict edge
    // Using DFS with path tracking
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    const pathNodes: string[] = [];
    const pathHasStrict: boolean[] = [];
    
    this.nodes.forEach(node => color.set(node.id, WHITE));

    const dfs = (nodeId: string, hasStrictInPath: boolean): string | null => {
      color.set(nodeId, GRAY);
      pathNodes.push(nodeId);
      pathHasStrict.push(hasStrictInPath);

      // Check strict edges
      const strictNeighbors = strictEdges.get(nodeId) || [];
      for (const neighbor of strictNeighbors) {
        const neighborColor = color.get(neighbor);
        
        if (neighborColor === GRAY) {
          // Found a cycle with at least one strict edge
          const cycleStart = pathNodes.indexOf(neighbor);
          const cyclePath = pathNodes.slice(cycleStart);
          cyclePath.push(neighbor);
          const nodeLabels = cyclePath.map(id => this.nodes.find(n => n.id === id)?.label || 'Unknown');
          return `Contradictory cycle detected: ${nodeLabels.join(' ≤ ')} (with at least one strict < or >). This creates a logical impossibility.`;
        } else if (neighborColor === WHITE) {
          const result = dfs(neighbor, true); // Strict edge, so path has strict
          if (result) return result;
        }
      }

      // Check non-strict edges
      const nonStrictNeighbors = nonStrictEdges.get(nodeId) || [];
      for (const neighbor of nonStrictNeighbors) {
        const neighborColor = color.get(neighbor);
        
        if (neighborColor === GRAY) {
          // Found a cycle - check if any edge in the path was strict
          const cycleStart = pathNodes.indexOf(neighbor);
          if (pathHasStrict.slice(cycleStart).some(v => v)) {
            const cyclePath = pathNodes.slice(cycleStart);
            cyclePath.push(neighbor);
            const nodeLabels = cyclePath.map(id => this.nodes.find(n => n.id === id)?.label || 'Unknown');
            return `Contradictory cycle detected: ${nodeLabels.join(' ≤ ')} (with at least one strict < or >). This creates a logical impossibility.`;
          }
          // If no strict edges in cycle, it's valid (all nodes can be equal)
        } else if (neighborColor === WHITE) {
          const result = dfs(neighbor, hasStrictInPath); // Propagate strict status
          if (result) return result;
        }
      }

      color.set(nodeId, BLACK);
      pathNodes.pop();
      pathHasStrict.pop();
      return null;
    };

    for (const node of this.nodes) {
      if (color.get(node.id) === WHITE) {
        const error = dfs(node.id, false);
        if (error) return error;
      }
    }

    return null;
  }

  generateRanking(): { success: boolean; ranks?: string[][]; error?: string } {
    if (this.nodes.length === 0) {
      return { success: false, error: 'No nodes to rank' };
    }

    // Validate first
    const validation = this.validate();
    if (!validation.valid) {
      return { success: false, error: 'Graph must be valid before generating ranking. Fix validation errors first.' };
    }

    // Build directed graph based on relationships
    // For ranking: A > B means A is ranked higher (larger)
    const greaterThan = new Map<string, Set<string>>(); // A > B: A has higher rank
    const equalTo = new Map<string, Set<string>>(); // A = B: same rank
    
    this.nodes.forEach(node => {
      greaterThan.set(node.id, new Set());
      equalTo.set(node.id, new Set());
    });

    // Process connections
    this.connections.forEach(conn => {
      const { fromNodeId, toNodeId, relationship } = conn;
      
      if (relationship === RelationshipType.GREATER) {
        // from > to: from is ranked higher
        greaterThan.get(fromNodeId)?.add(toNodeId);
      } else if (relationship === RelationshipType.LESS) {
        // from < to: to is ranked higher
        greaterThan.get(toNodeId)?.add(fromNodeId);
      } else if (relationship === RelationshipType.GREATER_OR_EQUALS) {
        // from >= to: from is ranked higher or equal
        greaterThan.get(fromNodeId)?.add(toNodeId);
        equalTo.get(fromNodeId)?.add(toNodeId);
      } else if (relationship === RelationshipType.LESS_OR_EQUALS) {
        // from <= to: to is ranked higher or equal
        greaterThan.get(toNodeId)?.add(fromNodeId);
        equalTo.get(toNodeId)?.add(fromNodeId);
      } else if (relationship === RelationshipType.EQUALS) {
        // from = to: same rank
        equalTo.get(fromNodeId)?.add(toNodeId);
        equalTo.get(toNodeId)?.add(fromNodeId);
      }
    });

    // Find strongly connected components (nodes that must be at same rank)
    const sccs = this.findStronglyConnectedComponents(equalTo);
    
    // Build condensed graph where each SCC is a single node
    const sccGraph = new Map<number, Set<number>>();
    const nodeToScc = new Map<string, number>();
    
    sccs.forEach((scc, index) => {
      sccGraph.set(index, new Set());
      scc.forEach(nodeId => nodeToScc.set(nodeId, index));
    });

    // Add edges between SCCs based on greater-than relationships
    this.nodes.forEach(node => {
      const sccId = nodeToScc.get(node.id)!;
      greaterThan.get(node.id)?.forEach(targetId => {
        const targetSccId = nodeToScc.get(targetId)!;
        if (sccId !== targetSccId) {
          sccGraph.get(sccId)?.add(targetSccId);
        }
      });
    });

    // Topological sort on condensed graph (Kahn's algorithm)
    const inDegree = new Map<number, number>();
    sccGraph.forEach((_, sccId) => inDegree.set(sccId, 0));
    
    sccGraph.forEach((targets) => {
      targets.forEach(targetId => {
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
      });
    });

    const ranks: string[][] = [];
    const queue: number[] = [];
    
    // Start with SCCs that have no incoming edges (highest rank)
    inDegree.forEach((degree, sccId) => {
      if (degree === 0) queue.push(sccId);
    });

    while (queue.length > 0) {
      // Process all nodes at current level
      const currentLevel: number[] = [...queue];
      queue.length = 0;

      // Convert SCC IDs to node labels
      const levelLabels: string[] = [];
      currentLevel.forEach(sccId => {
        sccs[sccId].forEach(nodeId => {
          const node = this.nodes.find(n => n.id === nodeId);
          if (node) levelLabels.push(node.label);
        });
      });

      ranks.push(levelLabels);

      // Reduce in-degree for neighbors
      currentLevel.forEach(sccId => {
        sccGraph.get(sccId)?.forEach(targetId => {
          const newDegree = (inDegree.get(targetId) || 0) - 1;
          inDegree.set(targetId, newDegree);
          if (newDegree === 0) {
            queue.push(targetId);
          }
        });
      });
    }

    return { success: true, ranks };
  }

  private findStronglyConnectedComponents(equalGraph: Map<string, Set<string>>): string[][] {
    // Tarjan's algorithm for finding SCCs
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Map<string, boolean>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let currentIndex = 0;

    const strongConnect = (nodeId: string) => {
      index.set(nodeId, currentIndex);
      lowlink.set(nodeId, currentIndex);
      currentIndex++;
      stack.push(nodeId);
      onStack.set(nodeId, true);

      // Consider successors
      equalGraph.get(nodeId)?.forEach(neighborId => {
        if (!index.has(neighborId)) {
          strongConnect(neighborId);
          lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, lowlink.get(neighborId)!));
        } else if (onStack.get(neighborId)) {
          lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, index.get(neighborId)!));
        }
      });

      // If nodeId is a root node, pop the stack and create an SCC
      if (lowlink.get(nodeId) === index.get(nodeId)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.set(w, false);
          scc.push(w);
        } while (w !== nodeId);
        sccs.push(scc);
      }
    };

    this.nodes.forEach(node => {
      if (!index.has(node.id)) {
        strongConnect(node.id);
      }
    });

    return sccs;
  }

  render(): void {
    this.renderer.clear();

    // Draw connections first (below nodes)
    for (const connection of this.connections) {
      const fromNode = this.nodes.find((n) => n.id === connection.fromNodeId);
      const toNode = this.nodes.find((n) => n.id === connection.toNodeId);
      if (fromNode && toNode) {
        this.renderer.drawConnection(
          fromNode,
          toNode,
          connection,
          this.selectedConnection?.id === connection.id
        );
      }
    }

    // Draw nodes
    for (const node of this.nodes) {
      this.renderer.drawNode(
        node,
        this.selectedNode?.id === node.id,
        false
      );
    }

    // Update status bar
    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    const statusBar = document.getElementById('statusBar');
    if (!statusBar) return;

    if (this.selectedNode) {
      statusBar.textContent = `Selected: "${this.selectedNode.label}" - Shift+Click another node to create connection`;
      statusBar.classList.remove('hidden');
      statusBar.classList.add('flex');
    } else {
      statusBar.classList.add('hidden');
      statusBar.classList.remove('flex');
    }
  }
}
