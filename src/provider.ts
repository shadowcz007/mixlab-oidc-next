// provider.ts 占位 stub —— 阶段 3 实现 NextAuth v5 OIDCConfig factory
export interface MixLabProviderOptions {
  clientId: string;
  issuer?: string;
  wellKnown?: string;
  scope?: string[];
}
export function MixLab(_opts: MixLabProviderOptions): unknown {
  throw new Error("MixLab provider: not implemented yet — coming in v0.1 stage 3");
}