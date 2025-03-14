import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from '../../../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { compare, hash } from "bcryptjs";
import { adminAuth } from '../../../../lib/firebase-admin';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials;
        try {
          // Fetch user from Firestore
          const userDoc = doc(db, "users", email);
          const userSnapshot = await getDoc(userDoc);

          if (!userSnapshot.exists()) {
            throw new Error("No user found with this email");
          }

          const userData = userSnapshot.data();

          // Compare passwords
          const passwordMatch = await compare(password, userData.password);
          if (!passwordMatch) {
            throw new Error("Incorrect password");
          }

          // Return user object for session
          return {
            id: userData.email,
            name: userData.name,
            email: userData.email,
          };
        } catch (error) {
          console.error("Login error:", error);
          throw new Error("Invalid credentials");
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Get reference to user document
        const userDoc = doc(db, 'users', user.email);
        
        
        // Check if user exists
        const userSnapshot = await getDoc(userDoc);
        
        if (!userSnapshot.exists()) {
          // Create new user if they don't exist
          await setDoc(userDoc, {
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: new Date(),
            lastSignIn: new Date(),
          });
        } else {
          // Just update the lastSignIn time for existing users
          await updateDoc(userDoc, {
            lastSignIn: new Date(),
          });
        }

        return true; // Return true to continue with the sign-in process
      } catch (error) {
        console.error('Error managing user in Firestore:', error);
        return false; // Return false to deny the sign-in
      }
    },
    async session({ session, user, token }) {
      if(session?.user) {
        if(token?.sub) {
          session.user.uid = token.sub;

          const firebaseToken = await adminAuth.createCustomToken(token.sub);
          session.firebaseToken = firebaseToken;
        }
        else {
          console.log('no token.sub');

        }
      }
      session.user.uid = token.sub;
      return session;
    },
    async jwt({ user, token }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});


export { handler as GET, handler as POST };
