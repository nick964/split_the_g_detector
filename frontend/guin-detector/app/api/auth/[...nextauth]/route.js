import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from '../../../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
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
      // Attach custom user fields to the session
      session.user.uid = token.sub;
      return session;
    },
  },
});


export { handler as GET, handler as POST };
