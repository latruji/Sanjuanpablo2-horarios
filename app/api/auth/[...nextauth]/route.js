import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isAdmin, isPortero } from "@/lib/authorizedUsers";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    // Solo dejamos entrar a quienes están en alguna de las dos listas
    async signIn({ user }) {
      const email = user.email;
      if (isAdmin(email) || isPortero(email)) return true;
      return false; // rechaza el login
    },
    async jwt({ token, account }) {
      // Guardamos el access_token de Google para poder crear eventos
      // de Calendar en nombre del administrador que inició sesión.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.role = isAdmin(session.user.email)
        ? "admin"
        : isPortero(session.user.email)
        ? "portero"
        : null;
      return session;
    },
  },
  pages: {
    error: "/", // vuelve al home con mensaje de acceso denegado
  },
});

export { handler as GET, handler as POST };