'use client';

import { memo } from 'react';
import type { SectionSetting } from '@zodyk/core';
import { Input, Label, Checkbox, cn } from '@zodyk/shared-ui';
import { useCustomizerControls } from '../../providers/CustomizerProvider';

interface SettingControlFactoryProps {
  setting: SectionSetting;
  value: unknown;
  onChange: (value: unknown) => void;
}

function SettingControlFactoryInner({ setting, value, onChange }: SettingControlFactoryProps) {
  const controls = useCustomizerControls();
  const id = `setting-${setting.id ?? setting.type}`;

  if (setting.type === 'header' || setting.type === 'paragraph') return null;

  const injected = controls[setting.type as keyof typeof controls];
  if (injected) {
    const Injected = injected;
    return <Injected setting={setting} value={value} onChange={onChange} />;
  }

  switch (setting.type) {
    case 'text':
    case 'url':
    case 'video':
    case 'video_url':
      return (
        <FieldWrapper setting={setting} id={id}>
          <Input
            id={id}
            value={typeof value === 'string' ? value : ''}
            placeholder={setting.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrapper>
      );
    case 'number':
      return (
        <FieldWrapper setting={setting} id={id}>
          <Input
            id={id}
            type="number"
            value={typeof value === 'number' ? value : Number(value ?? setting.default ?? 0)}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </FieldWrapper>
      );
    case 'textarea':
      return (
        <FieldWrapper setting={setting} id={id}>
          <textarea
            id={id}
            rows={3}
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            placeholder={setting.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrapper>
      );
    case 'richtext':
    case 'inline_richtext':
      return (
        <FieldWrapper setting={setting} id={id}>
          <textarea
            id={id}
            rows={6}
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrapper>
      );
    case 'color':
      return (
        <FieldWrapper setting={setting} id={id}>
          <div className="flex gap-2">
            <input
              id={id}
              type="color"
              className="h-9 w-12 cursor-pointer rounded border border-zinc-200"
              value={typeof value === 'string' ? value : '#000000'}
              onChange={(e) => onChange(e.target.value)}
            />
            <Input
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1"
            />
          </div>
        </FieldWrapper>
      );
    case 'checkbox':
      return (
        <div className="flex items-center justify-between gap-4">
          {setting.label && (
            <Label htmlFor={id} className="text-sm font-normal text-zinc-900">
              {setting.label}
            </Label>
          )}
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );
    case 'range': {
      const num = typeof value === 'number' ? value : Number(setting.default ?? setting.min ?? 0);
      return (
        <FieldWrapper setting={setting} id={id}>
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="range"
              className="flex-1"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={num}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <Input
              type="number"
              className="w-16"
              value={num}
              min={setting.min}
              max={setting.max}
              step={setting.step}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            {setting.unit && <span className="text-xs text-zinc-500">{setting.unit}</span>}
          </div>
        </FieldWrapper>
      );
    }
    case 'select':
      return (
        <FieldWrapper setting={setting} id={id}>
          <select
            id={id}
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
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
        </FieldWrapper>
      );
    case 'radio':
    case 'text_alignment':
      return (
        <FieldWrapper setting={setting} id={id}>
          <div className="flex rounded-md border border-zinc-200 p-0.5">
            {setting.options?.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  'flex-1 rounded px-2 py-1 text-xs font-medium',
                  value === opt.value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50',
                )}
                onClick={() => onChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FieldWrapper>
      );
    case 'font_picker':
      return (
        <FieldWrapper setting={setting} id={id}>
          <select
            id={id}
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Default</option>
            {['sans-serif', 'serif', 'monospace', 'Inter', 'Georgia', 'Helvetica'].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </FieldWrapper>
      );
    case 'color_background': {
      const bg = (value as { color?: string; gradient?: string }) ?? {};
      return (
        <FieldWrapper setting={setting} id={id}>
          <Input
            value={bg.color ?? ''}
            placeholder="Color"
            onChange={(e) => onChange({ ...bg, color: e.target.value })}
            className="mb-2"
          />
          <Input
            value={bg.gradient ?? ''}
            placeholder="Gradient CSS"
            onChange={(e) => onChange({ ...bg, gradient: e.target.value })}
          />
        </FieldWrapper>
      );
    }
    case 'spacing': {
      const sp = (value as Record<string, number>) ?? {};
      return (
        <FieldWrapper setting={setting} id={id}>
          <div className="grid grid-cols-2 gap-2">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <div key={side}>
                <Label className="text-xs capitalize">{side}</Label>
                <Input
                  type="number"
                  value={sp[side] ?? 0}
                  onChange={(e) => onChange({ ...sp, [side]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
        </FieldWrapper>
      );
    }
    case 'typography': {
      const ty = (value as Record<string, unknown>) ?? {};
      return (
        <FieldWrapper setting={setting} id={id}>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Font"
              value={String(ty.font ?? '')}
              onChange={(e) => onChange({ ...ty, font: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Size"
              value={Number(ty.size ?? 16)}
              onChange={(e) => onChange({ ...ty, size: Number(e.target.value) })}
            />
          </div>
        </FieldWrapper>
      );
    }
    case 'image':
    case 'gallery':
    case 'file':
    case 'page':
    case 'page_relation':
    case 'metaobject':
    case 'meta_object_relation':
    case 'link_list':
    case 'product':
    case 'collection':
    case 'article':
    case 'blog':
      return (
        <FieldWrapper setting={setting} id={id}>
          <Input
            value={value != null ? String(value) : ''}
            placeholder="Coming soon — enter ID"
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrapper>
      );
    case 'repeater':
      return (
        <FieldWrapper setting={setting} id={id}>
          <p className="text-xs text-zinc-500">Repeater editor coming soon</p>
        </FieldWrapper>
      );
    default:
      return (
        <FieldWrapper setting={setting} id={id}>
          <Input
            value={value != null ? String(value) : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrapper>
      );
  }
}

function FieldWrapper({
  setting,
  id,
  children,
}: {
  setting: SectionSetting;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {setting.label && (
        <Label htmlFor={id} className="text-xs font-medium text-zinc-700">
          {setting.label}
        </Label>
      )}
      {children}
      {setting.info && <p className="text-xs text-zinc-500">{setting.info}</p>}
    </div>
  );
}

export const SettingControlFactory = memo(SettingControlFactoryInner);
