"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Beer, MapPin, Clock, Trophy, User, Star, Search, Loader2, Navigation, Hash, Phone, Globe } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy, limit, where, documentId, startAt } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { BarMap } from "@/app/components/BarMap"; 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatTime(time) {
  if (!time) return "N/A";
  const seconds = Math.floor(time / 1000);
  const milliseconds = Math.floor((time % 1000) / 10);
  return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
}

function formatDate(timestamp) {
  if (!timestamp) return "Unknown date";
  try {
    // Handle Firestore Timestamp by converting to JS Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
  const [searchValue, setSearchValue] = useState('');
  const [isAddBarOpen, setIsAddBarOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBarToAdd, setSelectedBarToAdd] = useState(null);
  const [isAddingBar, setIsAddingBar] = useState(false);
  const [addBarSearchQuery, setAddBarSearchQuery] = useState('');
  const [addBarResults, setAddBarResults] = useState([]);

  const filteredBars = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return [];

    const matches = availableBars.filter((bar) => {
      const nameMatch = bar.name?.toLowerCase().includes(term);
      const addressMatch = bar.formattedAddress?.toLowerCase().includes(term);
      return nameMatch || addressMatch;
    });

    return matches.slice(0, 10);
  }, [searchValue, availableBars]);

  const fetchBarDetails = useCallback(async (barId) => {
    try {
      setLoading(true);

      const barDoc = await getDoc(doc(db, "bars", barId));

      if (!barDoc.exists()) {
        console.error("No bar found with ID:", barId);
        toast({
          title: "Error",
          description: "Bar not found.",
          variant: "destructive",
        });
        return;
      }

      const barData = { id: barDoc.id, ...barDoc.data() };
      setSelectedBar(barData);
      setBarPhoto(barData.photoUrl || null);
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
  }, []);

  const summarizeBar = (docSnapshot) => {
    const data = docSnapshot.data();

    const latitude = typeof data?.latitude === "number" ? data.latitude : null;
    const longitude = typeof data?.longitude === "number" ? data.longitude : null;

    return {
      id: docSnapshot.id,
      name: data?.name || "Unknown Bar",
      formattedAddress: data?.formattedAddress || data?.address || "",
      latitude,
      longitude,
      hasPhoto: Boolean(data?.photoUrl),
    };
  };

  // Get barId from URL or select random bar on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const barId = params.get('bar');
    
    if (barId) {
      fetchBarDetails(barId);
    } else {
      // If no bar ID in URL, fetch all bars and select a random one
      const fetchRandomBar = async () => {
        try {
          setLoadingBars(true);
          const barsCollectionRef = collection(db, "bars");

          const randomFirestoreId = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let id = '';
            for (let i = 0; i < 20; i++) {
              id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return id;
          };

          // Firestore document IDs for auto-generated docs are uniformly distributed.
          // Generate a random possible ID and start the query from there.
          const randomDocId = randomFirestoreId();

          const randomQuery = query(
            barsCollectionRef,
            orderBy(documentId()),
            startAt(randomDocId),
            limit(1)
          );

          let barsSnapshot = await getDocs(randomQuery);

          // If no document exists after that ID, wrap to the first document.
          if (barsSnapshot.empty) {
            const fallbackQuery = query(
              barsCollectionRef,
              orderBy(documentId()),
              limit(1)
            );
            barsSnapshot = await getDocs(fallbackQuery);
          }

          if (!barsSnapshot.empty) {
            const docSnapshot = barsSnapshot.docs[0];
            const randomBar = {
              id: docSnapshot.id,
              ...docSnapshot.data(),
            };

            const url = new URL(window.location);
            url.searchParams.set('bar', randomBar.id);
            window.history.pushState({}, '', url);

            fetchBarDetails(randomBar.id);
          } else {
            toast({
              title: "Error",
              description: "No bars available to select.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error fetching random bar:", error);
          toast({
            title: "Error",
            description: "Failed to load a random bar. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingBars(false);
        }
      };
      
      fetchRandomBar();
    }
  }, [fetchBarDetails]);

  // Fetch all available bars from Firebase
  useEffect(() => {
    const fetchBars = async () => {
      try {
        setLoadingBars(true);
        const barsCollection = collection(db, "bars");
        const barsQuery = query(barsCollection, orderBy("name"));
        const barsSnapshot = await getDocs(barsQuery);
        
        if (!barsSnapshot.empty) {
          const barsData = barsSnapshot.docs
            .map(summarizeBar)
            .filter(bar => bar.latitude !== null && bar.longitude !== null);

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

  const handleSearchInputChange = useCallback((e) => {
    const value = e.target.value;
    setSearchValue(value);
  }, []);

  const handleBarChange = useCallback((barId) => {
    if (!barId) {
      setSelectedBar(null);
      setBarPours([]);
      setSearchValue('');
      window.history.pushState({}, '', pathname);
      return;
    }

    const bar = availableBars.find(b => b.id === barId);
    if (bar) {
      setSelectedBar(bar);
      setSearchValue('');
      
      // Update URL with the selected bar ID
      const url = new URL(window.location);
      url.searchParams.set('bar', barId);
      window.history.pushState({}, '', url);
      
      // Fetch bar details
      fetchBarDetails(barId);
    }
  }, [availableBars, pathname, fetchBarDetails]);

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
          
          console.log("Guinnesses data:", guinnessesData);  
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

  const handleAddBarSearch = async (query) => {
    if (!query || query.trim().length < 3) {
      setAddBarResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(`/api/search-bars?keyWord=${encodeURIComponent(query)}`);
      
      if (response.status === 404) {
        setAddBarResults([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to search bars');
      }
      
      const data = await response.json();
      setAddBarResults(data);
    } catch (error) {
      console.error("Error searching bars:", error);
      setAddBarResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddBar = async () => {
    if (!selectedBarToAdd) return;

    try {
      setIsAddingBar(true);

      const response = await fetch('/api/add-to-bar-noguin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barId: selectedBarToAdd.id,
          barName: selectedBarToAdd.displayName,
          photoName: selectedBarToAdd.photoName,
          latitude: selectedBarToAdd.latitude,
          longitude: selectedBarToAdd.longitude,
          formattedAddress: selectedBarToAdd.formattedAddress
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add bar');
      }

      const data = await response.json();
      const newBarId = data.barId;

      toast({
        title: "Success",
        description: "Bar added successfully!",
      });

      // Close dialog and reset state
      setIsAddBarOpen(false);
      setSelectedBarToAdd(null);
      setAddBarResults([]);

      // Refresh the available bars list
      const barsCollection = collection(db, "bars");
      const barsQuery = query(barsCollection, orderBy("name"));
      const barsSnapshot = await getDocs(barsQuery);
      
      if (!barsSnapshot.empty) {
        const barsData = barsSnapshot.docs
          .map(summarizeBar)
          .filter(bar => bar.latitude !== null && bar.longitude !== null);

        setAvailableBars(barsData);
        
        // Select the newly added bar
        const newBar = barsData.find(bar => bar.id === newBarId);
        if (newBar) {
          handleBarChange(newBarId);
          setSearchValue(newBar.name);
        }
      }

    } catch (error) {
      console.error("Error adding bar:", error);
      toast({
        title: "Error",
        description: "Failed to add bar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingBar(false);
    }
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
          Guinness Bars - Wall of Fame
        </h1>
        <p className="text-gray-600 mb-6">
          Check out the best Guinness splits at your favorite bars!
        </p>
      </div>

      {/* Map Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-6 font-serif flex items-center justify-center gap-2" style={{
          background: "linear-gradient(45deg, #FFC107, #FFD700)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
          letterSpacing: "0.05em"
        }}>
          Guinnesses Around the World
          <span className="text-2xl" style={{ WebkitTextFillColor: "initial" }}>🌍</span>
        </h2>

        <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200 mb-6">
          <BarMap
            bars={availableBars}
            onBarSelect={handleBarChange}
            selectedBarId={selectedBar?.id}
          />
        </div>

        {/* Bar Selection */}
        <div className="max-w-md mx-auto mb-8">
          <label htmlFor="barSearch" className="block text-sm font-medium text-gray-700 mb-1">
            Search for a Bar
          </label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                id="barSearch"
                type="text"
                placeholder="Type to search bars..."
                value={searchValue}
                onChange={handleSearchInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FFC107] focus:border-[#FFC107]"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Search Results */}
          {searchValue && (
            <div className="mt-4">
              {filteredBars.length > 0 ? (
                <div className="space-y-2">
                  {filteredBars.map(bar => (
                    <div
                      key={bar.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBar?.id === bar.id 
                          ? 'bg-[#FFC107] border-[#FFC107] hover:bg-[#ffd454]' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleBarChange(bar.id)}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium">{bar.name}</div>
                          {bar.formattedAddress && (
                            <div className="text-sm text-gray-500">{bar.formattedAddress}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm mt-2">
                  No bars found matching "{searchValue}"
                </div>
              )}
            </div>
          )}
          
          {!searchValue && availableBars.length === 0 && (
            <div className="text-amber-600 text-sm mt-2">
              No bars found in the database. Add your pour to a bar to see it here!
            </div>
          )}

          {/* Add Bar Section */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Can't Find Your Bar?</h3>
            <p className="text-gray-600 mb-4">
              If you don't see your favorite bar in the search results, you can add it to our database. 
              This will help other Guinness enthusiasts find and rate their pours at your local spot.
            </p>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:bg-gray-50"
              onClick={() => setIsAddBarOpen(true)}
            >
              <MapPin className="h-4 w-4" />
              Add Your Bar
            </Button>
          </div>
        </div>

        {/* Add Bar Search Interface */}
        {isAddBarOpen && (
          <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Bar</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddBarOpen(false);
                  setAddBarSearchQuery('');
                  setAddBarResults([]);
                  setSelectedBarToAdd(null);
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="relative mb-4">
              <Input
                value={addBarSearchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setAddBarSearchQuery(value);
                  handleAddBarSearch(value);
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
            {addBarResults.length > 0 && (
              <div className="max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
                {addBarResults.map((bar) => (
                  <div
                    key={bar.id}
                    onClick={() => setSelectedBarToAdd(bar)}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                      selectedBarToAdd?.id === bar.id ? 'bg-[#FFC107] hover:bg-[#ffd454]' : ''
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
            {selectedBarToAdd && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold">{selectedBarToAdd.displayName}</h3>
                <p className="text-sm text-gray-600">{selectedBarToAdd.formattedAddress}</p>
                <Button
                  className="mt-4 w-full bg-[#FFC107] text-black hover:bg-[#ffd454]"
                  onClick={handleAddBar}
                  disabled={isAddingBar}
                >
                  {isAddingBar ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Bar...
                    </>
                  ) : (
                    'Add Bar'
                  )}
                </Button>
              </div>
            )}

            {/* No Results Message */}
            {addBarSearchQuery && addBarSearchQuery.length >= 3 && !isSearching && addBarResults.length === 0 && (
              <div className="text-sm text-gray-500 mt-2 text-center py-2">
                No bars found matching "{addBarSearchQuery}"
              </div>
            )}
          </div>
        )}
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
                    
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <Hash className="h-5 w-5 mr-2 text-green-500" />
                      <span className="font-semibold mr-2">Pour Count:</span>
                      <Badge className="bg-[#FFC107] text-black">{barResults.length}</Badge>
                    </div>
                    
                    {selectedBar.phone && (
                      <div className="flex items-center mb-2">
                        <Phone className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="font-semibold mr-2">Phone:</span>
                        {selectedBar.phone}
                      </div>
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
          <div className="relative mb-8 mx-auto w-fit p-6 bg-[#2e1a0e] text-[#FFC107] border-4 border-[#8B4513] rounded shadow-lg transform -rotate-1" style={{
            boxShadow: "0 4px 8px rgba(0,0,0,0.5)"
          }}>
            <h2 className="text-3xl font-bold text-center font-serif tracking-wide" style={{
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              fontFamily: "Playfair Display, Georgia, serif",
              letterSpacing: "0.05em"
            }}>
              {selectedBar.name}
            </h2>
            <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[#5c3a21] border-2 border-[#8B4513]" style={{
              boxShadow: "2px 2px 4px rgba(0,0,0,0.2)"
            }}></div>
            <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#5c3a21] border-2 border-[#8B4513]" style={{
              boxShadow: "2px 2px 4px rgba(0,0,0,0.2)"
            }}></div>
            {/* Decorative corners */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#FFC107] opacity-40"></div>
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#FFC107] opacity-40"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#FFC107] opacity-40"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#FFC107] opacity-40"></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
            {barResults.map((result) => (
              <Card key={result.id} 
                className="bg-[#2e1a0e] border-0 transform hover:-translate-y-1 transition-all duration-300" 
                style={{
                  boxShadow: "0 8px 16px rgba(0,0,0,0.4)"
              }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex justify-between items-center text-[#FFC107]">
                    <span className="flex items-center">
                      <Trophy className={`h-5 w-5 mr-2 ${
                        result.letterGrade === "A+" ? "text-yellow-500" : 
                        result.letterGrade?.startsWith("A") ? "text-yellow-400" : 
                        result.letterGrade?.startsWith("B") ? "text-blue-500" : 
                        "text-gray-500"
                      }`} />
                      {result.userName || "Anonymous"}
                    </span>
                    {/* Enhanced Letter Grade Display */}
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 bg-[#FFC107] rounded-full transform rotate-12 opacity-20"></div>
                      <span className="relative text-4xl font-bold font-serif z-10" style={{
                        textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
                      }}>
                        {result.letterGrade || "?"}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Framed Image */}
                  <div className="relative p-3 bg-[#5c3a21] rounded-lg shadow-inner mb-4" style={{
                    boxShadow: "inset 0 0 10px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)"
                  }}>
                    <div className="aspect-[3/4] overflow-hidden rounded-md" style={{
                      border: "8px solid #8B4513",
                      boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)"
                    }}>
                      <img 
                        src={result.imageUrl || result.url || result.processedUrl || '/placeholder-guinness.jpg'} 
                        alt="Guinness pour" 
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          console.log("Image failed to load:", e.target.src);
                          e.target.src = '/placeholder-guinness.jpg';
                        }}
                      />
                    </div>
                    {/* Decorative Nail */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-600 rounded-full" style={{
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                    }}></div>
                  </div>
                  <div className="space-y-2 text-sm text-[#FFC107]">
                    <p className="flex items-center bg-[#1a0f07] p-2 rounded">
                      <Star className="h-5 w-5 mr-2 text-yellow-500" />
                      <span className="font-semibold mr-2">Score:</span> 
                      <span className="text-lg">{(result.score * 100).toFixed(1)}%</span>
                    </p>
                    <p className="flex items-center bg-[#1a0f07] p-2 rounded">
                      <Clock className="h-5 w-5 mr-2 text-gray-400" />
                      <span className="font-semibold mr-2">Time:</span> 
                      <span className="font-mono">{formatTime(result.time)}</span>
                    </p>
                    <p className="flex items-center bg-[#1a0f07] p-2 rounded">
                      <MapPin className="h-5 w-5 mr-2 text-red-500" />
                      <span className="font-semibold mr-2">Location:</span> 
                      <span className="italic">{result.barLocation || selectedBar.name}</span>
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 text-xs text-[#FFC107] opacity-80 italic">
                  Poured on {formatDate(result.timestamp)}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {/* Empty State - Updated to match the rustic theme */}
        {!loading && barResults.length === 0 && selectedBar && (
          <div className="text-center py-12 relative">
            <div className="bg-[#2e1a0e] p-8 rounded-lg inline-block transform -rotate-1" style={{
              boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
            }}>
              <p className="text-[#FFC107] text-2xl font-serif mb-4">No Guinness pours recorded at {selectedBar.name} yet!</p>
              <p className="text-[#FFC107] opacity-80 mb-6">Be the first to add your pour to the wall.</p>
              <Link href="/scan">
                <Button className="bg-[#FFC107] text-black hover:bg-[#ffd454] transform hover:scale-105 transition-all duration-300">
                  Record Your Pour
                </Button>
              </Link>
            </div>
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