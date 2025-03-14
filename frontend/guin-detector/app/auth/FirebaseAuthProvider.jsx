'use client'

import { auth } from '../../lib/firebase';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { signInWithCustomToken, signOut } from 'firebase/auth';

async function syncFirebaseAuth(session) {
    if(session && session.firebaseToken) {
        try {
            await signInWithCustomToken(auth, session.firebaseToken);
        } catch (error) {
            console.error('Error signing in with Firebase:', error);
        }
    } else {
        await signOut(auth);
    }
}

function FirebaseAuthProvider({children}) {
    const {data: session} = useSession();

    useEffect(() => {
        if(!session) return;

        syncFirebaseAuth(session);
    }, [session])

    return <>{children}</>
}

export default FirebaseAuthProvider;