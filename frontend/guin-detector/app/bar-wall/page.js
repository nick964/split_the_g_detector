"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Beer, MapPin, Clock, Trophy, User, Star, Search, Loader2, Navigation, Hash, Phone, Globe } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy, limit, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";

function formatTime(time) {
  if (!time) return "N/A";
  const seconds = Math.floor(time / 1000);
  const milliseconds = Math.floor((time % 1000) / 10);
  return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
}

function formatDate(dateString) {
  if (!dateString) return "Unknown date";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

function BarWallContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [barResults, setBarResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBar, setSelectedBar] = useState(null);
  const [availableBars, setAvailableBars] = useState([]);
  const [loadingBars, setLoadingBars] = useState(true);
  const [barPhoto, setBarPhoto] = useState(null);
  const [barPours, setBarPours] = useState([]);
  const [selectedPour, setSelectedPour] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pourCount, setPourCount] = useState(0);

  // Get barId from URL on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const barId = params.get('bar');
    if (barId) {
      fetchBarDetails(barId);
    }
  }, []);

  // Fetch all available bars from Firebase
  useEffect(() => {
    const fetchBars = async () => {
      try {
        setLoadingBars(true);
        const barsCollection = collection(db, "bars");
        const barsQuery = query(barsCollection, orderBy("name"), limit(20));
        const barsSnapshot = await getDocs(barsQuery);
        
        if (!barsSnapshot.empty) {
          const barsData = barsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setAvailableBars(barsData);
        }
      } catch (error) {
        console.error("Error fetching bars:", error);
      } finally {
        setLoadingBars(false);
      }
    };
    
    fetchBars();
  }, []);

  const handleBarChange = (barId) => {
    if (!barId) {
      setSelectedBar(null);
      setBarPours([]);
      window.history.pushState({}, '', pathname);
      return;
    }

    const bar = availableBars.find(b => b.id === barId);
    if (bar) {
      setSelectedBar(bar);
      
      // Update URL with the selected bar ID
      const url = new URL(window.location);
      url.searchParams.set('bar', barId);
      window.history.pushState({}, '', url);
      
      // Fetch bar details
      fetchBarDetails(barId);
    }
  };

  // Fetch Guinness pours for the selected bar
  useEffect(() => {
    async function fetchBarGuinnesses() {
      if (!selectedBar) return;
      
      try {
        setLoading(true);
        
        // Get the bar document reference
        const barDocRef = doc(db, "bars", selectedBar.id);
        
        // Get the guinnesses subcollection
        const guinnessesCollection = collection(barDocRef, "guinnesses");
        
        // Create a query to sort by score (highest first)
        const guinnessesQuery = query(guinnessesCollection, orderBy("score", "desc"));
        
        const guinnessesSnapshot = await getDocs(guinnessesQuery);
        
        if (!guinnessesSnapshot.empty) {
          const guinnessesData = guinnessesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            barLocation: selectedBar.name
          }));
          
          setBarResults(guinnessesData);
        } else {
          setBarResults([]);
        }
      } catch (error) {
        console.error("Error fetching guinnesses for bar:", error);
        setBarResults([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBarGuinnesses();
  }, [selectedBar]);

  const fetchBarDetails = async (barId) => {
    try {
      setLoading(true);
      console.log("Fetching bar details for ID:", barId);

      // Get bar document
      const barDoc = await getDoc(doc(db, "bars", barId));
      
      if (!barDoc.exists()) {
        console.error("No bar found with ID:", barId);
        toast({
          title: "Error",
          description: "Bar not found.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const barData = { id: barDoc.id, ...barDoc.data() };
      console.log("Bar data fetched:", barData);
      setSelectedBar(barData);
      
      // Fetch bar photo if available
      if (barData.photoName) {
        try {
          const photoUrl = await getDownloadURL(ref(storage, `bars/${barData.photoName}`));
          setBarPhoto(photoUrl);
        } catch (error) {
          console.error("Error fetching bar photo:", error);
          setBarPhoto(null);
          
          // Only show toast for permission errors, not for missing files
          if (error.code === "storage/unauthorized") {
            toast({
              title: "Permission Error",
              description: "Could not access the bar photo. Please contact an administrator.",
              variant: "default",
            });
            
            console.warn("Firebase Storage Permission Error: Check your Firebase Storage rules to ensure they allow read access to bar photos.");
          }
        }
      } else {
        setBarPhoto(null);
      }
      
      // Count the pours for this bar
      try {
        const poursQuery = query(
          collection(db, "pours"),
          where("barId", "==", barId)
        );
        const poursSnapshot = await getDocs(poursQuery);
        setPourCount(poursSnapshot.size);
      } catch (error) {
        console.error("Error counting pours:", error);
        setPourCount(0);
      }
      
      // Fetch pours for this bar
      await fetchPoursForBar(barId);
      
    } catch (error) {
      console.error("Error fetching bar details:", error);
      toast({
        title: "Error",
        description: "Failed to load bar details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPoursForBar = async (barId) => {
    try {
      const poursQuery = query(
        collection(db, "pours"),
        where("barId", "==", barId),
        orderBy("timestamp", "desc")
      );
      
      const poursSnapshot = await getDocs(poursQuery);
      
      if (poursSnapshot.empty) {
        console.log("No pours found for this bar");
        setBarPours([]);
        return;
      }
      
      const poursData = await Promise.all(
        poursSnapshot.docs.map(async (doc) => {
          const pourData = { id: doc.id, ...doc.data() };
          
          // Convert timestamp to date if it exists
          if (pourData.timestamp && pourData.timestamp.toDate) {
            pourData.date = pourData.timestamp.toDate();
          }
          
          // Fetch user data if available
          if (pourData.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", pourData.userId));
              if (userDoc.exists()) {
                pourData.user = userDoc.data();
              }
            } catch (error) {
              console.error("Error fetching user for pour:", error);
            }
          }
          
          return pourData;
        })
      );
      
      console.log("Pours data fetched:", poursData);
      setBarPours(poursData);
      
    } catch (error) {
      console.error("Error fetching pours for bar:", error);
      toast({
        title: "Error",
        description: "Failed to load pours for this bar.",
        variant: "destructive",
      });
    }
  };

  const handlePourClick = (pour) => {
    setSelectedPour(pour);
    if (pour.imageUrl) {
      setSelectedImage(pour.imageUrl);
      setImageModalOpen(true);
    }
  };

  const handleImageModalClose = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
    setImageLoading(false);
  };

  if (status === "loading" || loadingBars) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC107] mb-4"></div>
          <p className="text-[#0D3B1A] font-semibold">Loading bar data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
          <Beer className="h-8 w-8 text-[#FFC107]" />
          The Guinness Wall of Fame
        </h1>
        <p className="text-gray-600 mb-6">
          Check out the best Guinness splits at your favorite bars!
        </p>

        {/* Bar Selection */}
        <div className="max-w-md mx-auto mb-8">
          <label htmlFor="barSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select a Bar
          </label>
          {availableBars.length > 0 ? (
            <select
              id="barSelect"
              value={selectedBar?.id || ""}
              onChange={(e) => handleBarChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FFC107] focus:border-[#FFC107]"
            >
              <option value="">-- Select a bar --</option>
              {availableBars.map(bar => (
                <option key={bar.id} value={bar.id}>{bar.name}</option>
              ))}
            </select>
          ) : (
            <div className="text-amber-600 text-sm">
              No bars found in the database. Add your pour to a bar to see it here!
            </div>
          )}
        </div>
      </div>

      {/* Bar Information Card */}
      {selectedBar && (
        <div className="mb-8">
          <Card className="overflow-hidden border-[#FFC107] border">
            <div className="flex flex-col md:flex-row">
              {/* Bar Photo */}
              <div className="md:w-1/3 relative h-48 md:h-auto bg-gray-100">
                {barPhoto ? (
                  <img 
                    src={barPhoto} 
                    alt={selectedBar.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log("Bar photo failed to load");
                      e.target.src = '/placeholder-bar.jpg';
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-200">
                    <Beer className="h-20 w-20 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Bar Details */}
              <div className="p-6 md:w-2/3">
                <h3 className="text-2xl font-bold mb-4">{selectedBar.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="flex items-center mb-2">
                      <MapPin className="h-5 w-5 mr-2 text-red-500" />
                      <span className="font-semibold mr-2">Address:</span> 
                      {selectedBar.formattedAddress || "No address available"}
                    </p>
                    
                    <p className="flex items-center mb-2">
                      <Navigation className="h-5 w-5 mr-2 text-blue-500" />
                      <span className="font-semibold mr-2">Coordinates:</span>
                      {selectedBar.latitude && selectedBar.longitude ? 
                        `${selectedBar.latitude.toFixed(6)}, ${selectedBar.longitude.toFixed(6)}` : 
                        "No coordinates available"
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="flex items-center mb-2">
                      <Hash className="h-5 w-5 mr-2 text-green-500" />
                      <span className="font-semibold mr-2">Pour Count:</span>
                      <Badge className="bg-[#FFC107] text-black">{pourCount}</Badge>
                    </p>
                    
                    {selectedBar.phone && (
                      <p className="flex items-center mb-2">
                        <Phone className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="font-semibold mr-2">Phone:</span>
                        {selectedBar.phone}
                      </p>
                    )}
                  </div>
                </div>
                
                {selectedBar.website && (
                  <a 
                    href={selectedBar.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center mt-4 text-blue-600 hover:underline"
                  >
                    <Globe className="h-4 w-4 mr-1" /> Visit Website
                  </a>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Brick Wall Background */}
      <div className="relative p-6 rounded-lg" style={{
        backgroundImage: "url('https://www.transparenttextures.com/patterns/brick-wall.png')",
        backgroundColor: "#8B4513",
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.5)"
      }}>
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-10 rounded-lg"></div>
        
        {/* Bar Name Sign */}
        {selectedBar && (
          <div className="relative mb-8 mx-auto w-fit p-4 bg-[#2e1a0e] text-[#FFC107] border-4 border-[#8B4513] rounded shadow-lg transform -rotate-1" style={{
            boxShadow: "0 4px 8px rgba(0,0,0,0.5)"
          }}>
            <h2 className="text-2xl font-bold text-center">{selectedBar.name}</h2>
            <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[#5c3a21] border-2 border-[#8B4513]"></div>
            <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#5c3a21] border-2 border-[#8B4513]"></div>
          </div>
        )}
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
              <p className="text-white">Loading Guinness pours...</p>
            </div>
          </div>
        )}
        
        {/* Results Grid */}
        {!loading && barResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {barResults.map((result) => (
              <Card key={result.id} className="bg-[#f5f5f5] border-0 transform rotate-1 shadow-lg hover:shadow-xl transition-all duration-300" style={{
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
              }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex justify-between items-center">
                    <span className="flex items-center">
                      <Trophy className={`h-5 w-5 mr-2 ${
                        result.letterGrade === "A+" ? "text-yellow-500" : 
                        result.letterGrade?.startsWith("A") ? "text-yellow-400" : 
                        result.letterGrade?.startsWith("B") ? "text-blue-500" : 
                        "text-gray-500"
                      }`} />
                      {result.userName || "Anonymous"}
                    </span>
                    <span className="text-2xl font-bold text-[#FFC107]">{result.letterGrade || "?"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="aspect-[3/4] mb-3 overflow-hidden rounded-md">
                    <img 
                      src={result.imageUrl || result.url || result.processedUrl || '/placeholder-guinness.jpg'} 
                      alt="Guinness pour" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log("Image failed to load:", e.target.src);
                        e.target.src = '/placeholder-guinness.jpg';
                      }}
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center">
                      <Star className="h-4 w-4 mr-1 text-[#FFC107]" />
                      <span className="font-semibold">Score:</span> {(result.score * 100).toFixed(1)}%
                    </p>
                    <p className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="font-semibold">Time:</span> {formatTime(result.time)}
                    </p>
                    <p className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-red-500" />
                      <span className="font-semibold">Location:</span> {result.barLocation || selectedBar.name}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 text-xs text-gray-500">
                  Poured on {formatDate(result.timestamp)}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!loading && barResults.length === 0 && selectedBar && (
          <div className="text-center py-12 relative">
            <p className="text-white text-xl font-semibold">No Guinness pours recorded at {selectedBar.name} yet!</p>
            <p className="text-white mt-2">Be the first to add your pour to the wall.</p>
            <Link href="/scan">
              <Button className="mt-4 bg-[#FFC107] text-black hover:bg-[#ffd454]">
                Record Your Pour
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      {/* Add Your Pour Button */}
      <div className="mt-8 text-center">
        <Link href="/scan">
          <Button className="bg-[#FFC107] text-black hover:bg-[#ffd454] text-lg px-6 py-2">
            Add Your Pour to the Wall
          </Button>
        </Link>
      </div>

      {/* Image Modal */}
      {imageModalOpen && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={handleImageModalClose}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            <Image
              src={selectedImage}
              alt="Guinness pour"
              width={800}
              height={800}
              className="object-contain w-full h-auto max-h-[90vh]"
              onLoadingComplete={() => setImageLoading(false)}
              onLoadStart={() => setImageLoading(true)}
            />
            <button
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center"
              onClick={handleImageModalClose}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BarWallPage() {
  return <BarWallContent />;
} 