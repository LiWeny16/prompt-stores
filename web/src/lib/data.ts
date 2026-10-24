import bundle from '@/data/bundle.json';

export type ItemKind = 'role' | 'module' | 'combo';
export type Origin = 'builtin' | 'vendor' | 'user';

export interface ComboGraph {
  role: { id: string; name: string };
  modules: { id: string; name: string }[];
  combo: { lines: number };
}

/** UI 拿到的条目：正文在 builtin/vendor 情况下按需拉取，故 body 可缺省 */
export interface PromptItem {
  id: string;
  kind: ItemKind;
  category: string;
  name: string;
  description: string;
  tags: string[];
  compose: string[];
  origin: Origin;
  /** 行数（构建期算好，用于卡片展示，无需拉正文） */
  lines?: number;
  /** 最近更新（取自 git 提交日期） */
  updated?: string;
  /** 正文中需要用户填写的占位符 */
  vars?: string[];
  /** 正文引用的技能包（指针式 prompt 的前置依赖） */
  requires?: { pack: string; install: string; skills: string[] }[];
  /** 仓库内路径 */
  file?: string;
  roleId?: string;
  graph?: ComboGraph;
  mermaid?: string;
  license?: string;
  source?: string;
  /** 用户自建条目直接在内存里带正文 */
  body?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Bundle {
  generated: string;
  items: PromptItem[];
}

export const DATA = bundle as unknown as Bundle;
export const BUILTIN: PromptItem[] = DATA.items;

/** 角色分类 */
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
];

export const KIND_LABEL: Record<ItemKind, string> = {
  role: '角色',
  module: '模块',
  combo: '组合',
};

export type Section = 'prompts' | 'modules' | 'combos' | 'mine' | 'new' | 'edit';

export const SECTIONS: { id: Section; label: string; href: string }[] = [
  { id: 'prompts', label: 'Prompts', href: '#/' },
  { id: 'modules', label: 'Modules', href: '#/modules' },
  { id: 'combos', label: 'Combos', href: '#/combos' },
  { id: 'mine', label: '我的', href: '#/mine' },
];

export function catLabel(id: string): string {
  if (id === 'modules') return '模块';
  if (id === 'combos') return '组合';
  return CATS.find((c) => c.id === id)?.label ?? id;
}

export function lineCount(item: { lines?: number; body?: string }): number {
  return item.lines ?? (item.body ? item.body.split('\n').length : 0);
}

/** 形态：指针（只指路，≤6 行）/ 规范（重型交付约束）/ 导入（第三方原文） */
export type Shape = 'pointer' | 'spec' | 'vendor';

export function shapeOf(item: PromptItem): Shape {
  if (item.origin === 'vendor') return 'vendor';
  return lineCount(item) <= 6 ? 'pointer' : 'spec';
}

export const SHAPE_LABEL: Record<Shape, string> = {
  pointer: '指针',
  spec: '规范',
  vendor: '导入',
};

/** 场景入口：先想"我要做什么"，再落到筛选 */
export const TASKS: { label: string; q?: string; cat?: string }[] = [
  { label: '初始化新项目', q: '初始化' },
  { label: '写功能', q: 'TDD' },
  { label: '排查 bug', q: '调试' },
  { label: '审查代码', q: '审查' },
  { label: '做计划/拆任务', q: '计划' },
  { label: '写文档', cat: 'writing' },
  { label: '上板调试', cat: 'embedded' },
  { label: '总结提炼', q: '总结' },
];

/** 来源显示成简短域名/路径 */
export function sourceLabel(src?: string): string {
  if (!src) return '';
  if (src === '原创') return '原创';
  return src.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 46);
}
