'use client';

import * as React from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Saisissez votre message…',
  className,
  minHeight = '200px',
}: RichTextEditorProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const initialValueSet = React.useRef(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!initialValueSet.current && (value ?? '')) {
      el.innerHTML = value || '';
      initialValueSet.current = true;
    }
  }, [value]);
  React.useEffect(() => {
    if (!value) initialValueSet.current = false;
  }, [value]);

  const handleInput = () => {
    const html = ref.current?.innerHTML ?? '';
    onChange?.(html);
  };

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    ref.current?.focus();
    handleInput();
  };

  return (
    <div className={cn('rounded-md border bg-background overflow-hidden', className)}>
      <div className="flex items-center gap-0.5 border-b bg-muted/40 px-1 py-0.5">
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted"
          onClick={() => exec('bold')}
          title="Gras"
        >
          <Icon icon="solar:bold-linear" className="size-4" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted"
          onClick={() => exec('italic')}
          title="Italique"
        >
          <Icon icon="solar:italic-linear" className="size-4" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted"
          onClick={() => exec('underline')}
          title="Souligné"
        >
          <Icon icon="solar:underline-linear" className="size-4" />
        </button>
        <span className="w-px h-5 bg-border mx-0.5" />
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted"
          onClick={() => exec('insertUnorderedList')}
          title="Liste à puces"
        >
          <Icon icon="solar:list-linear" className="size-4" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted"
          onClick={() => exec('insertOrderedList')}
          title="Liste numérotée"
        >
          <Icon icon="solar:list-numbered-linear" className="size-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        data-placeholder={placeholder}
        className="min-w-0 w-full px-3 py-2 text-sm outline-none overflow-y-auto leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:mt-0 first:[&_p]:mt-0 [&_strong]:font-semibold empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        style={{ minHeight }}
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning
      />
    </div>
  );
}
