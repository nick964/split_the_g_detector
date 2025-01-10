"use client";

import { useSession } from "next-auth/react";
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
import { Beer, Trophy, Clock, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function ProfilePageContent() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [guinnessData, setGuinnessData] = useState([]);
  const [stats, setStats] = useState({
    totalPours: 0,
    averageScore: 0,
    bestScore: 0,
    fastestTime: Infinity,
  });

  useEffect(() => {
    if (session) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, "users", session.user.email);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            throw new Error("User document does not exist");
          }

          const userData = userDoc.data();
          setUserData(userData);

          const guinnessCollectionRef = collection(userDocRef, "guinness");
          const guinnessSnapshot = await getDocs(guinnessCollectionRef);

          const guinnessItems = [];
          let totalScore = 0;
          let bestScore = 0;
          let fastestTime = Infinity;

          guinnessSnapshot.forEach((doc) => {
            
            const data = { id: doc.id, ...doc.data() };
            guinnessItems.push(data);
            
            const score = data.score * 100;
            totalScore += score;
            bestScore = Math.max(bestScore, score);
            if (data.sipLength) {
              fastestTime = Math.min(fastestTime, data.sipLength);
            }
          });

          setGuinnessData(guinnessItems.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
          setStats({
            totalPours: guinnessItems.length,
            averageScore: guinnessItems.length ? (totalScore / guinnessItems.length).toFixed(1) : 0,
            bestScore: bestScore.toFixed(1),
            fastestTime: fastestTime === Infinity ? null : fastestTime,
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }
  }, [session]);

  const formatTime = (time) => {
    if (!time) return "N/A";
    const seconds = Math.floor(time / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC107]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-xl font-semibold">Please sign in to view your profile</h2>
        <Link href="/api/auth/signin">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-black text-white rounded-lg p-8 flex flex-col md:flex-row items-center gap-6">
        <img
          src={userData?.image}
          alt={userData?.name}
          className="w-24 h-24 rounded-full border-4 border-[#FFC107]"
        />
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold">{userData?.name}</h1>
          <p className="text-gray-300">{userData?.email}</p>
          <p className="text-sm text-gray-400 mt-2">
            Member since {new Date(userData?.createdAt?.seconds * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-black rounded-full p-3">
                <Beer className="h-6 w-6 text-[#FFC107]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Pours</p>
                <p className="text-2xl font-bold">{stats.totalPours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-black rounded-full p-3">
                <Target className="h-6 w-6 text-[#FFC107]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold">{stats.averageScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-black rounded-full p-3">
                <Trophy className="h-6 w-6 text-[#FFC107]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Best Score</p>
                <p className="text-2xl font-bold">{stats.bestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-black rounded-full p-3">
                <Clock className="h-6 w-6 text-[#FFC107]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fastest Time</p>
                <p className="text-2xl font-bold">{formatTime(stats.fastestTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pours */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Recent Pours</h2>
          <Link href="/scan">
            <Button className="bg-[#FFC107] text-black hover:bg-[#ffd454]">
              Scan Split
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guinnessData.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={item.url}
                  alt={`Pour from ${new Date(item.timestamp).toLocaleDateString()}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-2xl font-bold text-[#FFC107]">
                    {(item.score * 100).toFixed(1)}%
                  </div>
                  {item.sipLength && (
                    <div className="text-xl font-bold text-[#FFC107]">
                      Time: {formatTime(item.sipLength)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {guinnessData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No pours recorded yet. Time to start pouring!</p>
            <Link href="/scan">
              <Button className="mt-4 bg-[#FFC107] text-black hover:bg-[#ffd454]">
                Scan your First Split
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <ProfilePageContent />;
}