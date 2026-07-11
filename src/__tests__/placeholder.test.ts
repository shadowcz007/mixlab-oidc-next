// 占位单测 —— 让 vitest 在阶段 1 跑通（避免 CI 在空 tests 目录上失败）。
// 阶段 2 起会替换为真实单测。
import { describe, it, expect } from "vitest";

describe("placeholder", () => {
  it("1 + 1 = 2", () => {
    expect(1 + 1).toBe(2);
  });
});