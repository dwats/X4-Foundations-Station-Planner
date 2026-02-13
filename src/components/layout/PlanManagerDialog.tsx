import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { PlanEditDialog } from './PlanEditDialog';
import { usePlanManagerStore } from '@/store/planManagerStore';
import { usePlanStore } from '@/store';
import type { GameMode } from '@/types';

interface PlanManagerDialogProps {
  open: boolean;
  onClose: () => void;
  gameMode: GameMode;
}

export function PlanManagerDialog({ open, onClose, gameMode }: PlanManagerDialogProps) {
  const planIndex = usePlanManagerStore((s) => s.planIndex);
  const currentPlanId = usePlanManagerStore((s) => s.currentPlanId);
  const loadPlanById = usePlanManagerStore((s) => s.loadPlanById);
  const deletePlan = usePlanManagerStore((s) => s.deletePlan);
  const createPlan = usePlanManagerStore((s) => s.createPlan);
  const duplicatePlan = usePlanManagerStore((s) => s.duplicatePlan);
  const updatePlanMeta = usePlanManagerStore((s) => s.updatePlanMeta);
  const currentPlan = usePlanStore((s) => s.plan);

  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<{ id: string; name: string; tags: string[] } | null>(null);

  // Filter plans by game mode and search
  const filteredPlans = planIndex
    .filter((p) => p.gameMode === gameMode)
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleLoadPlan = (id: string) => {
    loadPlanById(id);
    onClose();
  };

  const handleDeletePlan = (id: string) => {
    deletePlan(id);
    setConfirmDeleteId(null);
  };

  const handleNewPlan = (name: string, tags: string[]) => {
    createPlan(name, tags, gameMode);
    setNewPlanOpen(false);
    onClose();
  };

  const handleSaveAs = (name: string, tags: string[]) => {
    if (currentPlanId) {
      duplicatePlan(currentPlanId, name, tags);
    }
    setSaveAsOpen(false);
    onClose();
  };

  const handleEditMeta = (name: string, tags: string[]) => {
    if (editingPlan) {
      updatePlanMeta(editingPlan.id, { name, tags });
      setEditingPlan(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Plans"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setNewPlanOpen(true)}
              className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              New Plan
            </button>
            <button
              onClick={() => setSaveAsOpen(true)}
              disabled={!currentPlanId}
              className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Save As
            </button>
          </>
        }
      >
        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name or tag..."
            className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Plan list */}
        <div className="space-y-1">
          {filteredPlans.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {search ? 'No plans match your search.' : 'No plans yet. Create one!'}
            </p>
          )}
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                plan.id === currentPlanId
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-muted border border-transparent'
              }`}
              onClick={() => handleLoadPlan(plan.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{plan.name}</span>
                  {plan.id === currentPlanId && (
                    <span className="text-xs text-primary font-medium">(current)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {plan.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {plan.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-secondary text-secondary-foreground rounded-full px-1.5 py-0 text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDate(plan.updatedAt)}</span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setEditingPlan({ id: plan.id, name: plan.name, tags: plan.tags })}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Edit name & tags"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                {confirmDeleteId === plan.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="px-2 py-0.5 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(plan.id)}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                    title="Delete plan"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* New Plan Dialog */}
      <PlanEditDialog
        open={newPlanOpen}
        onClose={() => setNewPlanOpen(false)}
        onSubmit={handleNewPlan}
        title="New Plan"
        submitLabel="Create"
      />

      {/* Save As Dialog */}
      <PlanEditDialog
        open={saveAsOpen}
        onClose={() => setSaveAsOpen(false)}
        onSubmit={handleSaveAs}
        title="Save As"
        submitLabel="Save"
        initialName={currentPlan ? `${currentPlan.name} (copy)` : ''}
        initialTags={currentPlan?.tags ?? []}
      />

      {/* Edit Meta Dialog */}
      {editingPlan && (
        <PlanEditDialog
          open={true}
          onClose={() => setEditingPlan(null)}
          onSubmit={handleEditMeta}
          title="Edit Plan"
          submitLabel="Save"
          initialName={editingPlan.name}
          initialTags={editingPlan.tags}
        />
      )}
    </>
  );
}
