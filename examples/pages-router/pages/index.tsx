import type { GetServerSideProps } from "next";
import { signIn, signOut, useSession } from "next-auth/react";
import { auth } from "@/auth";

export default function Home() {
  const { data: session } = useSession();
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>mixlab-oidc-next · Next.js 14 Pages Router demo</h1>
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
          <button onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </div>
      ) : (
        <div>
          <p>Not signed in.</p>
          <button onClick={() => signIn("mixlab", { callbackUrl: "/" })}>
            Sign in with MixLab
          </button>
        </div>
      )}
    </main>
  );
}

// SSR 阶段注入 session 到 client，避免 hydration 闪烁
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await auth();
  return { props: { session } };
};