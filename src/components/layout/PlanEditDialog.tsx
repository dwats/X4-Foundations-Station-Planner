import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { TagInput } from '@/components/shared/TagInput';

interface PlanEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, tags: string[]) => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialTags?: string[];
}

export function PlanEditDialog({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel,
  initialName = '',
  initialTags = [],
}: PlanEditDialogProps) {
  const [name, setName] = useState(initialName);
  const [tags, setTags] = useState<string[]>(initialTags);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, tags);
    setName('');
    setTags([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Plan Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="My Station Plan"
            autoFocus
            className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>
      </div>
    </Modal>
  );
}
