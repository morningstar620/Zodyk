'use client';

interface OpenTab {
  path: string;
  dirty: boolean;
}

interface EditorTabsProps {
  tabs: OpenTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function EditorTabs({ tabs, activePath, onSelect, onClose }: EditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex shrink-0 overflow-x-auto border-b border-zinc-200 bg-zinc-50">
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        const name = tab.path.split('/').pop() ?? tab.path;
        return (
          <div
            key={tab.path}
            className={`group flex max-w-[200px] shrink-0 items-center gap-1 border-r border-zinc-200 px-3 py-1.5 text-xs ${
              active ? 'bg-white text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <button type="button" className="truncate" onClick={() => onSelect(tab.path)}>
              {name}
              {tab.dirty ? ' •' : ''}
            </button>
            <button
              type="button"
              className="hidden rounded px-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 group-hover:inline"
              onClick={() => onClose(tab.path)}
              aria-label={`Close ${name}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
