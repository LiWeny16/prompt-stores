import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 剪贴板写入：优先 API，file:// 或不支持时退回 execCommand */
export function copyText(text: string): Promise<void> {
  return new Promise((resolve) => {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* 忽略：极老环境 */
      }
      ta.remove();
      resolve();
    };
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(resolve, fallback);
        return;
      }
    } catch {
      /* 落入 fallback */
    }
    fallback();
  });
}
