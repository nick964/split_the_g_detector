"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, where, collectionGroup, doc as firestoreDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beer, Trophy, Clock, Medal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const timeFilters = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "month" },
  { label: "This Week", value: "week" }
];

function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTimeFilter = (filterType) => {
    const now = new Date();
    switch (filterType) {
      case "week":
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return lastWeek;
      case "month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return lastMonth;
      default:
        return null;
    }
  };

  const fetchLeaderboardData = async (filterType) => {
    setLoading(true);
    setError(null);
    
    try {
      const timeFilter = getTimeFilter(filterType);
      
      // Use collectionGroup to query all guinness documents across all users
      let guinnessQuery;
      
      if (timeFilter) {
        guinnessQuery = query(
          collectionGroup(db, "guinness"),
          where("timestamp", ">=", timeFilter.toISOString()),
          orderBy("score", "desc"),
          limit(30)
        );
      } else {
        guinnessQuery = query(
          collectionGroup(db, "guinness"),
          orderBy("score", "desc"),
          limit(30)
        );
      }
      
      const guinnessSnapshot = await getDocs(guinnessQuery);
      console.log(`Fetched ${guinnessSnapshot.docs.length} Guinness pours`);
      
      // Process the results
      const pours = [];
      const userCache = {}; // Cache user data to avoid duplicate fetches
      
      for (const docSnapshot of guinnessSnapshot.docs) {
        const pourData = docSnapshot.data();
        
        // Extract user ID from the document path
        const userId = docSnapshot.ref.path.split('/')[1];
        
        // Get user data (from cache if available)
        let userData;
        if (userCache[userId]) {
          userData = userCache[userId];
        } else {
          // We need to fetch user data only once per user
          try {
            // Use the correct Firebase v9 method to get a document reference
            const userDocRef = firestoreDoc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              userData = userDoc.data();
              userCache[userId] = userData; // Cache for future use
            } else {
              userData = { name: "Unknown User", image: null };
            }
          } catch (userError) {
            console.error(`Error fetching user data for ${userId}:`, userError);
            userData = { name: "Unknown User", image: null };
          }
        }
        
        pours.push({
          id: docSnapshot.id,
          ...pourData,
          userName: userData.name || "Unknown User",
          userImage: userData.image || null,
        });
      }
      
      // Sort by score and take top 10
      const sortedPours = pours
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      setLeaderboardData(sortedPours);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setError("Failed to load leaderboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData(selectedFilter);
  }, [selectedFilter]);

  const formatTime = (time) => {
    if (!time) return "N/A";
    const seconds = Math.floor(time / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  const getMedalColor = (index) => {
    switch (index) {
      case 0:
        return "text-yellow-400";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-gray-300";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
          <Trophy className="h-10 w-10 text-[#FFC107]" />
          Guinness Hall of Fame
        </h1>
        <p className="text-gray-600 mb-6">
          The most perfectly split pints in history
        </p>
        
        {/* Time Filters */}
        <div className="flex justify-center gap-2">
          {timeFilters.map((filter) => (
            <Button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              variant={selectedFilter === filter.value ? "default" : "outline"}
              className={selectedFilter === filter.value ? "bg-[#FFC107] text-black" : ""}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-[#FFC107]" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="bg-red-50 p-4 rounded-md text-red-600 mb-4">
            {error}
          </div>
          <Button 
            onClick={() => fetchLeaderboardData(selectedFilter)}
            className="bg-[#FFC107] text-black hover:bg-[#ffd454]"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {leaderboardData.map((pour, index) => (
            <Card key={pour.id || index} className="overflow-hidden">
                <div className="flex h-full">
                    {/* Medal/Rank */}
                    <div className={`flex items-center justify-center w-16 ${index < 3 ? 'bg-black' : 'bg-gray-100'}`}>
                    <Medal className={`h-8 w-8 ${getMedalColor(index)}`} />
                    </div>

                    {/* Pour Image */}
                    <div className="w-24 sm:w-32 relative">
                    <img
                        src={pour.url || pour.processedUrl || '/public/placeholder-guinness.jpg'}
                        alt={`Pour by ${pour.userName}`}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    </div>

                    {/* Details */}
                    <CardContent className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                        <img
                            src={pour.userImage || '/public/placeholder-avatar.jpg'}
                            alt={pour.userName}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <span className="font-semibold truncate">{pour.userName}</span>
                        </div>
                        <div className="text-2xl font-bold text-[#FFC107] flex-shrink-0">
                        {(pour.score * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500 gap-1">
                        <span>{pour.barName || new Date(pour.timestamp).toLocaleDateString()}</span>
                        <span className="flex-shrink-0">Time: {formatTime(pour.sipLength || pour.time)}</span>
                    </div>
                    </CardContent>
                </div>
                </Card>
          ))}

          {leaderboardData.length === 0 && (
            <div className="text-center py-12">
              <Beer className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No Guinness pours found for this time period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LeaderboardPage;