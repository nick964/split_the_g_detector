"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, deleteDoc, collection, query, where, collectionGroup } from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Beer, Trophy, Clock, Target, ArrowRight, Trash2, Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GuinnessPourModal from "../components/GuinessPourModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

function ProfilePageContent() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [guinnessData, setGuinnessData] = useState([]);
  const [selectedPour, setSelectedPour] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pourToDelete, setPourToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    totalPours: 0,
    averageScore: 0,
    bestScore: 0,
    fastestTime: Infinity,
  });
  const [isAddToBarOpen, setIsAddToBarOpen] = useState(false);
  const [selectedPourForBar, setSelectedPourForBar] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBar, setSelectedBar] = useState(null);
  const [isAddingToBar, setIsAddingToBar] = useState(false);

  // Helper function to convert Firestore timestamp to Date
  const getDateFromTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Handle string timestamps for backward compatibility
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    return null;
  };

  useEffect(() => {
    if (session) {
      fetchUserData();
    }
  }, [session]);

  const fetchUserData = async () => {
    try {
      const userDocRef = doc(db, "users", session.user.email);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User document does not exist");
      }

      const userData = userDoc.data();
      setUserData(userData);

      // Use collectionGroup to query all guinness documents across users
      const guinnessQuery = query(
        collectionGroup(db, "guinness"),
        where("userId", "==", session.user.email)
      );

      const guinnessSnapshot = await getDocs(guinnessQuery);

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

      // Sort by timestamp, handling both Firestore Timestamp and string formats
      setGuinnessData(guinnessItems.sort((a, b) => {
        const dateA = getDateFromTimestamp(a.timestamp);
        const dateB = getDateFromTimestamp(b.timestamp);
        
        if (!dateA || !dateB) return 0;
        return dateB - dateA; // Most recent first
      }));
      
      setStats({
        totalPours: guinnessItems.length,
        averageScore: guinnessItems.length ? (totalScore / guinnessItems.length).toFixed(1) : 0,
        bestScore: bestScore.toFixed(1),
        fastestTime: fastestTime === Infinity ? null : fastestTime,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (e, pour) => {
    e.stopPropagation(); // Prevent the card click event from triggering
    setPourToDelete(pour);
    setDeleteDialogOpen(true);
  };

  const deletePour = async () => {
    if (!pourToDelete || !session) return;

    setIsDeleting(true);
    try {
      // 1. Delete from user's guinness collection
      const userDocRef = doc(db, "users", session.user.email);
      const pourDocRef = doc(collection(userDocRef, "guinness"), pourToDelete.id);
      await deleteDoc(pourDocRef);

      // 2. Find and delete from bars collection - search by document ID
      const barsQuery = query(
        collectionGroup(db, "guinness"),
        where("id", "==", pourToDelete.id)
      );
      
      const barPourSnapshots = await getDocs(barsQuery);
      
      // Delete each matching document in bar guinness collections
      const barDeletePromises = barPourSnapshots.docs.map(async (docSnapshot) => {
        // Only delete if it's not the user's document we already deleted
        if (docSnapshot.ref.path !== pourDocRef.path) {
          await deleteDoc(docSnapshot.ref);
        }
      });
      
      await Promise.all(barDeletePromises);

      // 3. Update local state
      setGuinnessData(prevData => {
        const newData = prevData.filter(item => item.id !== pourToDelete.id);
        
        // Recalculate stats
        const totalPours = newData.length;
        let totalScore = 0;
        let bestScore = 0;
        let fastestTime = Infinity;
        
        newData.forEach(item => {
          const score = item.score * 100;
          totalScore += score;
          bestScore = Math.max(bestScore, score);
          if (item.sipLength) {
            fastestTime = Math.min(fastestTime, item.sipLength);
          }
        });
        
        setStats({
          totalPours,
          averageScore: totalPours ? (totalScore / totalPours).toFixed(1) : 0,
          bestScore: bestScore.toFixed(1),
          fastestTime: fastestTime === Infinity ? null : fastestTime,
        });
        
        return newData;
      });

      toast({
        title: "Success",
        description: "Guinness pour deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting pour:", error);
      toast({
        title: "Error",
        description: "Failed to delete pour",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPourToDelete(null);
    }
  };

  const formatTime = (time) => {
    if (!time) return "N/A";
    const seconds = Math.floor(time / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  // Format date for display
  const formatDate = (timestamp) => {
    const date = getDateFromTimestamp(timestamp);
    return date ? date.toLocaleString() : 'Unknown date';
  };

  const handleSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(`/api/search-bars?keyWord=${encodeURIComponent(query)}`);
      
      if (response.status === 404) {
        setSearchResults([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to search bars');
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching bars:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToBar = async () => {
    if (!selectedBar || !selectedPourForBar || !session) return;

    try {
      setIsAddingToBar(true);

      const response = await fetch('/api/add-to-bar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.email,
          userName: userData?.name || 'Anonymous',
          barId: selectedBar.id,
          barName: selectedBar.displayName,
          guinnessId: selectedPourForBar.id,
          score: selectedPourForBar.score,
          letterGrade: selectedPourForBar.letterGrade,
          time: selectedPourForBar.sipLength,
          imageUrl: selectedPourForBar.imageUrl || selectedPourForBar.url,
          photoName: selectedBar.photoName,
          latitude: selectedBar.latitude,
          longitude: selectedBar.longitude,
          formattedAddress: selectedBar.formattedAddress
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to bar');
      }

      toast({
        title: "Success",
        description: "Guinness pour added to bar successfully!",
      });

      // Close dialog and reset state
      setIsAddToBarOpen(false);
      setSelectedPourForBar(null);
      setSelectedBar(null);
      setSearchQuery('');
      setSearchResults([]);

      // Refresh the data to show the updated bar name
      await fetchUserData();

    } catch (error) {
      console.error("Error adding to bar:", error);
      toast({
        title: "Error",
        description: "Failed to add pour to bar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToBar(false);
    }
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
            Member since {userData?.createdAt && userData?.createdAt.seconds ? 
              new Date(userData.createdAt.seconds * 1000).toLocaleDateString() : 
              'Unknown date'}
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
            <Card 
              key={item.id} 
              className="overflow-hidden group relative"
            >
              <div 
                className="aspect-video relative cursor-pointer"
                onClick={() => setSelectedPour(item)}
              >
                <img
                  src={item.url}
                  alt={`Pour from ${formatDate(item.timestamp)}`}
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
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-500">
                    {formatDate(item.timestamp)}
                  </p>
                  <div className="flex justify-between items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-black hover:text-gray-700 hover:bg-gray-100 min-w-0 flex-1"
                      onClick={() => {
                        setSelectedPourForBar(item);
                        setIsAddToBarOpen(true);
                      }}
                    >
                      <MapPin className="h-4 w-4 text-[#FFC107] flex-shrink-0" />
                      <span className="truncate">
                        {item.barName ? item.barName : "Add To Bar!"}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      onClick={(e) => handleDeleteClick(e, item)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete split
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {guinnessData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No splits recorded yet. Time to start splitting G's!</p>
            <Link href="/scan">
              <Button className="mt-4 bg-[#FFC107] text-black hover:bg-[#ffd454]">
                Scan your First Split
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Pour Details Modal */}
      <GuinnessPourModal
        isOpen={!!selectedPour}
        onClose={() => setSelectedPour(null)}
        pour={selectedPour}
      />

      {/* Add to Bar Dialog */}
      <Dialog open={isAddToBarOpen} onOpenChange={setIsAddToBarOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add to Bar</DialogTitle>
            <DialogDescription>
              Search for a bar to add your Guinness pour
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Search for a bar..."
                className="pl-10"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              {isSearching && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
                {searchResults.map((bar) => (
                  <div
                    key={bar.id}
                    onClick={() => setSelectedBar(bar)}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                      selectedBar?.id === bar.id ? 'bg-[#FFC107] hover:bg-[#ffd454]' : ''
                    }`}
                  >
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{bar.displayName}</div>
                      <div className="text-sm text-gray-500">{bar.formattedAddress}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Bar Details */}
            {selectedBar && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold">{selectedBar.displayName}</h3>
                <p className="text-sm text-gray-600">{selectedBar.formattedAddress}</p>
                <Button
                  className="mt-4 w-full bg-[#FFC107] text-black hover:bg-[#ffd454]"
                  onClick={handleAddToBar}
                  disabled={isAddingToBar}
                >
                  {isAddingToBar ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding to Bar...
                    </>
                  ) : (
                    'Add to Bar'
                  )}
                </Button>
              </div>
            )}

            {/* No Results Message */}
            {searchQuery && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="text-sm text-gray-500 mt-2 text-center py-2">
                No bars found matching "{searchQuery}"
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Guinness Pour</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pour? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deletePour}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProfilePage() {
  return <ProfilePageContent />;
}