'use client';

import { Trash2 } from 'lucide-react';

interface RemoveSectionFooterProps {
  onRemove: () => void;
}

export function RemoveSectionFooter({ onRemove }: RemoveSectionFooterProps) {
  return (
    <div className="border-t border-zinc-200 px-4 py-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-1 text-sm font-medium text-red-700 hover:text-red-800"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
        Remove section
      </button>
    </div>
  );
}
