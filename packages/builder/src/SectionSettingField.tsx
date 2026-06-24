'use client';

import type { SectionSetting } from '@zodyk/core';

interface SectionSettingFieldProps {
  setting: SectionSetting;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function SectionSettingField({ setting, value, onChange }: SectionSettingFieldProps) {
  const id = `setting-${setting.id}`;

  switch (setting.type) {
    case 'text':
    case 'url':
      return (
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-xs font-medium text-zinc-700">
            {setting.label}
          </label>
          <input
            id={id}
            type="text"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {setting.info && <p className="text-xs text-zinc-500">{setting.info}</p>}
        </div>
      );
    case 'textarea':
    case 'richtext':
      return (
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-xs font-medium text-zinc-700">
            {setting.label}
          </label>
          <textarea
            id={id}
            rows={setting.type === 'richtext' ? 6 : 3}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case 'color':
      return (
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-xs font-medium text-zinc-700">
            {setting.label}
          </label>
          <input
            id={id}
            type="color"
            className="h-9 w-full cursor-pointer rounded border border-zinc-300"
            value={typeof value === 'string' ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {setting.label}
        </label>
      );
    case 'range': {
      const num = typeof value === 'number' ? value : Number(setting.default ?? setting.min ?? 0);
      return (
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-xs font-medium text-zinc-700">
            {setting.label}: {num}
          </label>
          <input
            id={id}
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={num}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    }
    case 'select':
      return (
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-xs font-medium text-zinc-700">
            {setting.label}
          </label>
          <select
            id={id}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {setting.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">{setting.label}</label>
          <input
            type="text"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={value != null ? String(value) : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}
