export type ObjectType = 'table' | 'chair' | 'booth' | 'sofa' | 'bench' | 'wall' | 'door' | 'window' | 'entrance' | 'bar' | 'kitchen' | 'service_area' | 'restroom' | 'plant' | 'label' | 'decoration';
export type TableShape = 'round' | 'square' | 'rectangle' | 'long' | 'custom';
export type TableStatus = 'available' | 'occupied' | 'cleaning' | 'reserved' | 'out_of_service';

export interface FloorPlanObjectData {
  id: string;
  floorPlanId: string;
  sectionId: string;
  organizationId: string;
  objectType: ObjectType;
  name: string;
  shape: TableShape | string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  seatsConfig: SeatPosition[];
  status: TableStatus | string;
  color: string;
  metadata: Record<string, any>;
  zIndex: number;
}

export interface SeatPosition {
  id: string;
  x: number;
  y: number;
  angle: number;
}

export interface FloorPlanSectionData {
  id: string;
  floorPlanId: string;
  name: string;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  backgroundColor: string;
  isActive: boolean;
}

export interface FloorPlanData {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sections: FloorPlanSectionData[];
  objects: FloorPlanObjectData[];
}

export interface HistoryEntry {
  objects: FloorPlanObjectData[];
  sections: FloorPlanSectionData[];
}

export const OBJECT_PRESETS: Record<string, { shape: string; width: number; height: number; capacity: number; color: string }> = {
  round_2: { shape: 'round', width: 80, height: 80, capacity: 2, color: '#f97316' },
  round_4: { shape: 'round', width: 100, height: 100, capacity: 4, color: '#f97316' },
  round_6: { shape: 'round', width: 130, height: 130, capacity: 6, color: '#f97316' },
  round_8: { shape: 'round', width: 150, height: 150, capacity: 8, color: '#f97316' },
  round_10: { shape: 'round', width: 170, height: 170, capacity: 10, color: '#f97316' },
  square_4: { shape: 'square', width: 100, height: 100, capacity: 4, color: '#f97316' },
  square_6: { shape: 'square', width: 120, height: 120, capacity: 6, color: '#f97316' },
  rectangle_4: { shape: 'rectangle', width: 140, height: 90, capacity: 4, color: '#f97316' },
  rectangle_6: { shape: 'rectangle', width: 180, height: 100, capacity: 6, color: '#f97316' },
  rectangle_8: { shape: 'rectangle', width: 220, height: 110, capacity: 8, color: '#f97316' },
  rectangle_10: { shape: 'rectangle', width: 260, height: 120, capacity: 10, color: '#f97316' },
  long_6: { shape: 'rectangle', width: 240, height: 80, capacity: 6, color: '#f97316' },
  long_8: { shape: 'rectangle', width: 300, height: 80, capacity: 8, color: '#f97316' },
  long_10: { shape: 'rectangle', width: 360, height: 80, capacity: 10, color: '#f97316' },
  long_12: { shape: 'rectangle', width: 420, height: 80, capacity: 12, color: '#f97316' },
  booth_4: { shape: 'rectangle', width: 140, height: 120, capacity: 4, color: '#8b5cf6' },
  booth_6: { shape: 'rectangle', width: 180, height: 130, capacity: 6, color: '#8b5cf6' },
  bar_stool: { shape: 'round', width: 40, height: 40, capacity: 1, color: '#06b6d4' },
  wall: { shape: 'rectangle', width: 200, height: 12, capacity: 0, color: '#64748b' },
  door: { shape: 'rectangle', width: 80, height: 12, capacity: 0, color: '#22c55e' },
  window: { shape: 'rectangle', width: 120, height: 8, capacity: 0, color: '#38bdf8' },
  plant: { shape: 'round', width: 40, height: 40, capacity: 0, color: '#22c55e' },
  label: { shape: 'rectangle', width: 100, height: 30, capacity: 0, color: '#94a3b8' },
};
