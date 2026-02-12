export type ContextMenuTarget =
  | { type: 'pane'; viewMode: 'network' | 'station' }
  | { type: 'node'; nodeId: string; nodeType: string; viewMode: 'network' | 'station' }
  | { type: 'edge'; edgeId: string; edgeType: string; viewMode: 'network' | 'station' };

export interface ContextMenuState {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
  target: ContextMenuTarget;
}
