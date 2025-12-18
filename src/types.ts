export interface Position {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  isInToolbar?: boolean;
  imageUrl?: string;
}

export const RelationshipType = {
  EQUALS: 'equals',
  GREATER: 'greater',
  GREATER_OR_EQUALS: 'greater_or_equals',
  LESS: 'less',
  LESS_OR_EQUALS: 'less_or_equals',
} as const;

export type RelationshipType = (typeof RelationshipType)[keyof typeof RelationshipType];

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: RelationshipType;
}

export interface GraphState {
  nodes: Node[];
  connections: Connection[];
  toolbarNodes?: Node[];
}

export const RELATIONSHIP_SYMBOLS: Record<RelationshipType, string> = {
  [RelationshipType.EQUALS]: '=',
  [RelationshipType.GREATER]: '>',
  [RelationshipType.GREATER_OR_EQUALS]: '≥',
  [RelationshipType.LESS]: '<',
  [RelationshipType.LESS_OR_EQUALS]: '≤',
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  [RelationshipType.EQUALS]: 'Equals (=)',
  [RelationshipType.GREATER]: 'Greater (>)',
  [RelationshipType.GREATER_OR_EQUALS]: 'Greater or Equals (≥)',
  [RelationshipType.LESS]: 'Less (<)',
  [RelationshipType.LESS_OR_EQUALS]: 'Less or Equals (≤)',
};
