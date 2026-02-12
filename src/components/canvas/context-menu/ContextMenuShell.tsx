import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/store';
import { STATION_INPUT_ID, STATION_OUTPUT_ID } from '@/types/plan';
import { NetworkPaneMenu } from './menus/NetworkPaneMenu';
import { StationPaneMenu } from './menus/StationPaneMenu';
import { StationNodeMenu } from './menus/StationNodeMenu';
import { SectorNodeMenu } from './menus/SectorNodeMenu';
import { ModuleNodeMenu } from './menus/ModuleNodeMenu';
import { StationIOMenu } from './menus/StationIOMenu';
import { ConnectionEdgeMenu } from './menus/ConnectionEdgeMenu';

export function ContextMenuShell() {
  const contextMenu = useUIStore((state) => state.contextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to keep menu within viewport
  const getAdjustedPosition = useCallback(() => {
    if (!contextMenu || !menuRef.current) return { left: 0, top: 0 };

    const menuRect = menuRef.current.getBoundingClientRect();
    let { x, y } = contextMenu;

    // Prevent overflow on right edge
    if (x + menuRect.width > window.innerWidth) {
      x = window.innerWidth - menuRect.width - 8;
    }
    // Prevent overflow on bottom edge
    if (y + menuRect.height > window.innerHeight) {
      y = window.innerHeight - menuRect.height - 8;
    }
    // Prevent overflow on left/top
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    return { left: x, top: y };
  }, [contextMenu]);

  // Close on outside click
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };

    // Use setTimeout to avoid the same click that opened the menu from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu, closeContextMenu]);

  // Close on Escape
  useEffect(() => {
    if (!contextMenu) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const { target } = contextMenu;

  // Render the correct content based on target
  const renderContent = () => {
    if (target.type === 'pane') {
      if (target.viewMode === 'network') return <NetworkPaneMenu />;
      if (target.viewMode === 'station') return <StationPaneMenu />;
    }

    if (target.type === 'node') {
      if (target.viewMode === 'network') {
        if (target.nodeType === 'station') return <StationNodeMenu nodeId={target.nodeId} />;
        if (target.nodeType === 'sector') return <SectorNodeMenu nodeId={target.nodeId} />;
      }
      if (target.viewMode === 'station') {
        if (target.nodeId === STATION_INPUT_ID || target.nodeId === STATION_OUTPUT_ID) {
          return <StationIOMenu nodeId={target.nodeId} />;
        }
        if (target.nodeType === 'module') return <ModuleNodeMenu nodeId={target.nodeId} />;
      }
    }

    if (target.type === 'edge') {
      return <ConnectionEdgeMenu edgeId={target.edgeId} viewMode={target.viewMode} />;
    }

    return null;
  };

  const content = renderContent();
  if (!content) return null;

  // Determine width class based on menu type
  const isStationPane = target.type === 'pane' && target.viewMode === 'station';
  const widthClass = isStationPane ? 'min-w-[240px] max-w-[280px]' : 'min-w-[160px]';

  const pos = getAdjustedPosition();

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 ${widthClass} rounded-md border border-border bg-popover shadow-lg`}
      style={{ left: pos.left || contextMenu.x, top: pos.top || contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-1">
        {content}
      </div>
    </div>
  );
}
