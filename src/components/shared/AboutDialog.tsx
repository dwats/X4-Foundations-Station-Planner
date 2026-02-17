import { Modal } from './Modal';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="About Station Planner" size="sm">
      <div className="space-y-4 text-sm">
        <p className="text-foreground">Vibed by dwats</p>

        <div>
          <a
            href="https://github.com/dwats/Station-Planner-For-X4-Foundations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
            aria-label="GitHub Repository"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Built with
          </h3>
          <ul className="space-y-0.5 text-foreground">
            <li><a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">React</a></li>
            <li><a href="https://reactflow.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">React Flow</a></li>
            <li><a href="https://zustand.docs.pmnd.rs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Zustand</a></li>
            <li><a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Tailwind CSS</a></li>
            <li><a href="https://vite.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vite</a></li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
