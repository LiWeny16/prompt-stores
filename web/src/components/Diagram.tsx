import type { ComboGraph } from '@/lib/data';

interface DiagramProps {
  graph: ComboGraph;
  /** 紧凑模式（卡片/移动端） */
  compact?: boolean;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * 组合架构图：自绘 SVG。
 * 不引入 mermaid 运行时（约 150KB gzip），首屏零成本；mermaid 源码在详情页可查看/复制。
 */
export function Diagram({ graph, compact = false }: DiagramProps) {
  const mods = graph.modules;
  const rowH = compact ? 34 : 40;
  const gap = compact ? 8 : 10;
  const roleH = compact ? 38 : 44;
  const leftW = 300;
  const rightW = 220;
  const width = leftW + 80 + rightW;
  const leftH = roleH + gap + mods.length * (rowH + gap);
  const height = Math.max(leftH, roleH) + 12;

  const comboY = (height - roleH) / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`组合架构：角色 ${graph.role.name}，模块 ${mods.map((m) => m.name).join('、')}`}
    >
      <defs>
        <marker id="ps-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" opacity="0.5" />
        </marker>
      </defs>

      {/* 角色 */}
      <g>
        <rect x="0" y="6" width={leftW} height={roleH} rx="9" className="fill-primary" />
        <text x="12" y={6 + roleH / 2 - 4} className="fill-primary-foreground" fontSize={compact ? 11 : 12} fontWeight="600">
          {truncate(graph.role.name, compact ? 22 : 26)}
        </text>
        <text x="12" y={6 + roleH / 2 + 10} className="fill-primary-foreground" fontSize="9" opacity="0.65">
          角色 prompt
        </text>
      </g>

      {/* 模块 */}
      {mods.map((m, i) => {
        const y = 6 + roleH + gap + i * (rowH + gap);
        return (
          <g key={m.id ?? i}>
            <rect x="0" y={y} width={leftW} height={rowH} rx="9" className="fill-secondary stroke-border" strokeWidth="1" />
            <text x="12" y={y + rowH / 2 - 3} className="fill-secondary-foreground" fontSize={compact ? 11 : 12}>
              {truncate(m.name, compact ? 24 : 28)}
            </text>
            <text x="12" y={y + rowH / 2 + 10} className="fill-muted-foreground" fontSize="9">
              模块 {i + 1}
            </text>
            {/* 连线到组合 */}
            <path
              d={`M ${leftW} ${y + rowH / 2} C ${leftW + 40} ${y + rowH / 2}, ${leftW + 40} ${comboY + roleH / 2}, ${leftW + 80} ${comboY + roleH / 2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.35"
              markerEnd="url(#ps-arrow)"
            />
          </g>
        );
      })}

      {/* 组合 */}
      <g>
        <rect x={leftW + 80} y={comboY + 6} width={rightW} height={roleH} rx="9" className="fill-accent stroke-border" strokeWidth="1" />
        <text x={leftW + 92} y={comboY + 6 + roleH / 2 - 4} className="fill-accent-foreground" fontSize={compact ? 11 : 12} fontWeight="600">
          组合 Prompt
        </text>
        <text x={leftW + 92} y={comboY + 6 + roleH / 2 + 10} className="fill-muted-foreground" fontSize="9">
          {graph.combo.lines} 行
        </text>
      </g>
    </svg>
  );
}
