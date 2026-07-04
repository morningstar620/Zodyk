'use client';

import { cn } from '@zodyk/shared-ui';
import {
  Home,
  LayoutGrid,
  LayoutTemplate,
  MoreHorizontal,
  MousePointerSquareDashed,
  PanelLeft,
  Redo2,
  Settings,
  Smartphone,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { useCustomizerStore } from '../../store';
import type { PageOption } from '../../store';

const TOOLBAR_ICON = 'h-4 w-4 stroke-[1.75]';
const TOOLBAR_ICON_BTN = 'h-8 w-8';

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 21 20"
      focusable="false"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.177 3H14.83c.535 0 .98 0 1.345.03.38.03.736.098 1.073.27a2.75 2.75 0 0 1 1.202 1.202c.172.337.24.693.27 1.073.03.365.03.81.03 1.345v5.91c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.073a2.75 2.75 0 0 1-1.201 1.202c-.338.172-.694.24-1.074.27-.365.03-.81.03-1.345.03H9.963c-.196 0-.347 0-.483-.013a2.75 2.75 0 0 1-2.467-2.467C7 14.134 7 13.983 7 13.787v-.037a.75.75 0 0 1 1.5 0c0 .25 0 .32.006.373a1.25 1.25 0 0 0 1.121 1.121c.052.005.123.006.373.006h4.8c.572 0 .957 0 1.252-.025.288-.023.425-.065.515-.111a1.25 1.25 0 0 0 .547-.546c.046-.091.088-.228.111-.515.024-.296.025-.68.025-1.253V6.95c0-.572 0-.957-.025-1.252-.023-.288-.065-.425-.111-.515a1.25 1.25 0 0 0-.547-.547l.339-.663-.338.663c-.091-.046-.228-.088-.516-.111-.295-.024-.68-.025-1.252-.025h-4.55c-.5 0-.641.004-.744.024a1.25 1.25 0 0 0-.982.982c-.02.103-.024.243-.024.744a.75.75 0 0 1-1.5 0v-.073c0-.393 0-.696.053-.963a2.75 2.75 0 0 1 2.16-2.161C9.482 3 9.784 3 10.178 3ZM4.56 10.5l.97.97a.75.75 0 0 1-1.061 1.06l-2.25-2.25a.75.75 0 0 1 0-1.06l2.25-2.25a.75.75 0 1 1 1.06 1.06L4.56 9h6.69a.75.75 0 0 1 0 1.5H4.56Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface TopToolbarProps {
  themeStatus: 'live' | 'draft' | 'archived';
  pages: PageOption[];
  onPageSelect: (page: PageOption) => void;
  onSave: () => void;
  onPublish: () => void;
  publishing: boolean;
  saveSucceeded?: boolean;
}

function ToolbarIconButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-md transition-colors border border-zinc-200 p-1',
        TOOLBAR_ICON_BTN,
        active ? 'bg-zinc-100 text-blue-600' : 'text-zinc-700 hover:bg-zinc-200',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}

export function TopToolbar({
  themeStatus,
  pages,
  onPageSelect,
  onSave,
  onPublish,
  publishing,
  saveSucceeded = false,
}: TopToolbarProps) {
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const {
    themeMeta,
    mode,
    device,
    page,
    dirty,
    saving,
    inspectorMode,
    setMode,
    setDevice,
    setInspectorMode,
    undo,
    redo,
    undoStack,
    redoStack,
  } = useCustomizerStore();

  const isMobile = device === 'mobile';

  return (
    <header className="sticky top-0 z-50 flex h-12 w-full shrink-0 items-center border-b border-zinc-200 bg-white px-2">
      {/* Left: back + mode icons */}
      <div className="flex flex-1 items-center gap-3 min-h-[56px]">
        <a
          href="/themes"
          className={cn(
            'flex items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 border border-zinc-200 p-1',
            TOOLBAR_ICON_BTN,
          )}
          title="Exit customizer"
        >
          <BackIcon className={TOOLBAR_ICON} />
        </a>

        <nav aria-label="Customizer modes">
          <ul className="flex list-none items-center gap-2 p-0 m-0">
            <li>
              <ToolbarIconButton
                active={mode === 'sections'}
                title="Sections"
                onClick={() => setMode('sections')}
              >
                <PanelLeft className={TOOLBAR_ICON} />
              </ToolbarIconButton>
            </li>
            <li>
              <ToolbarIconButton
                active={mode === 'theme_settings'}
                title="Theme settings"
                onClick={() => setMode('theme_settings')}
              >
                <Settings className={TOOLBAR_ICON} />
              </ToolbarIconButton>
            </li>
            <li>
              <ToolbarIconButton disabled title="Apps — coming soon">
                <LayoutGrid className={TOOLBAR_ICON} />
              </ToolbarIconButton>
            </li>
          </ul>
        </nav>
      </div>

      {/* Center: theme name + status, template switcher */}
      <div className="flex shrink-0 items-center justify-center gap-5 whitespace-nowrap px-2">
        <div className="flex items-center gap-2">
          <LayoutTemplate className={cn(TOOLBAR_ICON, 'shrink-0 text-zinc-500')} />
          <span className="max-w-[160px] truncate text-sm font-medium text-zinc-900">
            {themeMeta.themeName}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              themeStatus === 'live'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-zinc-100 text-zinc-600',
            )}
          >
            {themeStatus === 'live' ? 'Active' : 'Draft'}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-zinc-800 hover:bg-zinc-100"
            onClick={() => setPagePickerOpen((v) => !v)}
          >
            <Home className={cn(TOOLBAR_ICON, 'text-zinc-500')} />
            <span className="max-w-[140px] truncate">{page?.label ?? 'Select page'}</span>
          </button>
          {pagePickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPagePickerOpen(false)} />
              <div className="absolute left-1/2 top-full z-50 mt-1 max-h-80 w-64 -translate-x-1/2 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cn(
                      'block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50',
                      page?.id === p.id && 'bg-zinc-50 font-medium',
                    )}
                    onClick={() => {
                      onPageSelect(p);
                      setPagePickerOpen(false);
                    }}
                  >
                    <span className="text-xs text-zinc-400">{p.group}</span>
                    <br />
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: inspector, mobile, undo/redo, more, save */}
      <div className="flex flex-1 items-center justify-end gap-0.5">
        <ToolbarIconButton
          active={inspectorMode}
          title="Inspector"
          onClick={() => setInspectorMode(!inspectorMode)}
        >
          <MousePointerSquareDashed className={TOOLBAR_ICON} />
        </ToolbarIconButton>

        <ToolbarIconButton
          active={isMobile}
          title={isMobile ? 'Desktop preview' : 'Mobile preview'}
          onClick={() => setDevice(isMobile ? 'desktop' : 'mobile')}
        >
          <Smartphone className={TOOLBAR_ICON} />
        </ToolbarIconButton>

        <div className="mx-1 h-8 w-px bg-zinc-200" aria-hidden />

        <ToolbarIconButton
          disabled={undoStack.length === 0}
          title="Undo"
          onClick={undo}
        >
          <Undo2 className={TOOLBAR_ICON} />
        </ToolbarIconButton>

        <ToolbarIconButton
          disabled={redoStack.length === 0}
          title="Redo"
          onClick={redo}
        >
          <Redo2 className={TOOLBAR_ICON} />
        </ToolbarIconButton>

        <div className="relative">
          <ToolbarIconButton title="More actions" onClick={() => setMoreOpen((v) => !v)}>
            <MoreHorizontal className={TOOLBAR_ICON} />
          </ToolbarIconButton>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                <a
                  href={`/themes/${themeMeta.themeId}/code`}
                  className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Edit code
                </a>
                {themeStatus === 'draft' && (
                  <button
                    type="button"
                    disabled={publishing}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    onClick={() => {
                      onPublish();
                      setMoreOpen(false);
                    }}
                  >
                    {publishing ? 'Publishing…' : 'Publish theme'}
                  </button>
                )}
                <div className="px-3 py-2 text-xs text-zinc-400">
                  ⌘S Save · ⌘Z Undo · Esc Close
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          disabled={saving || !dirty}
          onClick={onSave}
          className={cn(
            'relative ml-1.5 flex h-8 items-center rounded-md px-4 text-sm font-medium text-white',
            'border border-solid border-blue-500 bg-blue-600 [border-width:1px_2px_2px_1px]',
            'shadow-[inset_1px_1px_0_#93c5fd]',
            'transition-[background-color,box-shadow,transform] duration-150',
            'hover:bg-blue-700',
            'active:translate-y-px active:shadow-[inset_1px_1px_0_#60a5fa]',
            'disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-100 disabled:text-blue-300 disabled:shadow-none disabled:active:translate-y-0',
          )}
        >
          {dirty && !saveSucceeded && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-lg bg-orange-400 ring-2 ring-white" />
          )}
          {saving ? 'Saving…' : saveSucceeded ? 'Saved' : 'Save'}
        </button>
      </div>
    </header>
  );
}
