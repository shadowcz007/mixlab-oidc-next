// examples/app-router/app/page.tsx
// 主页:展示登录态(Path B 模式)
// 模式参考 mixlab-home / pollpink
//
// 关键:登录/登出都用 form POST 到 SDK route handler,不用 server action

import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>mixlab-oidc-next · Next.js 15 App Router demo (Path B)</h1>
      {session?.user ? (
        <div>
          <p>
            Signed in as <strong>{session.user.name ?? session.user.email}</strong>
          </p>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "1rem",
              borderRadius: "0.5rem",
              overflow: "auto",
            }}
          >
            {JSON.stringify(session.user, null, 2)}
          </pre>
          <form action="/api/auth/logout" method="POST">
            <button type="submit">Sign out</button>
          </form>
        </div>
      ) : (
        <div>
          <p>Not signed in.</p>
          {/* Path B:form 直接 POST 到 SDK login handler,SDK 会 302 跳 IdP */}
          <form action="/api/auth/login" method="POST">
            <input type="hidden" name="returnTo" value="/" />
            <button type="submit">Sign in with mixlab</button>
          </form>
        </div>
      )}
    </main>
  );
}
