import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn, copyText } from '@/lib/utils';

interface CopyButtonProps
  extends Omit<ComponentProps<'button'>, 'onClick'>,
    VariantProps<typeof buttonVariants> {
  /** 直接给文本 */
  text?: string;
  /** 或给异步取文本（正文按需拉取时用） */
  getText?: () => Promise<string> | string;
  label?: string;
}

/** 复制按钮：图标换对勾 + 文案变「已复制」；取文本期间显示加载态 */
export function CopyButton({ text, getText, label, variant = 'outline', size, className, ...props }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (state === 'loading') return;
    setState('loading');
    try {
      const value = text ?? (getText ? await getText() : '');
      await copyText(value);
      setState('done');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('idle');
    }
  };

  const done = state === 'done';
  return (
    <Button
      variant={variant}
      size={size ?? (label ? 'default' : 'icon-sm')}
      className={cn(done && 'text-foreground', className)}
      aria-label={done ? '已复制' : `复制${label ? '' : '提示词'}`}
      aria-live="polite"
      onClick={onCopy}
      disabled={state === 'loading'}
      {...props}
    >
      {state === 'loading' ? <Loader2 className="animate-spin" /> : done ? <Check data-testid="copy-check" /> : <Copy data-testid="copy-icon" />}
      {label ? <span>{done ? '已复制' : state === 'loading' ? '加载中…' : label}</span> : null}
    </Button>
  );
}
