import './style.css';
import { NodeGraphEditor } from './editor';

console.log('Main.ts loaded');

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="flex flex-col h-screen bg-base-300">
    <header class="flex justify-between items-center px-8 py-4 bg-gradient-to-r from-base-100 to-base-200 border-b border-base-content/10 shadow-lg">
      <h1 class="text-2xl font-semibold text-base-content">Node Graph Editor</h1>
      <div class="flex gap-3">
        <button id="loadFileBtn" class="btn btn-primary btn-sm gap-2">
          <span class="text-lg">📁</span> Load from File
        </button>
        <button id="generateRankingBtn" class="btn btn-accent btn-sm gap-2">
          <span class="text-lg">📊</span> Generate Ranking
        </button>
        <button id="validateBtn" class="btn btn-secondary btn-sm gap-2">
          <span class="text-lg">✓</span> Validate
        </button>
        <button id="clearBtn" class="btn btn-error btn-sm gap-2">
          <span class="text-lg">🗑</span> Clear All
        </button>
      </div>
      <input type="file" id="fileInput" accept=".txt,.json" class="hidden">
    </header>
    <main class="flex flex-1 overflow-hidden">
      <div class="w-52 p-4 bg-gradient-to-b from-base-100 to-base-200 border-r border-base-content/10 overflow-y-auto flex flex-col">
        <div class="flex justify-between items-center mb-4 pb-2 border-b border-base-content/20">
          <h3 class="text-sm font-semibold text-primary">Node Library</h3>
          <button id="clearLibraryBtn" class="text-xs px-2 py-1 bg-error/20 hover:bg-error/30 text-error rounded transition-colors" title="Clear Library">✕</button>
        </div>
        <div id="toolbarNodes" class="flex flex-col gap-2"></div>
      </div>
      <div class="flex-1 relative overflow-hidden min-h-0">
        <canvas id="graphCanvas"></canvas>
        <div id="statusBar" class="hidden absolute bottom-0 left-0 right-0 px-4 py-3 bg-base-100/95 border-t border-base-content/10 text-base-content text-sm text-center"></div>
        <div id="relationshipModal" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div class="bg-gradient-to-b from-base-100 to-base-200 p-8 rounded-xl shadow-2xl max-w-md w-11/12">
            <h3 class="text-xl font-semibold text-base-content mb-6 text-center">Select Relationship Type</h3>
            <div class="grid grid-cols-2 gap-4 mb-6">
              <button class="rel-option flex flex-col items-center gap-2 p-4 bg-base-300 border-2 border-transparent rounded-lg cursor-pointer transition-all hover:bg-base-300/70 hover:border-primary hover:-translate-y-0.5" data-type="equals">
                <span class="text-3xl font-semibold text-base-content">=</span>
                <span class="text-sm text-base-content/70">Equals</span>
              </button>
              <button class="rel-option flex flex-col items-center gap-2 p-4 bg-base-300 border-2 border-transparent rounded-lg cursor-pointer transition-all hover:bg-base-300/70 hover:border-primary hover:-translate-y-0.5" data-type="greater">
                <span class="text-3xl font-semibold text-base-content">&gt;</span>
                <span class="text-sm text-base-content/70">Greater</span>
              </button>
              <button class="rel-option flex flex-col items-center gap-2 p-4 bg-base-300 border-2 border-transparent rounded-lg cursor-pointer transition-all hover:bg-base-300/70 hover:border-primary hover:-translate-y-0.5" data-type="greater_or_equals">
                <span class="text-3xl font-semibold text-base-content">≥</span>
                <span class="text-sm text-base-content/70">Greater or Equals</span>
              </button>
              <button class="rel-option flex flex-col items-center gap-2 p-4 bg-base-300 border-2 border-transparent rounded-lg cursor-pointer transition-all hover:bg-base-300/70 hover:border-primary hover:-translate-y-0.5" data-type="less">
                <span class="text-3xl font-semibold text-base-content">&lt;</span>
                <span class="text-sm text-base-content/70">Less</span>
              </button>
              <button class="rel-option flex flex-col items-center gap-2 p-4 bg-base-300 border-2 border-transparent rounded-lg cursor-pointer transition-all hover:bg-base-300/70 hover:border-primary hover:-translate-y-0.5" data-type="less_or_equals">
                <span class="text-3xl font-semibold text-base-content">≤</span>
                <span class="text-sm text-base-content/70">Less or Equals</span>
              </button>
            </div>
            <button id="cancelRelationship" class="btn btn-error w-full">Cancel</button>
          </div>
        </div>
        <div id="rankingModal" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div class=\"p-8 rounded-xl shadow-2xl max-w-2xl w-11/12 max-h-[80vh] overflow-y-auto\" style=\"background: linear-gradient(to bottom, #1a1a2e, #16213e);\">
            <h3 class=\"text-2xl font-semibold mb-6 text-center\" style=\"color: #ffffff;\">Ranking Results</h3>
            <div id="rankingModalContent" class="mb-6"></div>
            <div class="flex gap-3">
              <button id="saveRankingImage" class="btn btn-primary flex-1">💾 Save as Image</button>
              <button id="closeRankingModal" class="btn btn-secondary flex-1">Close</button>
            </div>
          </div>
        </div>
      </div>
      <aside class="w-72 p-6 bg-gradient-to-b from-base-100 to-base-200 border-l border-base-content/10 overflow-y-auto">
        <h3 class="text-base font-semibold text-primary mb-3 pb-2 border-b border-base-content/20">Instructions</h3>
        <ul class="list-none mb-6">
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Load from File:</strong> Upload .txt (one node per line) or .json (array of items) to Node Library</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Add to Canvas:</strong> Drag nodes from Node Library to canvas (removes from library)</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Create Node:</strong> Double-click on canvas</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Move Node:</strong> Click and drag</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Connect Nodes:</strong> Select a node, then Shift+Click another node</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Rename Node:</strong> Double-click on node</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Return to Library:</strong> Right-click node or press Delete/Backspace</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Delete Connection:</strong> Right-click on connection or select and press Delete</li>
          <li class="text-sm text-base-content/70 py-1.5 leading-snug"><strong class="text-base-content font-medium">Cancel:</strong> Press Escape</li>
        </ul>
        <h3 class="text-base font-semibold text-primary mb-3 pb-2 border-b border-base-content/20">Relationships</h3>
        <div class="flex flex-col gap-2 mb-6">
          <span class="flex items-center gap-3 text-sm text-base-content/70">
            <code class="inline-flex items-center justify-center w-7 h-7 bg-base-300 rounded-md text-base font-semibold text-base-content">=</code> Equals
          </span>
          <span class="flex items-center gap-3 text-sm text-base-content/70">
            <code class="inline-flex items-center justify-center w-7 h-7 bg-base-300 rounded-md text-base font-semibold text-base-content">&gt;</code> Greater
          </span>
          <span class="flex items-center gap-3 text-sm text-base-content/70">
            <code class="inline-flex items-center justify-center w-7 h-7 bg-base-300 rounded-md text-base font-semibold text-base-content">≥</code> Greater or Equals
          </span>
          <span class="flex items-center gap-3 text-sm text-base-content/70">
            <code class="inline-flex items-center justify-center w-7 h-7 bg-base-300 rounded-md text-base font-semibold text-base-content">&lt;</code> Less
          </span>
          <span class="flex items-center gap-3 text-sm text-base-content/70">
            <code class="inline-flex items-center justify-center w-7 h-7 bg-base-300 rounded-md text-base font-semibold text-base-content">≤</code> Less or Equals
          </span>
        </div>
        <h3 class="text-base font-semibold text-primary mb-3 pb-2 border-b border-base-content/20">Connections</h3>
        <div id="connectionsList" class="mb-6">
          <p class="text-sm text-base-content/50 italic">No connections yet</p>
        </div>
        <h3 class="text-base font-semibold text-primary mb-3 pb-2 border-b border-base-content/20">Validation</h3>
        <div id="validationStatus">
          <p class="text-sm text-base-content/50 italic">Validation updates automatically</p>
        </div>
      </aside>
    </main>
  </div>
`;

console.log('HTML injected');

const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
console.log('Canvas element:', canvas);

if (canvas) {
  const editor = new NodeGraphEditor(canvas);
  console.log('Editor created');

  // Initial render
  editor.render();

  // Button handlers
  document.getElementById('loadFileBtn')?.addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  });

  document.getElementById('fileInput')?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await editor.loadFromFile(file);
      updateConnectionsList();
      updateToolbarNodes();
      input.value = ''; // Reset input so same file can be loaded again
    }
  });

  document.getElementById('validateBtn')?.addEventListener('click', () => {
    const result = editor.validate();
    updateValidationStatus(result);
  });

  document.getElementById('generateRankingBtn')?.addEventListener('click', () => {
    const ranking = editor.generateRanking();
    showRankingModal(ranking);
  });

  document.getElementById('clearBtn')?.addEventListener('click', () => {
    editor.clearAll();
    updateConnectionsList();
  });

  document.getElementById('clearLibraryBtn')?.addEventListener('click', () => {
    if (confirm('Clear all nodes from library?')) {
      editor.clearToolbar();
      updateToolbarNodes();
    }
  });

  // Update connections list in sidebar
  const updateConnectionsList = () => {
    const listEl = document.getElementById('connectionsList');
    if (!listEl) return;

    const connections = editor.getConnectionsInfo();
    if (connections.length === 0) {
      listEl.innerHTML = '<p class="text-base-content/50 text-sm italic">No connections yet</p>';
    } else {
      listEl.innerHTML = connections.map(c => 
        `<div class="flex items-center gap-2 p-2 bg-base-300 rounded-md mb-2 text-sm">
          <span class="text-base-content font-medium">${c.fromLabel}</span>
          <span class="text-primary font-semibold text-base">${c.symbol}</span>
          <span class="text-base-content font-medium">${c.toLabel}</span>
        </div>`
      ).join('');
    }
  };

  // Update validation status display
  const updateValidationStatus = (result: { valid: boolean; errors: string[] }) => {
    const statusEl = document.getElementById('validationStatus');
    if (!statusEl) return;

    if (result.valid) {
      statusEl.innerHTML = '<p class="text-secondary text-sm font-medium px-3 py-2 bg-secondary/10 rounded-md border-l-4 border-secondary">✓ Graph is valid!</p>';
    } else {
      const errors = result.errors.map(e => `<li class="py-1.5 px-3 bg-error/5 rounded text-error/90">${e}</li>`).join('');
      statusEl.innerHTML = `<p class="text-error text-sm font-medium px-3 py-2 bg-error/10 rounded-md border-l-4 border-error mb-2">✗ Validation failed:</p><ul class="list-none mt-2 space-y-1">${errors}</ul>`;
    }
  };

  // Show ranking results in modal
  const showRankingModal = (ranking: { success: boolean; ranks?: string[][]; error?: string }) => {
    const modal = document.getElementById('rankingModal');
    const content = document.getElementById('rankingModalContent');
    if (!modal || !content) return;

    if (!ranking.success) {
      content.innerHTML = `<p class="text-error text-base font-medium px-4 py-3 bg-error/10 rounded-lg border-l-4 border-error">${ranking.error || 'Failed to generate ranking'}</p>`;
    } else if (!ranking.ranks || ranking.ranks.length === 0) {
      content.innerHTML = '<p class="text-base-content/50 text-base italic text-center">No nodes to rank</p>';
    } else {
      // Tier labels and colors (from highest to lowest)
      const tierLabels = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
      const tierColors = ['#ff7f7f', '#ffbf7f', '#ffdf7f', '#bfff7f', '#999999', '#7f7f7f', '#5f5f5f'];
      
      const ranksHtml = ranking.ranks.map((level, index) => {
        const tierLabel = index < tierLabels.length ? tierLabels[index] : (index + 1).toString();
        const tierColor = index < tierColors.length ? tierColors[index] : '#666666';
        
        const nodesHtml = level.map(node => 
          `<div class="inline-flex items-center justify-center px-4 py-3 rounded text-base font-semibold" style="background-color: #2a2a3e; color: #ffffff; min-width: 100px; border: 2px solid #3a3a4e;">${node}</div>`
        ).join('');
        
        return `<div class="flex items-stretch mb-2" style="background-color: #1a1a2a; border-radius: 4px; overflow: hidden;">
          <div class="flex items-center justify-center font-black text-3xl" style="background-color: ${tierColor}; color: #000000; width: 80px; min-height: 80px;">
            ${tierLabel}
          </div>
          <div class="flex items-center flex-wrap gap-2 p-3 flex-1" style="background-color: #0f0f1a;">
            ${nodesHtml}
          </div>
        </div>`;
      }).join('');

      content.innerHTML = `<div class="space-y-2" style="background-color: #0a0a0f; padding: 20px; border-radius: 8px;">${ranksHtml}</div>`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  // Close ranking modal
  document.getElementById('closeRankingModal')?.addEventListener('click', () => {
    const modal = document.getElementById('rankingModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });

  // Save ranking as image
  document.getElementById('saveRankingImage')?.addEventListener('click', async () => {
    const content = document.getElementById('rankingModalContent');
    if (!content) return;

    try {
      // Use html2canvas to capture the content
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(content, {
        backgroundColor: '#1a1a2e',
        scale: 2,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ranking-${new Date().getTime()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Failed to save image:', error);
      alert('Failed to save image. Please try again.');
    }
  });

  // Update toolbar nodes display
  const updateToolbarNodes = () => {
    const toolbarEl = document.getElementById('toolbarNodes');
    if (!toolbarEl) return;

    const toolbarNodes = editor.getToolbarNodes();
    if (toolbarNodes.length === 0) {
      toolbarEl.innerHTML = '<p class="text-base-content/50 text-sm text-center italic">No nodes loaded</p>';
    } else {
      toolbarEl.innerHTML = toolbarNodes.map(node => {
        const hasImage = !!node.imageUrl;
        const imageHtml = hasImage 
          ? `<img src="${node.imageUrl}" alt="${node.label}" class="w-16 h-16 object-cover rounded mb-2 mx-auto" crossorigin="anonymous" />`
          : '';
        
        return `<div class="toolbar-node px-3 ${hasImage ? 'py-3' : 'py-2'} rounded-lg text-sm text-white cursor-grab text-center select-none transition-all border-2 border-transparent hover:translate-x-1 hover:border-white/20 flex flex-col items-center" 
              data-node-id="${node.id}"
              data-node-label="${node.label}"
              data-node-color="${node.color}"
              data-node-image="${node.imageUrl || ''}"
              data-node-height="${node.height}"
              draggable="true"
              style="background-color: ${node.color};">
          ${imageHtml}
          <span class="text-xs font-medium">${node.label}</span>
        </div>`;
      }).join('');

      // Add drag event listeners to toolbar nodes
      toolbarEl.querySelectorAll('.toolbar-node').forEach(el => {
        el.addEventListener('dragstart', (e) => {
          const dragEvent = e as DragEvent;
          const target = e.target as HTMLElement;
          const nodeId = target.dataset.nodeId;
          const nodeLabel = target.dataset.nodeLabel;
          const nodeColor = target.dataset.nodeColor;
          const nodeImage = target.dataset.nodeImage;
          const nodeHeight = target.dataset.nodeHeight;
          
          if (dragEvent.dataTransfer && nodeId && nodeLabel && nodeColor) {
            dragEvent.dataTransfer.effectAllowed = 'copy';
            dragEvent.dataTransfer.setData('text/plain', JSON.stringify({
              id: nodeId,
              label: nodeLabel,
              color: nodeColor,
              imageUrl: nodeImage || undefined,
              height: parseInt(nodeHeight || '50'),
              fromToolbar: true
            }));
          }
        });
      });
    }
  };

  // Canvas drag and drop handlers
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const data = e.dataTransfer?.getData('text/plain');
    if (!data) return;

    try {
      const nodeData = JSON.parse(data);
      if (nodeData.fromToolbar) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const toolbarNode = editor.getToolbarNodes().find(n => n.id === nodeData.id);
        if (toolbarNode) {
          editor.moveNodeToCanvas(toolbarNode, x, y);
          updateConnectionsList();
        }
      }
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  });

  // Toolbar drag and drop handlers (for moving nodes back)
  const toolbarEl = document.getElementById('toolbarNodes');
  if (toolbarEl) {
    toolbarEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    });

    toolbarEl.addEventListener('drop', (e) => {
      e.preventDefault();
      // Note: We'll handle this through canvas drag
    });
  }

  // Allow dragging canvas nodes back to toolbar
  canvas.addEventListener('dragstart', () => {
    // This would be handled by canvas rendering if we add draggable attribute to nodes
    // For now, we'll use a different approach - right-click menu
  });

  // Listen for changes
  editor.onStateChange = updateConnectionsList;
  editor.onToolbarChange = updateToolbarNodes;
  editor.onValidationChange = updateValidationStatus;
  updateConnectionsList();
  updateToolbarNodes();
} else {
  console.error('Canvas element not found!');
}
