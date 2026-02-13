import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Plan, PlanMeta, GameMode } from '@/types';
import { usePlanStore } from './planStore';

const INDEX_KEY = 'x4-plan-index';
const CURRENT_PLAN_KEY = 'x4-current-plan-id';
const LEGACY_KEY = 'x4-planner-plan';

function planKey(id: string): string {
  return `x4-plan:${id}`;
}

function extractMeta(plan: Plan): PlanMeta {
  return {
    id: plan.id,
    name: plan.name,
    gameMode: plan.gameMode,
    tags: plan.tags,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

interface PlanManagerStore {
  planIndex: PlanMeta[];
  currentPlanId: string | null;

  initializePlanManager: () => void;
  createPlan: (name: string, tags: string[], gameMode: GameMode) => void;
  saveCurrentPlan: (plan: Plan) => void;
  loadPlanById: (id: string) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (id: string, newName: string, newTags: string[]) => void;
  updatePlanMeta: (id: string, patch: { name?: string; tags?: string[] }) => void;
}

export const usePlanManagerStore = create<PlanManagerStore>((set, get) => ({
  planIndex: [],
  currentPlanId: null,

  initializePlanManager: () => {
    // Check for legacy format first
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (legacyData) {
      try {
        const parsed = JSON.parse(legacyData);
        const plan: Plan = parsed.state?.plan ?? parsed.plan ?? parsed;

        // Add missing fields for new format
        if (!plan.gameMode) plan.gameMode = 'swi';
        if (!plan.tags) plan.tags = [];

        // Save to new format
        const id = plan.id || nanoid();
        plan.id = id;

        localStorage.setItem(planKey(id), JSON.stringify(plan));

        const meta = extractMeta(plan);
        const index = [meta];
        localStorage.setItem(INDEX_KEY, JSON.stringify(index));
        localStorage.setItem(CURRENT_PLAN_KEY, id);

        // Remove legacy key
        localStorage.removeItem(LEGACY_KEY);

        set({ planIndex: index, currentPlanId: id });

        // Load into planStore
        usePlanStore.getState().loadPlan(plan);
        return;
      } catch (e) {
        console.error('Failed to migrate legacy plan:', e);
      }
    }

    // Load existing index
    const indexJson = localStorage.getItem(INDEX_KEY);
    const index: PlanMeta[] = indexJson ? JSON.parse(indexJson) : [];
    const currentId = localStorage.getItem(CURRENT_PLAN_KEY);

    set({ planIndex: index, currentPlanId: currentId });

    // Load current plan if it exists
    if (currentId) {
      const planJson = localStorage.getItem(planKey(currentId));
      if (planJson) {
        try {
          const plan: Plan = JSON.parse(planJson);
          usePlanStore.getState().loadPlan(plan);
        } catch (e) {
          console.error('Failed to load current plan:', e);
        }
      }
    } else if (index.length === 0) {
      // No plans exist - create a default one
      get().createPlan('New Plan', [], 'swi');
    }
  },

  createPlan: (name, tags, gameMode) => {
    const now = new Date().toISOString();
    const plan: Plan = {
      id: nanoid(),
      name,
      version: 1,
      gameMode,
      tags,
      createdAt: now,
      updatedAt: now,
      sectors: [],
      stations: [],
      connections: [],
    };

    // Save plan data
    localStorage.setItem(planKey(plan.id), JSON.stringify(plan));

    // Update index
    const meta = extractMeta(plan);
    const { planIndex } = get();
    const newIndex = [...planIndex, meta];
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
    localStorage.setItem(CURRENT_PLAN_KEY, plan.id);

    set({ planIndex: newIndex, currentPlanId: plan.id });

    // Load into planStore
    usePlanStore.getState().loadPlan(plan);
  },

  saveCurrentPlan: (plan) => {
    const { currentPlanId, planIndex } = get();
    if (!currentPlanId || plan.id !== currentPlanId) return;

    // Save full plan
    localStorage.setItem(planKey(plan.id), JSON.stringify(plan));

    // Update index metadata
    const newIndex = planIndex.map((m) =>
      m.id === plan.id
        ? { ...m, name: plan.name, tags: plan.tags, updatedAt: plan.updatedAt }
        : m
    );
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
    set({ planIndex: newIndex });
  },

  loadPlanById: (id) => {
    const planJson = localStorage.getItem(planKey(id));
    if (!planJson) return;

    try {
      const plan: Plan = JSON.parse(planJson);
      localStorage.setItem(CURRENT_PLAN_KEY, id);
      set({ currentPlanId: id });
      usePlanStore.getState().loadPlan(plan);
    } catch (e) {
      console.error('Failed to load plan:', e);
    }
  },

  deletePlan: (id) => {
    const { planIndex, currentPlanId } = get();

    // Remove plan data
    localStorage.removeItem(planKey(id));

    // Update index
    const newIndex = planIndex.filter((m) => m.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));

    // If deleting current plan, switch to another or create new
    if (id === currentPlanId) {
      if (newIndex.length > 0) {
        set({ planIndex: newIndex });
        get().loadPlanById(newIndex[0].id);
      } else {
        localStorage.removeItem(CURRENT_PLAN_KEY);
        set({ planIndex: newIndex, currentPlanId: null });
        get().createPlan('New Plan', [], 'swi');
      }
    } else {
      set({ planIndex: newIndex });
    }
  },

  duplicatePlan: (id, newName, newTags) => {
    const planJson = localStorage.getItem(planKey(id));
    if (!planJson) return;

    try {
      const sourcePlan: Plan = JSON.parse(planJson);
      const now = new Date().toISOString();
      const newPlan: Plan = {
        ...sourcePlan,
        id: nanoid(),
        name: newName,
        tags: newTags,
        createdAt: now,
        updatedAt: now,
      };

      // Save new plan
      localStorage.setItem(planKey(newPlan.id), JSON.stringify(newPlan));

      // Update index
      const meta = extractMeta(newPlan);
      const { planIndex } = get();
      const newIndex = [...planIndex, meta];
      localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
      localStorage.setItem(CURRENT_PLAN_KEY, newPlan.id);

      set({ planIndex: newIndex, currentPlanId: newPlan.id });

      // Load into planStore
      usePlanStore.getState().loadPlan(newPlan);
    } catch (e) {
      console.error('Failed to duplicate plan:', e);
    }
  },

  updatePlanMeta: (id, patch) => {
    const { planIndex } = get();

    // Update index
    const newIndex = planIndex.map((m) =>
      m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m
    );
    localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
    set({ planIndex: newIndex });

    // Also update the stored plan data
    const planJson = localStorage.getItem(planKey(id));
    if (planJson) {
      try {
        const plan: Plan = JSON.parse(planJson);
        if (patch.name !== undefined) plan.name = patch.name;
        if (patch.tags !== undefined) plan.tags = patch.tags;
        plan.updatedAt = new Date().toISOString();
        localStorage.setItem(planKey(id), JSON.stringify(plan));

        // If this is the current plan, update planStore too
        const { currentPlanId } = get();
        if (id === currentPlanId) {
          if (patch.name !== undefined) usePlanStore.getState().renamePlan(patch.name);
          // Tags are stored on plan object, update via loadPlan would be heavy
          // Just set directly
          if (patch.tags !== undefined) {
            usePlanStore.setState((state) => ({
              plan: { ...state.plan, tags: patch.tags! },
            }));
          }
        }
      } catch (e) {
        console.error('Failed to update plan meta:', e);
      }
    }
  },
}));
