"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beer, Trophy, Calendar, Medal, Loader2, Clock, Star, Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Image Modal Component
const ImageModal = ({ isOpen, onClose, imageUrl, userName, barName, score, timestamp }) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-gray-900 p-4 rounded-lg shadow-xl max-w-3xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 rounded-full p-1 z-10"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Image container */}
          <div className="flex-1 relative rounded-md overflow-hidden bg-black">
            <img
              src={imageUrl || '/placeholder-guinness.jpg'}
              alt={`Pour by ${userName}`}
              className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              onError={(e) => {
                console.log("Modal image failed to load:", e.target.src);
                e.target.src = '/placeholder-guinness.jpg';
              }}
            />
          </div>
          
          {/* Details sidebar */}
          <div className="md:w-64 flex-shrink-0 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
            <h3 className="font-bold text-lg text-[#0D3B1A] dark:text-white mb-2">{userName}'s Pour</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Score</p>
                <p className="text-xl font-bold text-[#0D3B1A] dark:text-green-400">
                  {(score * 100).toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                <div className="flex items-center">
                  <Beer className="h-4 w-4 mr-1 text-[#764C25]" />
                  <p className="font-medium">{barName || 'Unknown Location'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date & Time</p>
                <p className="font-medium">
                  {timestamp ? new Date(timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Unknown Date'}
                </p>
              </div>
              
              {/* Irish decoration */}
              <div className="flex justify-center mt-4 space-x-2">
                <span className="text-green-600 text-xl">☘️</span>
                <span className="text-[#0D3B1A] dark:text-white font-medium">Sláinte!</span>
                <span className="text-green-600 text-xl">☘️</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function StPatricksDayRankingPage() {
  const [rankingsData, setRankingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [displayCount, setDisplayCount] = useState(100); // Number of items to display initially
  const [hasMore, setHasMore] = useState(false); // Whether there are more items to load
  const [allRankings, setAllRankings] = useState([]); // Store all rankings data
  
  // The specific date for St. Patrick's Day - March 17, 2025
  const stPatricksDay = new Date(2025, 2, 20); // Month is 0-indexed, so 2 = March
  
  // Format the St. Patrick's Day date for display
  const formattedStPatricksDay = stPatricksDay.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    fetchStPatricksDayRankings();
  }, []);

  // Update displayed rankings when allRankings or displayCount changes
  useEffect(() => {
    setRankingsData(allRankings.slice(0, displayCount));
    setHasMore(allRankings.length > displayCount);
  }, [allRankings, displayCount]);

  const fetchStPatricksDayRankings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create timestamp range for St. Patrick's Day (start and end of day)
      const startOfDay = new Date(stPatricksDay);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(stPatricksDay);
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
      
      // Store all rankings
      setAllRankings(sortedPours);
      // Initial display will be handled by the useEffect
    } catch (err) {
      console.error("Error fetching crawl rankings:", err);
      setError("Failed to load crawl rankings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to load more rankings
  const loadMoreRankings = () => {
    setDisplayCount(prevCount => prevCount + 100);
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

  // Function to open the image modal
  const openImageModal = (pour) => {
    setSelectedImage({
      url: pour.url || pour.processedUrl || '/placeholder-guinness.jpg',
      userName: pour.userName,
      barName: pour.barName,
      score: pour.score,
      timestamp: pour.timestamp
    });
  };

  // Function to close the image modal
  const closeImageModal = () => {
    setSelectedImage(null);
  };

  if (loading && allRankings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]" style={{ background: 'url("https://www.transparenttextures.com/patterns/classy-fabric.png")', backgroundColor: '#F5F5F5' }}>
        <div className="flex flex-col items-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-[#0D3B1A] mb-4" />
            <Beer className="h-8 w-8 text-[#764C25] absolute top-4 left-4" />
          </div>
          <p className="text-[#0D3B1A] font-semibold">Loading St. Patrick's Day Rankings...</p>
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
              St. Patrick's Day Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-4 rounded-md text-red-600 mb-4 border border-red-200">
              {error}
            </div>
            <Button 
              onClick={() => fetchStPatricksDayRankings()}
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
        {/* St. Patrick's Day decorations */}
        <div className="relative">
          <div className="absolute -top-6 -left-6 text-[#0D3B1A] text-4xl rotate-[-15deg]">☘️</div>
          <div className="absolute -top-6 -right-6 text-[#0D3B1A] text-4xl rotate-[15deg]">☘️</div>
          <div className="absolute -top-2 left-1/4 text-3xl rotate-[5deg]">🍀</div>
          <div className="absolute -top-4 right-1/3 text-3xl rotate-[-10deg]">🇮🇪</div>
        </div>
        
        <Card className="mb-6 border-4 border-[#0D3B1A] shadow-xl overflow-hidden">
          <CardHeader className="bg-[#0D3B1A] text-white relative">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2Z" />
              </svg>
            </div>
            <div className="absolute top-2 right-2 text-2xl">🍀</div>
            <CardTitle className="text-3xl font-bold flex items-center">
              <Trophy className="h-8 w-8 text-[#FFC107] mr-3" />
              St. Patrick's Day Champions
            </CardTitle>
            <div className="flex items-center mt-2 text-gray-200">
              <Calendar className="h-5 w-5 mr-2 text-[#FFC107]" />
              <p className="italic">{formattedStPatricksDay}</p>
            </div>
            {allRankings.length > 0 && (
              <div className="mt-2 text-sm text-gray-200">
                <span>Showing {Math.min(displayCount, allRankings.length)} of {allRankings.length} competitors</span>
              </div>
            )}
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
                St. Patrick's Day Leaderboard
              </h3>
              <p className="text-gray-200">
                Current rankings of the St. Patrick's Day celebration. Who will be the St. Patrick's Day Champion?
              </p>
            </div>
            
            {/* Rankings */}
            {rankingsData.length > 0 ? (
              <div className="space-y-4">
                {/* Top 3 podium */}
                {allRankings.slice(0, 3).length > 0 && (
                  <div className="flex flex-col md:flex-row gap-4 mb-8 relative">
                    {/* St. Patrick's Day decorations for podium */}
                    <div className="absolute -top-6 left-1/4 text-3xl rotate-[-10deg]">☘️</div>
                    <div className="absolute -top-8 right-1/4 text-3xl rotate-[10deg]">🍀</div>
                    <div className="absolute -bottom-4 left-1/3 text-2xl rotate-[5deg]">🇮🇪</div>
                    
                    {/* Create placeholders for missing positions */}
                    {Array.from({ length: 3 }).map((_, index) => {
                      const pour = allRankings[index]; // Always show top 3 from all rankings
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
                                    onError={(e) => {
                                      console.log("Podium image failed to load:", e.target.src);
                                      e.target.src = '/placeholder-avatar.jpg';
                                    }}
                                  />
                                </div>
                                <div className="absolute -top-2 -right-2 text-2xl">
                                  {getMedalEmoji(index)}
                                </div>
                                {index === 0 && (
                                  <div className="absolute -top-4 -left-2 text-xl">👑</div>
                                )}
                              </div>
                              <h3 className="font-bold text-center">{pour.userName}</h3>
                              <div className="text-xl font-bold text-[#0D3B1A]">
                                {(pour.score * 100).toFixed(1)}%
                              </div>
                              <div className={`w-full ${podiumHeights[index]} mt-2 rounded-t-lg bg-gradient-to-t from-[#0D3B1A] to-[#164A2A] flex items-end justify-center relative overflow-hidden`}>
                                {/* Shamrock pattern on podium */}
                                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                                  <span className="text-white text-4xl">☘️</span>
                                </div>
                                <span className="text-white font-bold mb-2 text-xl relative z-10">#{index + 1}</span>
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
                  <div className="bg-[#0D3B1A] text-white py-3 px-4 font-bold text-lg flex items-center justify-between">
                    <div>
                      <span className="mr-2">☘️</span>
                      All St. Patrick's Day Competitors
                      <span className="ml-2">☘️</span>
                    </div>
                    <div className="text-sm font-normal">
                      {loading && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
                      {allRankings.length > 0 && (
                        <span>Showing {Math.min(displayCount, allRankings.length)} of {allRankings.length}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {rankingsData.map((pour, index) => (
                      <div key={pour.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center mb-3">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-[#0D3B1A] text-white font-bold mr-4 relative shadow-md">
                            {allRankings.indexOf(pour) + 1}
                            {allRankings.indexOf(pour) < 3 && (
                              <span className="absolute -top-1 -right-1 text-xl">
                                {getMedalEmoji(allRankings.indexOf(pour))}
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
                                onError={(e) => {
                                  console.log("Image failed to load:", e.target.src);
                                  e.target.src = '/placeholder-avatar.jpg';
                                }}
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
                              {/* Image with fixed aspect ratio - now clickable */}
                              <div 
                                className="w-24 h-24 relative rounded-md overflow-hidden flex-shrink-0 border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal(pour)}
                                role="button"
                                aria-label={`View larger image of pour by ${pour.userName}`}
                              >
                                <img
                                  src={pour.url || pour.processedUrl || '/placeholder-guinness.jpg'}
                                  alt={`Pour by ${pour.userName}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.log("Pour image failed to load:", e.target.src);
                                    e.target.src = '/placeholder-guinness.jpg';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                {/* Add a visual indicator that the image is clickable */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <div className="bg-black/60 rounded-full p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Pour details */}
                              <div className="flex-grow">
                                <div className="flex items-center text-sm text-gray-700 mb-1">
                                  <Award className="h-4 w-4 mr-1 text-[#FFC107]" />
                                  <span className="font-medium">G Split Attempt</span>
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
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <div className="p-4 flex justify-center border-t border-gray-200">
                      <Button 
                        onClick={loadMoreRankings}
                        className="bg-[#0D3B1A] text-white hover:bg-[#0A2E14] shadow-md"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>Load Next 100 Competitors</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8 bg-white rounded-lg shadow-md border-2 border-[#0D3B1A]">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Beer className="h-24 w-24 text-gray-300 absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">☘️</div>
                </div>
                <h3 className="text-xl font-bold text-[#0D3B1A] mb-2">No G Splits Yet</h3>
                <p className="text-gray-600">The celebration hasn't started! Check back later today.</p>
                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                  Be the first to split the perfect G and claim your spot at the top of the St. Patrick's Day leaderboard!
                </p>
                <div className="flex justify-center mt-4">
                  <span className="text-2xl mx-1">☘️</span>
                  <span className="text-2xl mx-1">🍀</span>
                  <span className="text-2xl mx-1">🇮🇪</span>
                </div>
              </div>
            )}
            
            {/* Refresh Button */}
            {allRankings.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Button 
                  onClick={() => fetchStPatricksDayRankings()}
                  className="bg-[#0D3B1A] text-white hover:bg-[#0A2E14] shadow-md"
                  disabled={loading}
                >
                  <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
                  Refresh Rankings
                </Button>
              </div>
            )}
            
            {/* Footer with Irish blessing */}
            <div className="mt-8 text-center italic text-[#0D3B1A] text-sm">
              <div className="flex justify-center mb-2">
                <span className="text-xl mx-1">☘️</span>
                <span className="text-xl mx-1">🍀</span>
                <span className="text-xl mx-1">🇮🇪</span>
              </div>
              <p>"May your troubles be less, and your blessings be more,</p>
              <p>And nothing but happiness come through your door!"</p>
              <div className="mt-2 text-xs text-[#0D3B1A]/70">Happy St. Patrick's Day! Sláinte! ☘️</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Image Modal */}
      {selectedImage && (
        <ImageModal 
          isOpen={!!selectedImage}
          onClose={closeImageModal}
          imageUrl={selectedImage.url}
          userName={selectedImage.userName}
          barName={selectedImage.barName}
          score={selectedImage.score}
          timestamp={selectedImage.timestamp}
        />
      )}
    </div>
  );
}

export default StPatricksDayRankingPage;
