import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/** 明暗切换：index.html 已在首帧前定好初始值，这里只做切换与持久化 */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  // 其他标签页切换主题时保持同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'ps-theme') return;
      const next = e.newValue === 'dark';
      setDark(next);
      document.documentElement.classList.toggle('dark', next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('ps-theme', next ? 'dark' : 'light');
    } catch {
      /* 无痕等场景忽略 */
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? '切换到亮色主题' : '切换到暗色主题'}
      aria-pressed={dark}
      className="shrink-0"
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
