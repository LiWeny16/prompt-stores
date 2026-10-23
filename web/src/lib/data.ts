import bundle from '@/data/bundle.json';

export type ItemKind = 'role' | 'module' | 'combo';

export interface PromptItem {
  kind: ItemKind;
  category: string;
  name: string;
  description: string;
  tags: string[];
  compose: string[];
  file: string;
  body: string;
}

export interface Bundle {
  generated: string;
  items: PromptItem[];
}

export const DATA = bundle as Bundle;
export const ITEMS = DATA.items;

export const CATS: { id: string; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'fullstack', label: '前后端全栈' },
  { id: 'embedded', label: '嵌入式' },
  { id: 'ai', label: 'AI' },
  { id: 'writing', label: '写作' },
  { id: 'devops', label: '运维' },
  { id: 'data', label: '数据' },
  { id: 'quality', label: '质量' },
  { id: 'general', label: '通用' },
  { id: 'modules', label: '模块' },
  { id: 'combos', label: '组合' },
];

export const KIND_LABEL: Record<ItemKind, string> = {
  role: '角色',
  module: '模块',
  combo: '组合',
};

export function isCatId(id: string | undefined): id is string {
  return !!id && CATS.some((c) => c.id === id);
}

export function catLabel(id: string): string {
  return CATS.find((c) => c.id === id)?.label ?? id;
}

export function catHref(id: string): string {
  return id === 'all' ? '/' : `/c/${id}`;
}
