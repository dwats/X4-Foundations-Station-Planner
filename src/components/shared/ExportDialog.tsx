import { useMemo } from 'react';
import { Modal } from '@/components/shared/Modal';
import { exportPlan } from '@/lib/exportPlan';
import { useUIStore } from '@/store';
import type { Plan } from '@/types/plan';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  plan: Plan;
}

export function ExportDialog({ open, onClose, plan }: ExportDialogProps) {
  const showToast = useUIStore((s) => s.showToast);

  const base64String = useMemo(() => exportPlan(plan), [plan]);

  const encodedSize = useMemo(() => {
    const bytes = base64String.length;
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }, [base64String]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(base64String);
      showToast('Copied to clipboard!', 'success');
      onClose();
    } catch (error) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Plan"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Copy to Clipboard
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-foreground mb-1">Plan Name</div>
          <div className="text-sm text-muted-foreground">{plan.name}</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium text-foreground">Exported Data</div>
            <div className="text-xs text-muted-foreground">{encodedSize}</div>
          </div>
          <textarea
            readOnly
            value={base64String}
            className="w-full h-48 px-3 py-2 text-xs font-mono rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            onClick={(e) => e.currentTarget.select()}
          />
          <div className="text-xs text-muted-foreground mt-1">
            Click to select all, then copy manually or use the button below
          </div>
        </div>
      </div>
    </Modal>
  );
}
