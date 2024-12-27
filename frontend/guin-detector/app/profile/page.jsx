"use client";

import { useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";


function ProfilePageContent() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [guinnessData, setGuinnessData] = useState([]);

  useEffect(() => {
    if (session) {
      const fetchUserData = async () => {
        try {
          // Fetch the user document
          const userDocRef = doc(db, "users", session.user.email);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            throw new Error("User document does not exist");
          }

          const userData = userDoc.data();
          setUserData(userData);

          // Fetch the 'guinness' subcollection
          const guinnessCollectionRef = collection(userDocRef, "guinness");
          const guinnessSnapshot = await getDocs(guinnessCollectionRef);

          const guinnessItems = [];
          guinnessSnapshot.forEach((doc) => {
            guinnessItems.push({ id: doc.id, ...doc.data() });
          });

          setGuinnessData(guinnessItems);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }
  }, [session]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex justify-center mt-8 pt-8">
        <p>You are not logged in</p>
        <Link
          href="/api/auth/signin"
          className="bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors ml-4"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-8">
      {userData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Welcome, {userData.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              <strong>Email:</strong> {userData.email}
            </p>
            <p>
              <strong>Last Sign In:</strong>{" "}
              {new Date(userData.lastSignIn.seconds * 1000).toLocaleString()}
            </p>
            <img
              src={userData.image}
              alt={userData.name}
              className="w-24 h-24 rounded-full"
            />
          </CardContent>
        </Card>
      )}

      {guinnessData.length > 0 ? (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Guinness Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guinnessData.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    Score: {item.score.toFixed(2)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={item.url}
                    alt={`Guinness Image ${item.id}`}
                    className="w-full h-48 object-cover rounded"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    <strong>Timestamp:</strong>{" "}
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">No Guinness data found.</p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <SessionProvider>
      <ProfilePageContent />
    </SessionProvider>
  );
}
