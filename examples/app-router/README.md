# App Router example (Next.js 15)

演示 Next.js 15 App Router + MixLab OIDC SDK 接入。

## 跑起来

```bash
# 1. 装依赖（在仓库根目录跑 npm install 也会自动 workspaces 装）
npm install

# 2. 复制环境变量
cp .env.example .env.local

# 3. 填 MIXLAB_CLIENT_ID（MixLab 后台申请）+ AUTH_SECRET（openssl rand -base64 32）

# 4. 启动
npm run dev

# 5. 浏览器打开 http://localhost:3000，点 "Sign in with MixLab"
```

## 文件结构

- `auth.ts` — NextAuth v5 配置 + MixLab provider
- `proxy.ts` — 全局登录保护（Next 16+ 文件名；Next 14/15 改名为 `middleware.ts`）
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handlers
- `app/page.tsx` — 登录 / 显示 user 信息
- `app/layout.tsx` — 根布局

## 切换到 Next 14/15

把 `proxy.ts` 改名为 `middleware.ts`，函数体不变。
`package.json` 改 `"next": "^14.2.0"`。