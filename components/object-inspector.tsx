'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCw, Trash2, Copy, Users, Square, Circle, RectangleHorizontal, Armchair } from 'lucide-react';
import type { FloorPlanObjectData, TableStatus } from '@/lib/floor-plan-types';

interface ObjectInspectorProps {
  object: FloorPlanObjectData | null;
  onUpdate: (id: string, updates: Partial<FloorPlanObjectData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const STATUS_OPTIONS: { value: TableStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'bg-emerald-500' },
  { value: 'occupied', label: 'Occupied', color: 'bg-red-500' },
  { value: 'cleaning', label: 'Cleaning', color: 'bg-yellow-500' },
  { value: 'reserved', label: 'Reserved', color: 'bg-blue-500' },
  { value: 'out_of_service', label: 'Out of Service', color: 'bg-slate-400' },
];

const SHAPE_OPTIONS = [
  { value: 'round', label: 'Round', icon: Circle },
  { value: 'square', label: 'Square', icon: Square },
  { value: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal },
];

export default function ObjectInspector({ object, onUpdate, onDelete, onDuplicate }: ObjectInspectorProps) {
  if (!object) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
          <Armchair className="w-7 h-7 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No object selected</p>
        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Click an object on the canvas to inspect it</p>
      </div>
    );
  }

  const isTable = object.objectType === 'table';
  const isStructural = ['wall', 'door', 'window', 'entrance'].includes(object.objectType);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{object.name}</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">{object.objectType}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onDuplicate(object.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" title="Duplicate">
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
          <button onClick={() => onDelete(object.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</label>
          <input
            type="text"
            value={object.name}
            onChange={(e) => onUpdate(object.id, { name: e.target.value })}
            className="w-full mt-1 px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>

        {/* Status */}
        {isTable && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate(object.id, { status: opt.value })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    object.status === opt.value
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-md'
                      : 'bg-slate-50 dark:bg-black/30 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shape */}
        {isTable && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shape</label>
            <div className="flex gap-1.5 mt-1.5">
              {SHAPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate(object.id, { shape: opt.value })}
                  className={`flex-1 flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                    object.shape === opt.value
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-md'
                      : 'bg-slate-50 dark:bg-black/30 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Capacity */}
        {isTable && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Capacity <span className="text-slate-300 dark:text-slate-600">({object.capacity} seats)</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={object.capacity}
              onChange={(e) => onUpdate(object.id, { capacity: Number(e.target.value) })}
              className="w-full mt-1 accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-slate-300 dark:text-slate-600">
              <span>1</span><span>20</span>
            </div>
          </div>
        )}

        {/* Dimensions */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position</label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            <div>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">X</span>
              <input type="number" value={Math.round(object.x)}
                onChange={(e) => onUpdate(object.id, { x: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">Y</span>
              <input type="number" value={Math.round(object.y)}
                onChange={(e) => onUpdate(object.id, { y: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40" />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Size</label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            <div>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">W</span>
              <input type="number" value={Math.round(object.width)}
                onChange={(e) => onUpdate(object.id, { width: Math.max(20, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">H</span>
              <input type="number" value={Math.round(object.height)}
                onChange={(e) => onUpdate(object.id, { height: Math.max(20, Number(e.target.value)) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40" />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rotation</label>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="range" min={-180} max={180} value={object.rotation}
              onChange={(e) => onUpdate(object.id, { rotation: Number(e.target.value) })}
              className="flex-1 accent-orange-500"
            />
            <span className="text-xs font-bold text-slate-500 w-8 text-right">{object.rotation}°</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
          <button
            onClick={() => onUpdate(object.id, { rotation: (object.rotation + 90) % 360 })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <RotateCw className="w-4 h-4" /> Rotate 90°
          </button>
        </div>
      </div>
    </motion.div>
  );
}
