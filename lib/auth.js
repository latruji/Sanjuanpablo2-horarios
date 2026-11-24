import GoogleProvider from 'next-auth/providers/google';
import { getUserRole } from './db';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      const email = user?.email || token?.email;
      if (email) {
        try {
          token.role = await getUserRole(email);
        } catch (err) {
          console.error('Error consultando rol:', err);
          token.role = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role || null;
      }
      return session;
    },
  },
};