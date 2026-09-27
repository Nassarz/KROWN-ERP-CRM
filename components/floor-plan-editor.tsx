'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store, ChevronLeft, Plus, Settings, Eye, Loader2, CheckCircle2,
  ArrowRight, Sparkles, LayoutGrid, GripVertical
} from 'lucide-react';
import FloorPlanCanvas from './floor-plan-canvas';
import ObjectInspector from './object-inspector';
import SectionSwitcher from './section-switcher';
import ObjectLibrary from './object-library';
import FloorPlanToolbar from './floor-plan-toolbar';
import type {
  FloorPlanData, FloorPlanObjectData, FloorPlanSectionData, HistoryEntry
} from '@/lib/floor-plan-types';
import { OBJECT_PRESETS } from '@/lib/floor-plan-types';
import { generateId } from '@/lib/id';
import { dataStore } from '@/lib/dataStore';

interface FloorPlanEditorProps {
  user: any;
  onBack: () => void;
}

export default function FloorPlanEditor({ user, onBack }: FloorPlanEditorProps) {
  const [plans, setPlans] = useState<FloorPlanData[]>([]);
  const [activePlan, setActivePlan] = useState<FloorPlanData | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [objects, setObjects] = useState<FloorPlanObjectData[]>([]);
  const [sections, setSections] = useState<FloorPlanSectionData[]>([]);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const activeSection = useMemo(() => sections.find(s => s.id === activeSectionId), [sections, activeSectionId]);
  const visibleObjects = useMemo(() => objects.filter(o => o.sectionId === activeSectionId), [objects, activeSectionId]);
  const selectedObject = useMemo(() => objects.find(o => o.id === selectedObjectId), [objects, selectedObjectId]);

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = useCallback((objs: FloorPlanObjectData[], secs: FloorPlanSectionData[]) => {
    const entry = { objects: JSON.parse(JSON.stringify(objs)), sections: JSON.parse(JSON.stringify(secs)) };
    const idx = historyIndexRef.current;
    historyRef.current = [...historyRef.current.slice(0, idx + 1), entry];
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const updateHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];
    setObjects(entry.objects);
    setSections(entry.sections);
    updateHistoryState();
  }, [updateHistoryState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];
    setObjects(entry.objects);
    setSections(entry.sections);
    updateHistoryState();
  }, [updateHistoryState]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!activePlan) return;
      setSaveState('saving');
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
        for (const obj of objects) {
          await fetch(`/api/floor-plans/${activePlan.id}/objects/${obj.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ x: obj.x, y: obj.y, width: obj.width, height: obj.height, rotation: obj.rotation, capacity: obj.capacity, name: obj.name, shape: obj.shape, status: obj.status, color: obj.color, seatsConfig: obj.seatsConfig, zIndex: obj.zIndex }),
          });
        }
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('error');
      }
    }, 800);
  }, [activePlan, objects]);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
      const branchId = user?.assignedBranchId || undefined;
      const qs = branchId ? `?branchId=${branchId}` : '';
      const res = await fetch(`/api/floor-plans${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setPlans(data.data || []);
    } catch (e) {
      console.error('Failed to load floor plans:', e);
    }
  }, [user]);

  const loadPlan = useCallback(async (planId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
      const res = await fetch(`/api/floor-plans/${planId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const plan = data.data;
      if (plan) {
        setActivePlan(plan);
        setSections(plan.sections || []);
        setObjects(plan.objects || []);
        if (plan.sections?.length > 0) setActiveSectionId(plan.sections[0].id);
        historyRef.current = [{ objects: plan.objects || [], sections: plan.sections || [] }];
        historyIndexRef.current = 0;
      }
    } catch (e) {
      console.error('Failed to load floor plan:', e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPlans();
      if (!cancelled) {
        loadingRef.current = false;
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadPlans]);

  // ── Create plan ────────────────────────────────────────────────────────────
  const createPlan = useCallback(async (name: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
      const branchId = user?.assignedBranchId;
      const res = await fetch('/api/floor-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, branchId }),
      });
      const data = await res.json();
      if (data.data) {
        setPlans(prev => [data.data, ...prev]);
        await loadPlan(data.data.id);
      }
    } catch (e) {
      console.error('Failed to create floor plan:', e);
    }
  }, [user, loadPlan]);

  // ── Section CRUD ───────────────────────────────────────────────────────────
  const addSection = useCallback(async (name: string) => {
    if (!activePlan) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
      const res = await fetch(`/api/floor-plans/${activePlan.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, sortOrder: sections.length }),
      });
      const data = await res.json();
      if (data.data) {
        const newSections = [...sections, data.data];
        setSections(newSections);
        setActiveSectionId(data.data.id);
        pushHistory(objects, newSections);
      }
    } catch (e) {
      console.error('Failed to add section:', e);
    }
  }, [activePlan, sections, objects, pushHistory]);

  // ── Object CRUD ────────────────────────────────────────────────────────────
  const addObject = useCallback(async (presetKey: string) => {
    if (!activePlan || !activeSectionId) return;
    const preset = OBJECT_PRESETS[presetKey];
    if (!preset) return;
    const namePrefix = presetKey.startsWith('round') ? 'T' : presetKey.startsWith('booth') ? 'B' : presetKey === 'bar' ? 'BAR' : presetKey === 'kitchen' ? 'K' : presetKey === 'wall' ? 'Wall' : presetKey === 'door' ? 'Door' : presetKey === 'window' ? 'Win' : presetKey === 'plant' ? 'Plant' : 'Obj';
    const existingCount = objects.filter(o => o.sectionId === activeSectionId && o.objectType === 'table').length;
    const name = namePrefix === 'T' || namePrefix === 'B' ? `${namePrefix}${existingCount + 1}` : presetKey === 'label' ? 'Label' : namePrefix;

    const newObj: FloorPlanObjectData = {
      id: generateId(),
      floorPlanId: activePlan.id,
      sectionId: activeSectionId,
      organizationId: '',
      objectType: presetKey.includes('table') || presetKey.startsWith('round') || presetKey.startsWith('square') || presetKey.startsWith('rectangle') || presetKey.startsWith('long') ? 'table'
        : presetKey.includes('booth') ? 'booth'
        : presetKey.includes('bar') ? 'bar'
        : presetKey.includes('kitchen') ? 'kitchen'
        : presetKey.includes('wall') ? 'wall'
        : presetKey.includes('door') ? 'door'
        : presetKey.includes('window') ? 'window'
        : presetKey.includes('plant') ? 'plant'
        : presetKey.includes('label') ? 'label'
        : 'table',
      name,
      shape: preset.shape,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: preset.width,
      height: preset.height,
      rotation: 0,
      capacity: preset.capacity,
      seatsConfig: [],
      status: 'available',
      color: preset.color,
      metadata: {},
      zIndex: objects.length,
    };

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
      const res = await fetch(`/api/floor-plans/${activePlan.id}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          sectionId: activeSectionId,
          objectType: newObj.objectType,
          name: newObj.name,
          shape: newObj.shape,
          x: newObj.x,
          y: newObj.y,
          width: newObj.width,
          height: newObj.height,
          capacity: newObj.capacity,
          color: newObj.color,
        }),
      });
      const data = await res.json();
      if (data.data) {
        const savedObj = { ...newObj, id: data.data.id, organizationId: data.data.organization_id };
        const newObjects = [...objects, savedObj];
        setObjects(newObjects);
        setSelectedObjectId(savedObj.id);
        pushHistory(newObjects, sections);
      }
    } catch (e) {
      console.error('Failed to add object:', e);
    }
  }, [activePlan, activeSectionId, objects, sections, pushHistory]);

  const updateObject = useCallback((id: string, updates: Partial<FloorPlanObjectData>) => {
    setObjects(prev => {
      const next = prev.map(o => o.id === id ? { ...o, ...updates } : o);
      pushHistory(next, sections);
      scheduleSave();
      return next;
    });
  }, [sections, pushHistory, scheduleSave]);

  const deleteObject = useCallback((id: string) => {
    const newObjects = objects.filter(o => o.id !== id);
    setObjects(newObjects);
    if (selectedObjectId === id) setSelectedObjectId(null);
    pushHistory(newObjects, sections);
    const token = typeof window !== 'undefined' ? localStorage.getItem('krown_session_token') : null;
    if (activePlan) {
      fetch(`/api/floor-plans/${activePlan.id}/objects/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => {});
    }
  }, [objects, sections, selectedObjectId, activePlan, pushHistory]);

  const duplicateObject = useCallback((id: string) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    addObject(obj.objectType === 'table' ? `round_${obj.capacity}` : obj.objectType === 'booth' ? 'booth_4' : obj.objectType === 'bar' ? 'bar' : obj.objectType === 'kitchen' ? 'kitchen' : 'plant');
  }, [objects, addObject]);

  // ── Onboarding ─────────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    if (!activePlan) {
      await createPlan('Main Floor Plan');
    }
  }, [activePlan, createPlan]);

  const ONBOARDING_STEPS = [
    { title: 'Welcome to Floor Plan Builder', desc: 'Design your restaurant layout visually. Drag tables, add seats, and create the perfect dining experience.' },
    { title: 'Create Sections', desc: 'Divide your restaurant into areas: Main Floor, Outdoor, VIP, Bar, etc.' },
    { title: 'Add Tables', desc: 'Choose from round, square, rectangle, and booth shapes. Seats are auto-calculated.' },
    { title: 'Position & Style', desc: 'Drag tables to position them. Resize, rotate, and configure each one.' },
    { title: 'Publish', desc: 'Your floor plan connects directly to the POS system. Tables show live status.' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F4F6] dark:bg-[#0A0A0C] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <p className="text-sm font-bold text-slate-400">Loading floor plans...</p>
        </motion.div>
      </div>
    );
  }

  // No plans — show create screen
  if (!activePlan) {
    return (
      <div className="min-h-screen bg-[#F4F4F6] dark:bg-[#0A0A0C] p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/30">
              <LayoutGrid className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Floor Plan Builder</h1>
            <p className="text-slate-500 mt-3 text-lg max-w-lg mx-auto">Design your restaurant layout with a visual drag-and-drop editor. Connect tables directly to your POS.</p>
          </motion.div>

          {plans.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Existing Floor Plans</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => (
                  <motion.button
                    key={plan.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => loadPlan(plan.id)}
                    className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-black/5 dark:border-white/5 hover:shadow-lg transition-all text-left"
                  >
                    <LayoutGrid className="w-8 h-8 text-orange-500 mb-3" />
                    <h3 className="font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Click to edit</p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <CreatePlanCard onCreate={createPlan} />
        </div>
      </div>
    );
  }

  // Onboarding overlay
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#F4F4F6] dark:bg-[#0A0A0C] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-[#121214] rounded-3xl p-8 shadow-2xl border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{ONBOARDING_STEPS[onboardingStep].title}</h2>
              <div className="flex gap-1 mt-1">
                {ONBOARDING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i <= onboardingStep ? 'w-6 bg-orange-500' : 'w-2 bg-slate-200 dark:bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">{ONBOARDING_STEPS[onboardingStep].desc}</p>
          <div className="flex gap-3">
            {onboardingStep > 0 && (
              <button onClick={() => setOnboardingStep(s => s - 1)}
                className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-sm font-bold text-slate-600 dark:text-slate-300">
                Back
              </button>
            )}
            <button onClick={() => onboardingStep < ONBOARDING_STEPS.length - 1 ? setOnboardingStep(s => s + 1) : completeOnboarding()}
              className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
              {onboardingStep < ONBOARDING_STEPS.length - 1 ? 'Next' : 'Get Started'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setShowOnboarding(false)} className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Skip setup
          </button>
        </motion.div>
      </div>
    );
  }

  // Main editor
  return (
    <div className="h-screen flex flex-col bg-[#F4F4F6] dark:bg-[#0A0A0C] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActivePlan(null); setObjects([]); setSections([]); }}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">{activePlan.name}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Floor Plan Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FloorPlanToolbar
            canUndo={historyState.canUndo} canRedo={historyState.canRedo} onUndo={undo} onRedo={redo}
            zoom={zoom} onZoomIn={() => setZoom(z => Math.min(2, z + 0.1))} onZoomOut={() => setZoom(z => Math.max(0.3, z - 0.1))}
            onFitToScreen={() => setZoom(1)} showGrid={showGrid} onToggleGrid={() => setShowGrid(g => !g)}
            saveState={saveState} onDeleteSelected={() => selectedObjectId && deleteObject(selectedObjectId)}
            hasSelection={!!selectedObjectId}
          />
        </div>
      </header>

      {/* Section Tabs */}
      <div className="px-4 py-2 bg-white/40 dark:bg-[#121214]/40 border-b border-black/5 dark:border-white/5 z-20">
        <SectionSwitcher
          sections={sections}
          activeId={activeSectionId}
          onSelect={setActiveSectionId}
          onAdd={() => {
            const name = prompt('Section name (e.g., Main Floor, Outdoor, VIP):');
            if (name?.trim()) addSection(name.trim());
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — Object Library */}
        <AnimatePresence>
          {showLibrary && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl border-r border-black/5 dark:border-white/5 overflow-y-auto custom-scrollbar shrink-0"
            >
              <ObjectLibrary onAddObject={addObject} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Canvas */}
        <div className="flex-1 relative">
          {visibleObjects.length === 0 && activeSectionId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                <LayoutGrid className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">No objects yet</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mb-4">Add tables and objects from the library on the left</p>
              <button onClick={() => addObject('round_4')}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                Add First Table
              </button>
            </div>
          ) : null}
          <FloorPlanCanvas
            objects={visibleObjects}
            selectedId={selectedObjectId}
            onSelect={setSelectedObjectId}
            onMove={(id, x, y) => updateObject(id, { x, y })}
            onResize={(id, w, h) => updateObject(id, { width: w, height: h })}
            onRotate={(id, r) => updateObject(id, { rotation: r })}
            onDelete={deleteObject}
            onDuplicate={duplicateObject}
            showGrid={showGrid}
            zoom={zoom}
            bgColor={activeSection?.backgroundColor || '#f8fafc'}
          />
        </div>

        {/* Right Sidebar — Inspector */}
        <aside className="w-72 bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl border-l border-black/5 dark:border-white/5 shrink-0 overflow-y-auto custom-scrollbar hidden lg:block">
          <ObjectInspector
            object={selectedObject || null}
            onUpdate={updateObject}
            onDelete={deleteObject}
            onDuplicate={duplicateObject}
          />
        </aside>
      </div>
    </div>
  );
}

// ── Create Plan Card ─────────────────────────────────────────────────────────

function CreatePlanCard({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await onCreate(name.trim());
    setCreating(false);
    setName('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#121214] rounded-3xl p-8 border border-black/5 dark:border-white/5 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Plus className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Create New Floor Plan</h3>
          <p className="text-xs text-slate-400">Design a layout for your restaurant</p>
        </div>
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="e.g., Main Floor Plan"
          className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 hover:shadow-xl transition-all flex items-center gap-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create
        </button>
      </div>
    </motion.div>
  );
}
