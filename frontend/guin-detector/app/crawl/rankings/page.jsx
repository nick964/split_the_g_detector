"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beer, Trophy, Calendar, Medal, Loader2, Clock, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

function CrawlRankingPage() {
  const [rankingsData, setRankingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // The specific date for the crawl - March 15, 2025
  const crawlDate = new Date(2025, 2, 15); // Month is 0-indexed, so 2 = March
  
  // Format the crawl date for display
  const formattedCrawlDate = crawlDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    fetchCrawlRankings();
  }, []);

  const fetchCrawlRankings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create timestamp range for the crawl date (start and end of day)
      const startOfDay = new Date(crawlDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(crawlDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get all users first (for better performance than querying each user individually)
      const usersSnapshot = await getDocs(collection(db, "users"));
      
      // Array to store all pours from the crawl date
      let crawlPours = [];
      
      // Create an array of promises for parallel execution
      const fetchPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        
        // Query only guinnesses from the crawl date
        const guinnessQuery = query(
          collection(userDoc.ref, "guinness"),
          where("timestamp", ">=", startOfDay.toISOString()),
          where("timestamp", "<=", endOfDay.toISOString())
        );
        
        const guinnessSnapshot = await getDocs(guinnessQuery);
        console.log(guinnessSnapshot.docs);
        
        // Return an array of pours for this user
        return guinnessSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          userName: userData.name,
          userImage: userData.image,
        }));
      });
      
      // Execute all promises in parallel for better performance
      const results = await Promise.all(fetchPromises);
      
      // Flatten the array of arrays
      crawlPours = results.flat();
      console.log(crawlPours);
      
      // Sort by score (highest first)
      const sortedPours = crawlPours.sort((a, b) => b.score - a.score);
      
      setRankingsData(sortedPours);
    } catch (err) {
      console.error("Error fetching crawl rankings:", err);
      setError("Failed to load crawl rankings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const getMedalEmoji = (index) => {
    switch (index) {
      case 0:
        return "🏆";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return "🍺";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]" style={{ background: 'url("https://www.transparenttextures.com/patterns/classy-fabric.png")', backgroundColor: '#F5F5F5' }}>
        <div className="flex flex-col items-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-[#0D3B1A] mb-4" />
            <Beer className="h-8 w-8 text-[#764C25] absolute top-4 left-4" />
          </div>
          <p className="text-[#0D3B1A] font-semibold">Pouring the rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8" style={{ background: 'url("https://www.transparenttextures.com/patterns/classy-fabric.png")', backgroundColor: '#F5F5F5' }}>
        <Card className="border-4 border-[#0D3B1A] shadow-xl">
          <CardHeader className="bg-[#0D3B1A] text-white">
            <CardTitle className="text-2xl font-bold flex items-center">
              <Trophy className="h-6 w-6 text-[#FFC107] mr-2" />
              Guinness Crawl Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-4 rounded-md text-red-600 mb-4 border border-red-200">
              {error}
            </div>
            <Button 
              onClick={() => fetchCrawlRankings()}
              className="bg-[#0D3B1A] text-white hover:bg-[#0A2E14]"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ 
      background: 'url("https://www.transparenttextures.com/patterns/classy-fabric.png")', 
      backgroundColor: '#F5F5F5' 
    }}>
      <div className="max-w-4xl mx-auto">
        {/* Shamrock decorations */}
        <div className="relative">
          <div className="absolute -top-6 -left-6 text-[#0D3B1A] text-4xl rotate-[-15deg]">☘️</div>
          <div className="absolute -top-6 -right-6 text-[#0D3B1A] text-4xl rotate-[15deg]">☘️</div>
        </div>
        
        <Card className="mb-6 border-4 border-[#0D3B1A] shadow-xl overflow-hidden">
          <CardHeader className="bg-[#0D3B1A] text-white relative">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2Z" />
              </svg>
            </div>
            <CardTitle className="text-3xl font-bold flex items-center">
              <Trophy className="h-8 w-8 text-[#FFC107] mr-3" />
              Guinness Crawl Champions
            </CardTitle>
            <div className="flex items-center mt-2 text-gray-200">
              <Calendar className="h-5 w-5 mr-2 text-[#FFC107]" />
              <p className="italic">{formattedCrawlDate}</p>
            </div>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-[#F5F5F5] to-[#E5E5E5]">
            <div className="mb-6 p-4 bg-[#0D3B1A] text-white rounded-lg shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M4,2H19L17,22H6L4,2M6.2,4L7.8,20H16.2L17.8,4H6.2Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 flex items-center">
                <Star className="h-5 w-5 mr-2 text-[#FFC107]" />
                Crawl Leaderboard
              </h3>
              <p className="text-gray-200">
                Who poured the perfect pint? These brave souls have mastered the art of the perfect Guinness split during our legendary pub crawl!
              </p>
            </div>
            
            {/* Rankings */}
            {rankingsData.length > 0 ? (
              <div className="space-y-4">
                {/* Top 3 podium */}
                {rankingsData.slice(0, 3).length > 0 && (
                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    {/* Create placeholders for missing positions */}
                    {Array.from({ length: 3 }).map((_, index) => {
                      const pour = rankingsData[index];
                      const podiumHeights = ["h-32", "h-24", "h-20"];
                      const podiumOrder = [1, 0, 2]; // Center, Left, Right for 1st, 2nd, 3rd
                      const orderIndex = podiumOrder[index];
                      
                      return (
                        <div key={index} className={`flex-1 order-${orderIndex} flex flex-col items-center`}>
                          {pour ? (
                            <>
                              <div className="relative mb-2">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#0D3B1A] shadow-lg">
                                  <img 
                                    src={pour.userImage || '/placeholder-avatar.jpg'} 
                                    alt={pour.userName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute -top-2 -right-2 text-2xl">
                                  {getMedalEmoji(index)}
                                </div>
                              </div>
                              <h3 className="font-bold text-center">{pour.userName}</h3>
                              <div className="text-xl font-bold text-[#0D3B1A]">
                                {(pour.score * 100).toFixed(1)}%
                              </div>
                              <div className={`w-full ${podiumHeights[index]} mt-2 rounded-t-lg bg-gradient-to-t from-[#0D3B1A] to-[#164A2A] flex items-end justify-center`}>
                                <span className="text-white font-bold mb-2 text-xl">#{index + 1}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-16 h-16 rounded-full bg-gray-200 mb-2 flex items-center justify-center">
                                <Beer className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="font-bold text-gray-400 text-center">No Entry</h3>
                              <div className="text-xl font-bold text-gray-400">
                                --.--%
                              </div>
                              <div className={`w-full ${podiumHeights[index]} mt-2 rounded-t-lg bg-gray-300 flex items-end justify-center`}>
                                <span className="text-white font-bold mb-2 text-xl">#{index + 1}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Rest of the rankings */}
                <div className="bg-white rounded-lg shadow-md border-2 border-[#0D3B1A] overflow-hidden">
                  <div className="bg-[#0D3B1A] text-white py-3 px-4 font-bold text-lg">
                    All Competitors
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {rankingsData.map((pour, index) => (
                      <div key={pour.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center mb-3">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0D3B1A] text-white font-bold mr-4 relative shadow-md">
                            {index + 1}
                            {index < 3 && (
                              <span className="absolute -top-1 -right-1 text-xl">
                                {getMedalEmoji(index)}
                              </span>
                            )}
                          </div>
                          
                          {/* User info */}
                          <div className="flex-grow flex items-center">
                            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-[#0D3B1A] shadow-sm">
                              <img
                                src={pour.userImage || '/placeholder-avatar.jpg'}
                                alt={pour.userName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#0D3B1A]">{pour.userName}</h4>
                              <div className="flex items-center text-sm text-gray-600">
                                <Beer className="h-3 w-3 mr-1 text-[#764C25]" />
                                <span>{pour.barName || 'Unknown Location'}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Score */}
                          <div className="flex-shrink-0 flex flex-col items-end">
                            <div className="text-xl font-bold text-[#0D3B1A]">
                              {(pour.score * 100).toFixed(1)}%
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{formatTime(pour.sipLength || pour.time)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Pour image with details - improved layout */}
                        <div className="ml-16"> {/* Align with user info */}
                          <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                            <div className="flex items-start space-x-3">
                              {/* Image with fixed aspect ratio */}
                              <div className="w-24 h-24 relative rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                                <img
                                  src={pour.url || pour.processedUrl || '/placeholder-guinness.jpg'}
                                  alt={`Pour by ${pour.userName}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                              </div>
                              
                              {/* Pour details */}
                              <div className="flex-grow">
                                <div className="flex items-center text-sm text-gray-700 mb-1">
                                  <Award className="h-4 w-4 mr-1 text-[#FFC107]" />
                                  <span className="font-medium">Perfect Pour Attempt</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-1">
                                  {new Date(pour.timestamp).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <div className="flex items-center text-xs text-gray-500">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    <Beer className="h-3 w-3 mr-1" />
                                    {pour.barName || 'Unknown Location'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8 bg-white rounded-lg shadow-md border-2 border-[#0D3B1A]">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Beer className="h-24 w-24 text-gray-300 absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">☘️</div>
                </div>
                <h3 className="text-xl font-bold text-[#0D3B1A] mb-2">No Guinness Pours Yet</h3>
                <p className="text-gray-600">The competition hasn't started! Check back on {formattedCrawlDate}.</p>
                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                  Be the first to pour the perfect pint and claim your spot at the top of the leaderboard!
                </p>
              </div>
            )}
            
            {/* Refresh Button */}
            {rankingsData.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Button 
                  onClick={() => fetchCrawlRankings()}
                  className="bg-[#0D3B1A] text-white hover:bg-[#0A2E14] shadow-md"
                >
                  <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
                  Refresh Rankings
                </Button>
              </div>
            )}
            
            {/* Footer with Irish blessing */}
            <div className="mt-8 text-center italic text-[#0D3B1A] text-sm">
              <p>"Here's to a long life and a merry one. A quick death and an easy one.</p>
              <p>A pretty girl and an honest one. A cold beer—and another one!"</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CrawlRankingPage;
