'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Grid3X3, Save, Loader2,
  Check, Download, Trash2
} from 'lucide-react';

interface FloorPlanToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

export default function FloorPlanToolbar({
  canUndo, canRedo, onUndo, onRedo,
  zoom, onZoomIn, onZoomOut, onFitToScreen,
  showGrid, onToggleGrid,
  saveState, onDeleteSelected, hasSelection,
}: FloorPlanToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-2xl px-2 py-1.5 shadow-sm">
      {/* Undo / Redo */}
      <button onClick={onUndo} disabled={!canUndo}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all" title="Undo (Ctrl+Z)">
        <Undo2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>
      <button onClick={onRedo} disabled={!canRedo}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all" title="Redo (Ctrl+Shift+Z)">
        <Redo2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>

      <div className="w-px h-6 bg-black/5 dark:bg-white/5 mx-1" />

      {/* Zoom */}
      <button onClick={onZoomOut} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all" title="Zoom Out">
        <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>
      <span className="text-[10px] font-bold text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all" title="Zoom In">
        <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>
      <button onClick={onFitToScreen} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all" title="Fit to Screen">
        <Maximize className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>

      <div className="w-px h-6 bg-black/5 dark:bg-white/5 mx-1" />

      {/* Grid */}
      <button onClick={onToggleGrid}
        className={`p-2 rounded-xl transition-all ${showGrid ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400'}`}
        title="Toggle Grid">
        <Grid3X3 className="w-4 h-4" />
      </button>

      {/* Delete */}
      {hasSelection && (
        <button onClick={onDeleteSelected}
          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" title="Delete Selected">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      )}

      <div className="flex-1" />

      {/* Save Status */}
      <div className="flex items-center gap-1.5 px-2">
        {saveState === 'saving' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
            <span className="text-[10px] font-bold text-orange-500">Saving...</span>
          </motion.div>
        )}
        {saveState === 'saved' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500">Saved</span>
          </motion.div>
        )}
        {saveState === 'error' && (
          <span className="text-[10px] font-bold text-red-500">Error saving</span>
        )}
      </div>
    </div>
  );
}
