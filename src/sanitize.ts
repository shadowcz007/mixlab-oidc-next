// sanitize.ts 占位 stub —— 阶段 5 实现完整逻辑
// 当前返回 input 透传，保持 typecheck 通过。
export function sanitizeReturnTo(input: string | null | undefined, fallback = "/"): string {
  return input ?? fallback;
}