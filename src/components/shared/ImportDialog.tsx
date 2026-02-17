import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { importPlan } from '@/lib/importPlan';
import type { Plan } from '@/types/plan';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (plan: Plan) => void;
}

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validatedPlan, setValidatedPlan] = useState<Plan | null>(null);

  const handleValidate = () => {
    setError(null);
    setValidatedPlan(null);

    if (!input.trim()) {
      setError('Please paste the exported plan data');
      return;
    }

    const result = importPlan(input.trim());
    if (result.success) {
      setValidatedPlan(result.plan);
    } else {
      setError(result.error);
    }
  };

  const handleImport = () => {
    if (validatedPlan) {
      onImport(validatedPlan);
      // Reset state
      setInput('');
      setError(null);
      setValidatedPlan(null);
      onClose();
    }
  };

  const handleClose = () => {
    // Reset state on close
    setInput('');
    setError(null);
    setValidatedPlan(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Plan"
      size="md"
      footer={
        <>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          {!validatedPlan ? (
            <button
              onClick={handleValidate}
              className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Validate
            </button>
          ) : (
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Import
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-foreground mb-1">Paste Exported Data</div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Clear validation state when input changes
              setError(null);
              setValidatedPlan(null);
            }}
            placeholder="Paste the base64-encoded plan data here..."
            className="w-full h-48 px-3 py-2 text-xs font-mono rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        {validatedPlan && (
          <div className="text-sm bg-primary/10 border border-primary/30 rounded px-3 py-2 space-y-1">
            <div className="font-medium text-foreground">Plan validated successfully!</div>
            <div className="text-muted-foreground">
              <div><span className="font-medium">Name:</span> {validatedPlan.name}</div>
              <div><span className="font-medium">Stations:</span> {validatedPlan.stations.length}</div>
              <div><span className="font-medium">Sectors:</span> {validatedPlan.sectors.length}</div>
              <div><span className="font-medium">Connections:</span> {validatedPlan.connections.length}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
