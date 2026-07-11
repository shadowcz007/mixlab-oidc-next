import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>mixlab-oidc-next · Next.js 15 App Router demo</h1>
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
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit">Sign out</button>
          </form>
        </div>
      ) : (
        <div>
          <p>Not signed in.</p>
          <form
            action={async () => {
              "use server";
              await signIn("mixlab", { redirectTo: "/" });
            }}
          >
            <button type="submit">Sign in with MixLab</button>
          </form>
        </div>
      )}
    </main>
  );
}