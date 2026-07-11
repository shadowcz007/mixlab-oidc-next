# mixlab-oidc-next

> MixLab OIDC SDK for Next.js — login in 10 minutes.

为 Next.js 项目提供 MixLab OIDC 登录（基于 Poll Pink 生产验证的登录流程）。

## 安装

```bash
npm install mixlab-oidc-next
```

## 用法（NextAuth v5 主路径）

```ts
// auth.ts
import NextAuth from "next-auth";
import { MixLab } from "mixlab-oidc-next/provider";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [MixLab({ clientId: process.env.MIXLAB_CLIENT_ID! })],
});
```

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

## 环境变量

| 变量 | 说明 | 必填 |
|---|---|---|
| `MIXLAB_CLIENT_ID` | MixLab 后台申请的 public client ID | ✅ |
| `AUTH_SECRET` | NextAuth v5 session 加密密钥（≥ 32 字符） | ✅ |
| `NEXTAUTH_URL` | 应用访问 URL（NextAuth v5 自动识别） | ✅ |

## 文档

完整文档见 [docs/](docs/)：

- [Getting Started](docs/pages/getting-started.mdx)
- [Installation](docs/pages/installation.mdx)
- [Configuration](docs/pages/configuration.mdx)
- [App Router Guide](docs/pages/guides/app-router.mdx)
- [Pages Router Guide](docs/pages/guides/pages-router.mdx)

## License

MIT © [shadowcz007](https://github.com/shadowcz007)