'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@zodyk/shared-ui';
import {
  Copy,
  Code2,
  CopyPlus,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { getSectionIcon } from '../../lib/section-icons';
import { useCustomizerStore } from '../../store';

interface SettingsHeaderProps {
  targetId: string;
  type: string;
  category?: string;
  schemaName: string;
  breadcrumb?: string;
  onClose: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
  showRemoveInMenu?: boolean;
}

export function SettingsHeader({
  targetId,
  type,
  category,
  schemaName,
  breadcrumb,
  onClose,
  onRemove,
  onDuplicate,
  showRemoveInMenu = true,
}: SettingsHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { editorMeta, setDisplayName, themeMeta, toggleSectionHidden, isSectionHidden } =
    useCustomizerStore();
  const Icon = getSectionIcon(type, category);
  const displayName = editorMeta.displayNames[targetId] ?? schemaName;
  const hidden = isSectionHidden(targetId);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className="sticky top-0 z-10 shrink-0 border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
        {editing ? (
          <input
            ref={inputRef}
            className="min-w-0 flex-1 rounded border border-zinc-200 px-2 py-0.5 text-sm font-medium"
            defaultValue={displayName}
            onBlur={(e) => {
              setDisplayName(targetId, e.target.value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setDisplayName(targetId, e.currentTarget.value);
                setEditing(false);
              }
            }}
          />
        ) : (
          <div className="min-w-0 flex-1">
            {breadcrumb && <p className="truncate text-xs text-zinc-400">{breadcrumb}</p>}
            <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
          </div>
        )}
        <div className="relative flex items-center gap-0.5">
          <button
            type="button"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
                <MenuItem icon={Copy} label="Copy" onClick={() => setMenuOpen(false)} />
                {onDuplicate && (
                  <MenuItem
                    icon={CopyPlus}
                    label="Duplicate"
                    onClick={() => {
                      onDuplicate();
                      setMenuOpen(false);
                    }}
                  />
                )}
                <MenuItem
                  icon={Pencil}
                  label="Rename"
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                />
                <MenuItem
                  icon={hidden ? Eye : EyeOff}
                  label={hidden ? 'Show' : 'Hide'}
                  onClick={() => {
                    toggleSectionHidden(targetId);
                    setMenuOpen(false);
                  }}
                />
                <MenuItem
                  icon={Code2}
                  label="Edit code"
                  onClick={() => {
                    window.open(
                      `/themes/${themeMeta.themeId}/code?file=sections/${type}.liquid`,
                      '_blank',
                    );
                    setMenuOpen(false);
                  }}
                />
                {showRemoveInMenu && onRemove && (
                  <MenuItem
                    icon={Trash2}
                    label="Remove"
                    className="text-red-600"
                    onClick={() => {
                      onRemove();
                      setMenuOpen(false);
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn('flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50', className)}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
