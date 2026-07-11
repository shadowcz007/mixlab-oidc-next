import NextAuth from "next-auth";
import { MixLab } from "mixlab-oidc-next/provider";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MixLab({
      clientId: process.env.MIXLAB_CLIENT_ID!,
    }),
  ],
});