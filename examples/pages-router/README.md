# Pages Router example (Next.js 14)

演示 Next.js 14 Pages Router + MixLab OIDC SDK 接入。

## 跑起来

```bash
npm install
cp .env.example .env.local
# 填 MIXLAB_CLIENT_ID + AUTH_SECRET

npm run dev
# 浏览器打开 http://localhost:3000，点 "Sign in with MixLab"
```

## 文件结构

- `auth.ts` — NextAuth v5 配置 + MixLab provider
- `middleware.ts` — 全局登录保护（Next 14/15 文件名）
- `pages/api/auth/[...nextauth].ts` — NextAuth handlers
- `pages/_app.tsx` — SessionProvider（让 useSession 在 client 端可用）
- `pages/index.tsx` — 登录 / 显示 user 信息（用 useSession）