import type { GraphState } from './types';

const STORAGE_KEY = 'node-graph-editor-state';

export function saveState(state: GraphState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

export function loadState(): GraphState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as GraphState;
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
  }
  return null;
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}
