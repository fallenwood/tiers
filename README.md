# Node Graph Editor

A canvas-based node graph editor built with Vite and TypeScript.

## Features

- **Canvas-based visualization** - Interactive graph rendering on HTML5 Canvas
- **Drag and drop nodes** - Click and drag nodes to reposition them
- **Multiple relationship types** - Connect nodes with different relationships:
  - Equals (=)
  - Greater (>)
  - Greater or Equals (≥)
  - Less (<)
  - Less or Equals (≤)
- **Persistent state** - Automatically saves to localStorage
- **Clear functionality** - Button to clear all data from localStorage

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

## Usage

### Creating Nodes
- **Double-click** on the canvas to create a new node
- Click the **"Add Node"** button in the toolbar

### Moving Nodes
- **Click and drag** a node to move it

### Connecting Nodes
1. **Shift+Click** on the first node
2. **Shift+Click** on the second node
3. Select the relationship type from the dialog

### Editing Nodes
- **Double-click** on a node to rename it

### Deleting
- **Right-click** on a node or connection to delete it
- Or **select** a node/connection and press **Delete** or **Backspace**

### Changing Relationships
- **Shift+Click** on two already connected nodes to change their relationship

### Other Controls
- Press **Escape** to cancel connecting mode
- Click **"Clear All"** to remove all nodes and connections

## Tech Stack

- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- HTML5 Canvas - Rendering

## License

MIT
