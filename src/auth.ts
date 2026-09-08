import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Mercado Libre OAuth2. The authorization endpoint is per-country
// (auth.mercadolibre.com.<tld>); this uses the Colombia domain by default.
// Requires a Developer App registered at developers.mercadolibre.com
// (Fase 0 del plan) — set MERCADOLIBRE_CLIENT_ID/SECRET before using it.
const mercadoLibreProvider = {
  id: "mercadolibre",
  name: "Mercado Libre",
  type: "oauth" as const,
  // La app está registrada sin PKCE (ver Fase 0 del plan); Auth.js lo activa
  // por defecto para providers OAuth genéricos, así que hay que desactivarlo.
  checks: ["state"] as ("state" | "pkce" | "none")[],
  authorization: {
    url: "https://auth.mercadolibre.com.co/authorization",
    // Mercado Libre no usa scopes OIDC (openid/profile/email, el default de
    // Auth.js) — los permisos ya quedaron fijados al registrar la app.
    params: { response_type: "code", scope: "" },
  },
  token: "https://api.mercadolibre.com/oauth/token",
  userinfo: "https://api.mercadolibre.com/users/me",
  clientId: process.env.MERCADOLIBRE_CLIENT_ID,
  clientSecret: process.env.MERCADOLIBRE_CLIENT_SECRET,
  profile(profile: { id: number; nickname: string; email?: string }) {
    return {
      id: String(profile.id),
      name: profile.nickname,
      email: profile.email ?? null,
      image: null,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Con estrategia JWT, Auth.js no copia el id del usuario a la sesión por
    // defecto — hay que hacerlo explícito para poder usarlo en el resto de la app.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Cuando la cuenta de Mercado Libre ya estaba vinculada, el adapter de
    // Auth.js NO actualiza el access_token/scope guardados al reconectar
    // (solo los escribe la primera vez). Si el usuario cambió permisos en
    // su app de Mercado Libre y vuelve a autorizar, hay que forzar el
    // refresco manualmente o se quedaría con el scope viejo para siempre.
    async signIn({ account }) {
      console.log(
        "signIn callback fired. provider:",
        account?.provider,
        "providerAccountId:",
        account?.providerAccountId,
        "scope:",
        account?.scope,
      );
      if (account?.provider === "mercadolibre" && account.providerAccountId) {
        const result = await prisma.account.updateMany({
          where: {
            provider: "mercadolibre",
            providerAccountId: account.providerAccountId,
          },
          data: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            scope: account.scope,
            token_type: account.token_type,
          },
        });
        console.log("signIn callback: updateMany affected", result.count, "rows");
      }
      return true;
    },
  },
  providers: [
    mercadoLibreProvider,
    Credentials({
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
