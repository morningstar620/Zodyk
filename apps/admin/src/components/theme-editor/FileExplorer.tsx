'use client';

interface FileExplorerProps {
  tree: Record<string, unknown>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onCreateFile: () => void;
  newFileOpen: boolean;
  newFilePath: string;
  onNewFilePathChange: (value: string) => void;
  onCreateFileSubmit: () => void;
  onCancelCreate: () => void;
}

function TreeNode({
  name,
  node,
  selectedPath,
  onSelect,
  prefix = '',
}: {
  name: string;
  node: unknown;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  prefix?: string;
}) {
  const fullName = prefix ? `${prefix}/${name}` : name;

  if (typeof node === 'string') {
    return (
      <button
        type="button"
        className={`block w-full truncate px-2 py-1 text-left text-sm ${
          selectedPath === node ? 'bg-blue-50 text-blue-700' : 'text-zinc-700 hover:bg-zinc-100'
        }`}
        onClick={() => onSelect(node)}
      >
        {name}
      </button>
    );
  }

  const children = node as Record<string, unknown>;
  return (
    <details open className="pl-2">
      <summary className="cursor-pointer py-1 text-sm font-medium text-zinc-600">{name}</summary>
      {Object.entries(children).map(([childName, childNode]) => (
        <TreeNode
          key={childName}
          name={childName}
          node={childNode}
          selectedPath={selectedPath}
          onSelect={onSelect}
          prefix={fullName}
        />
      ))}
    </details>
  );
}

export function FileExplorer({
  tree,
  selectedPath,
  onSelect,
  onCreateFile,
  newFileOpen,
  newFilePath,
  onNewFilePathChange,
  onCreateFileSubmit,
  onCancelCreate,
}: FileExplorerProps) {
  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-2">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-xs font-semibold uppercase text-zinc-500">Explorer</p>
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline"
          onClick={onCreateFile}
        >
          + New
        </button>
      </div>
      {newFileOpen && (
        <div className="mb-2 space-y-1 rounded border border-zinc-200 p-2">
          <input
            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
            placeholder="sections/foo.liquid"
            value={newFilePath}
            onChange={(e) => onNewFilePathChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCreateFileSubmit();
              if (e.key === 'Escape') onCancelCreate();
            }}
          />
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white"
              onClick={onCreateFileSubmit}
            >
              Add
            </button>
            <button
              type="button"
              className="rounded px-2 py-0.5 text-xs text-zinc-600"
              onClick={onCancelCreate}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {Object.entries(tree).map(([name, node]) => (
        <TreeNode
          key={name}
          name={name}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </aside>
  );
}

export function buildFileTree(paths: string[]) {
  const root: Record<string, unknown> = {};
  for (const path of paths) {
    const parts = path.split('/');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (i === parts.length - 1) {
        (node as Record<string, string>)[part] = path;
      } else {
        if (!node[part]) node[part] = {};
        node = node[part] as Record<string, unknown>;
      }
    }
  }
  return root;
}
