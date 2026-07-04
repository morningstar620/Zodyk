'use client';

import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@zodyk/shared-ui';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const TEXT_COLORS = [
  '#000000',
  '#374151',
  '#6b7280',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
];

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
        active && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

function HtmlSourceView({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(value.split('\n').length, 1);

  const syncGutterScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex min-h-[280px] overflow-hidden">
      <div
        ref={gutterRef}
        className="min-w-[2.75rem] shrink-0 overflow-hidden border-r border-border bg-muted/30 py-3 pl-2 pr-3 text-right select-none"
        aria-hidden
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <div
            key={index}
            className="font-mono text-sm leading-6 text-muted-foreground tabular-nums"
          >
            {index + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncGutterScroll}
        className="min-h-[280px] flex-1 resize-y bg-transparent px-4 py-3 font-mono text-sm leading-6 text-foreground focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value);
  const [moreOpen, setMoreOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [headingOpen, setHeadingOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-md' } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder ?? 'Write content…',
      }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          'tiptap min-h-[280px] px-4 py-3 focus:outline-none [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!moreOpen && !colorOpen && !headingOpen && !alignOpen) return;

    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreRef.current?.contains(target)) return;
      if (colorRef.current?.contains(target)) return;
      if (headingRef.current?.contains(target)) return;
      if (alignRef.current?.contains(target)) return;
      setMoreOpen(false);
      setColorOpen(false);
      setHeadingOpen(false);
      setAlignOpen(false);
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreOpen, colorOpen, headingOpen, alignOpen]);

  const toggleSourceMode = useCallback(() => {
    if (sourceMode) {
      editor?.commands.setContent(sourceHtml || '', { emitUpdate: true });
      onChange(sourceHtml);
      setSourceMode(false);
      return;
    }
    const html = editor?.getHTML() ?? value;
    setSourceHtml(html);
    setSourceMode(true);
  }, [sourceMode, sourceHtml, editor, value, onChange]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const headingLabel = () => {
    if (!editor) return 'Paragraph';
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    if (editor.isActive('heading', { level: 4 })) return 'Heading 4';
    if (editor.isActive('heading', { level: 5 })) return 'Heading 5';
    if (editor.isActive('heading', { level: 6 })) return 'Heading 6';
    return 'Paragraph';
  };

  if (!editor) return null;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <div ref={headingRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setHeadingOpen((o) => !o);
              setColorOpen(false);
              setAlignOpen(false);
              setMoreOpen(false);
            }}
            className="flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-sm text-foreground hover:bg-muted"
          >
            <Pilcrow className="h-4 w-4" />
            <span className="hidden sm:inline">{headingLabel()}</span>
          </button>
          {headingOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
              {[
                { label: 'Paragraph', action: () => editor.chain().focus().setParagraph().run() },
                { label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
                { label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
                { label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
                { label: 'Heading 4', action: () => editor.chain().focus().toggleHeading({ level: 4 }).run() },
                { label: 'Heading 5', action: () => editor.chain().focus().toggleHeading({ level: 5 }).run() },
                { label: 'Heading 6', action: () => editor.chain().focus().toggleHeading({ level: 6 }).run() },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.action();
                    setHeadingOpen(false);
                  }}
                  className="flex w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarDivider />

        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <div ref={colorRef} className="relative">
          <ToolbarButton
            title="Text color"
            onClick={() => {
              setColorOpen((o) => !o);
              setHeadingOpen(false);
              setAlignOpen(false);
              setMoreOpen(false);
            }}
          >
            <span className="text-sm font-bold underline decoration-primary decoration-2">A</span>
          </ToolbarButton>
          {colorOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-border bg-card p-2 shadow-lg">
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setColorOpen(false);
                    }}
                    className="h-6 w-6 cursor-pointer rounded border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setColorOpen(false);
                }}
                className="mt-2 w-full cursor-pointer rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                Remove color
              </button>
            </div>
          )}
        </div>

        <ToolbarDivider />

        <div ref={alignRef} className="relative">
          <ToolbarButton
            title="Alignment"
            onClick={() => {
              setAlignOpen((o) => !o);
              setHeadingOpen(false);
              setColorOpen(false);
              setMoreOpen(false);
            }}
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          {alignOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 flex overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {[
                { icon: AlignLeft, align: 'left' as const },
                { icon: AlignCenter, align: 'center' as const },
                { icon: AlignRight, align: 'right' as const },
                { icon: AlignJustify, align: 'justify' as const },
              ].map(({ icon: Icon, align }) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setTextAlign(align).run();
                    setAlignOpen(false);
                  }}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-muted"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Image" onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Table" onClick={addTable}>
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <div ref={moreRef} className="relative">
          <ToolbarButton
            title="More"
            onClick={() => {
              setMoreOpen((o) => !o);
              setHeadingOpen(false);
              setColorOpen(false);
              setAlignOpen(false);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </ToolbarButton>
          {moreOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleBulletList().run();
                  setMoreOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
              >
                <List className="h-4 w-4" /> Bullet list
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleOrderedList().run();
                  setMoreOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
              >
                <ListOrdered className="h-4 w-4" /> Numbered list
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleBlockquote().run();
                  setMoreOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Quote className="h-4 w-4" /> Quote
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleCodeBlock().run();
                  setMoreOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Code2 className="h-4 w-4" /> Code block
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setHorizontalRule().run();
                  setMoreOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Minus className="h-4 w-4" /> Divider
              </button>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton title="HTML source" active={sourceMode} onClick={toggleSourceMode}>
            <Code2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {sourceMode ? (
        <HtmlSourceView
          value={sourceHtml}
          onChange={(html) => {
            setSourceHtml(html);
            onChange(html);
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
