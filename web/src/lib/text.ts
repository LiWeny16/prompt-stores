/** 把正文里【…】占位符拆成片段，便于高亮渲染 */
export function splitVars(body: string): { text: string; isVar: boolean }[] {
  const out: { text: string; isVar: boolean }[] = [];
  const re = /【[^】\n]{1,60}】/g;
  let last = 0;
  for (const m of body.matchAll(re)) {
    if (m.index > last) out.push({ text: body.slice(last, m.index), isVar: false });
    out.push({ text: m[0], isVar: true });
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push({ text: body.slice(last), isVar: false });
  return out;
}

/** 复制给 agent 时，附上变量清单与追问指令，避免它凭空编造 */
export function bodyForAgent(body: string, vars: string[]): string {
  if (!vars.length) return body;
  return `${body}\n\n---\n如果上面【】内的信息我没有提供，请先列出需要我补充的项，等我回答后再执行；不要自行假设。\n待补充：${vars.map((v) => `【${v}】`).join(' ')}`;
}
