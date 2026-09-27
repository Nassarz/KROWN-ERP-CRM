'use client';

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import type { FloorPlanObjectData, SeatPosition, TableStatus } from '@/lib/floor-plan-types';
import { generateId } from '@/lib/id';

const GRID_SIZE = 20;

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function calcSeatPositions(shape: string, w: number, h: number, count: number): SeatPosition[] {
  if (count <= 0) return [];
  const seats: SeatPosition[] = [];
  const cx = w / 2;
  const cy = h / 2;
  const isRound = shape === 'round';

  if (isRound) {
    const radius = Math.max(w, h) / 2 + 18;
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      seats.push({
        id: `seat_${i}`,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle: (angle * 180) / Math.PI,
      });
    }
  } else {
    const perimeter = 2 * (w + h);
    for (let i = 0; i < count; i++) {
      const dist = ((i + 0.5) / count) * perimeter;
      let x = 0, y = 0;
      if (dist < w) { x = dist; y = -16; }
      else if (dist < w + h) { x = w + 16; y = dist - w; }
      else if (dist < 2 * w + h) { x = w - (dist - w - h); y = h + 16; }
      else { x = -16; y = h - (dist - 2 * w - h); }
      seats.push({ id: `seat_${i}`, x, y, angle: 0 });
    }
  }
  return seats;
}

function getShapeSVG(shape: string, w: number, h: number, color: string, status: string) {
  const statusColors: Record<string, string> = {
    available: '#22c55e', occupied: '#ef4444', cleaning: '#eab308',
    reserved: '#3b82f6', out_of_service: '#94a3b8',
  };
  const fill = statusColors[status] || color;
  const opacity = status === 'out_of_service' ? 0.4 : 0.9;

  if (shape === 'round') {
    const r = Math.min(w, h) / 2;
    return (
      <ellipse cx={w / 2} cy={h / 2} rx={r} ry={r}
        fill={fill} fillOpacity={opacity} stroke="white" strokeWidth="2.5"
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }} />
    );
  }
  if (shape === 'square') {
    const s = Math.min(w, h);
    const ox = (w - s) / 2;
    const oy = (h - s) / 2;
    return (
      <rect x={ox} y={oy} width={s} height={s} rx={8}
        fill={fill} fillOpacity={opacity} stroke="white" strokeWidth="2.5"
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }} />
    );
  }
  return (
    <rect x={0} y={0} width={w} height={h} rx={6}
      fill={fill} fillOpacity={opacity} stroke="white" strokeWidth="2.5"
      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }} />
  );
}

interface FloorPlanCanvasProps {
  objects: FloorPlanObjectData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  showGrid?: boolean;
  zoom?: number;
  bgColor?: string;
}

export default function FloorPlanCanvas({
  objects, selectedId, onSelect, onMove, onResize, onRotate, onDelete, onDuplicate,
  showGrid = true, zoom = 1, bgColor = '#f8fafc',
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [rotating, setRotating] = useState<string | null>(null);
  const [rotateStart, setRotateStart] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent, obj: FloorPlanObjectData) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelect(obj.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = zoom;
    setDragOffset({
      x: (e.clientX - rect.left) / scale - obj.x,
      y: (e.clientY - rect.top) / scale - obj.y,
    });
    setDragging(obj.id);
  }, [onSelect, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = zoom;

    if (dragging) {
      const obj = objects.find(o => o.id === dragging);
      if (!obj) return;
      const rawX = (e.clientX - rect.left) / scale - dragOffset.x;
      const rawY = (e.clientY - rect.top) / scale - dragOffset.y;
      onMove(dragging, snapToGrid(rawX), snapToGrid(rawY));
    }
    if (resizing) {
      const obj = objects.find(o => o.id === resizing);
      if (!obj) return;
      const dx = (e.clientX - resizeStart.x) / scale;
      const dy = (e.clientY - resizeStart.y) / scale;
      const newW = Math.max(40, snapToGrid(resizeStart.w + dx));
      const newH = Math.max(40, snapToGrid(resizeStart.h + dy));
      onResize(resizing, newW, newH);
    }
    if (rotating) {
      const obj = objects.find(o => o.id === rotating);
      if (!obj) return;
      const cx = (obj.x + obj.width / 2) * scale + rect.left;
      const cy = (obj.y + obj.height / 2) * scale + rect.top;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      const snapped = snapToGrid(angle);
      onRotate(rotating, snapped);
    }
  }, [dragging, resizing, rotating, objects, dragOffset, resizeStart, zoom, onMove, onResize, onRotate]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
    setRotating(null);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, obj: FloorPlanObjectData) => {
    e.stopPropagation();
    setResizing(obj.id);
    setResizeStart({ x: e.clientX, y: e.clientY, w: obj.width, h: obj.height });
  }, []);

  const handleRotateStart = useCallback((e: React.MouseEvent, obj: FloorPlanObjectData) => {
    e.stopPropagation();
    setRotating(obj.id);
    setRotateStart(obj.rotation);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedId) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') return;
      e.preventDefault();
      onDelete(selectedId);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      onDuplicate(selectedId);
    }
  }, [selectedId, onDelete, onDuplicate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const sortedObjects = useMemo(() => [...objects].sort((a, b) => a.zIndex - b.zIndex), [objects]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-crosshair select-none"
      style={{ backgroundColor: bgColor }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => { if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) onSelect(null); }}
    >
      {showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none canvas-bg" style={{ opacity: 0.3 }}>
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}

      <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'relative' }}>
        {sortedObjects.map((obj) => {
          const isSelected = selectedId === obj.id;
          const seats = obj.seatsConfig.length > 0 ? obj.seatsConfig : calcSeatPositions(obj.shape, obj.width, obj.height, obj.capacity);
          const isTable = ['table'].includes(obj.objectType);

          return (
            <div
              key={obj.id}
              className="absolute"
              style={{
                left: obj.x,
                top: obj.y,
                width: obj.width,
                height: obj.height,
                transform: `rotate(${obj.rotation}deg)`,
                zIndex: isSelected ? 999 : obj.zIndex,
                cursor: dragging === obj.id ? 'grabbing' : 'grab',
              }}
              onMouseDown={(e) => handleMouseDown(e, obj)}
            >
              <svg width={obj.width} height={obj.height} viewBox={`0 0 ${obj.width} ${obj.height}`}>
                {getShapeSVG(obj.shape, obj.width, obj.height, obj.color, obj.status)}
                {obj.objectType === 'table' && (
                  <text
                    x={obj.width / 2} y={obj.height / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fill="white" fontSize={Math.min(obj.width, obj.height) * 0.2}
                    fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
                    style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                  >
                    {obj.name}
                  </text>
                )}
                {obj.objectType === 'wall' && (
                  <rect x={0} y={0} width={obj.width} height={obj.height} rx={2}
                    fill={obj.color} stroke="#475569" strokeWidth="1" />
                )}
                {obj.objectType === 'door' && (
                  <>
                    <rect x={0} y={0} width={obj.width} height={obj.height} rx={2}
                      fill={obj.color} fillOpacity={0.6} stroke="#16a34a" strokeWidth="1" />
                    <path d={`M 0 ${obj.height} Q ${obj.width * 0.3} -${obj.height * 0.5} ${obj.width} ${obj.height}`}
                      fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="4 2" />
                  </>
                )}
                {obj.objectType === 'window' && (
                  <rect x={0} y={0} width={obj.width} height={obj.height} rx={2}
                    fill={obj.color} fillOpacity={0.5} stroke="#0ea5e9" strokeWidth="1.5"
                    strokeDasharray="8 4" />
                )}
                {obj.objectType === 'plant' && (
                  <text x={obj.width / 2} y={obj.height / 2} textAnchor="middle" dominantBaseline="central"
                    fontSize={Math.min(obj.width, obj.height) * 0.6}>🌿</text>
                )}
                {obj.objectType === 'label' && (
                  <text x={obj.width / 2} y={obj.height / 2} textAnchor="middle" dominantBaseline="central"
                    fill="#475569" fontSize={12} fontWeight="600" fontFamily="Inter, system-ui, sans-serif"
                    style={{ pointerEvents: 'none' }}>
                    {obj.name}
                  </text>
                )}
                {obj.objectType === 'bar' && (
                  <>
                    <rect x={0} y={0} width={obj.width} height={obj.height} rx={6}
                      fill={obj.color} fillOpacity={0.7} stroke="white" strokeWidth="2" />
                    <text x={obj.width / 2} y={obj.height / 2} textAnchor="middle" dominantBaseline="central"
                      fill="white" fontSize={11} fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
                      style={{ pointerEvents: 'none' }}>BAR</text>
                  </>
                )}
                {obj.objectType === 'kitchen' && (
                  <>
                    <rect x={0} y={0} width={obj.width} height={obj.height} rx={6}
                      fill={obj.color} fillOpacity={0.6} stroke="white" strokeWidth="2" />
                    <text x={obj.width / 2} y={obj.height / 2} textAnchor="middle" dominantBaseline="central"
                      fill="white" fontSize={11} fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
                      style={{ pointerEvents: 'none' }}>KITCHEN</text>
                  </>
                )}
                {obj.objectType === 'booth' && (
                  <>
                    <rect x={0} y={0} width={obj.width} height={obj.height * 0.3} rx={4}
                      fill={obj.color} fillOpacity={0.9} stroke="white" strokeWidth="1.5" />
                    <rect x={4} y={obj.height * 0.35} width={obj.width - 8} height={obj.height * 0.6} rx={4}
                      fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                    <text x={obj.width / 2} y={obj.height * 0.65} textAnchor="middle" dominantBaseline="central"
                      fill="#475569" fontSize={Math.min(obj.width, obj.height) * 0.15}
                      fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
                      style={{ pointerEvents: 'none' }}>{obj.name}</text>
                  </>
                )}
              </svg>

              {isTable && seats.map((seat, i) => (
                <div
                  key={seat.id || i}
                  className="absolute rounded-full bg-slate-600 border-2 border-white/80"
                  style={{
                    left: seat.x - 7,
                    top: seat.y - 7,
                    width: 14,
                    height: 14,
                    transform: `rotate(${-obj.rotation}deg)`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                  title={`Seat ${i + 1}`}
                />
              ))}

              {isSelected && (
                <>
                  <div className="absolute -inset-1 border-2 border-orange-500 rounded-lg pointer-events-none"
                    style={{ borderStyle: 'dashed' }} />

                  <div
                    className="absolute w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-se-resize -bottom-2 -right-2 shadow-md"
                    onMouseDown={(e) => handleResizeStart(e, obj)}
                  />

                  <div
                    className="absolute w-5 h-5 bg-orange-500 rounded-full cursor-grab -top-6 left-1/2 -translate-x-1/2 shadow-md flex items-center justify-center"
                    onMouseDown={(e) => handleRotateStart(e, obj)}
                    title="Rotate"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M1 4v6h6M23 20v-6h-6" />
                      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
