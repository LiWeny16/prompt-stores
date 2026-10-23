import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { Check, Copy } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn, copyText } from '@/lib/utils';

interface CopyButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  text: string;
  /** 稳定文案（如「复制」）；图标按钮可留空 */
  label?: string;
}

/** 复制按钮：图标换对勾 + 文案变「已复制」，1.6s 后还原 */
export function CopyButton({ text, label, variant = 'outline', size, className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    copyText(text).then(() => {
      window.clearTimeout(timer.current);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <Button
      variant={variant}
      size={size ?? (label ? 'default' : 'icon-sm')}
      className={cn(copied && 'text-foreground', className)}
      aria-label={copied ? '已复制' : `复制${label ? '' : '提示词'}`}
      aria-live="polite"
      onClick={onCopy}
      {...props}
    >
      {copied ? <Check data-testid="copy-check" /> : <Copy data-testid="copy-icon" />}
      {label ? <span>{copied ? '已复制' : label}</span> : null}
    </Button>
  );
}
