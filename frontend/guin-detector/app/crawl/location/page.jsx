"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Beer, MapPin, Navigation, Loader2, Check, X, Compass } from "lucide-react";
import { useSession } from "next-auth/react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

const mapContainerStyle = {
  width: '100%',
  height: '60vh',
  borderRadius: '0.5rem',
  border: '4px solid #0D3B1A', // Irish green border
};

const defaultOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

// Default location (Philadelphia)
const DEFAULT_LOCATION = {
  lat: 39.9687445,
  lng: -75.1782273
};

export default function CrawlLocationPage() {
  const { data: session } = useSession();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [crawlBars, setCrawlBars] = useState([]);
  const [selectedBar, setSelectedBar] = useState(null);
  const [map, setMap] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUpdatingBar, setIsUpdatingBar] = useState(false);
  
  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY,
    libraries: ['places'],
  });

  // Check if user is admin
  useEffect(() => {
    if (session?.user?.email === "nickr964@gmail.com") {
      setIsAdmin(true);
    }
  }, [session]);

  // Listen for admin location updates and bar data from Firebase
  useEffect(() => {
    const crawlDocRef = doc(db, 'crawl', 'current');
    
    // Set up real-time listener for location updates and bar data
    const unsubscribe = onSnapshot(crawlDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        
        // Get admin location
        if (data.adminLocation) {
          console.log("Admin location from Firebase:", data.adminLocation);
          setCurrentLocation(data.adminLocation);
        } else {
          // No admin location set yet, use default
          setCurrentLocation(DEFAULT_LOCATION);
        }
        
        // Get bars from Firebase
        if (data.bars && Array.isArray(data.bars) && data.bars.length > 0) {
          console.log("Bars loaded from Firebase:", data.bars.length);
          setCrawlBars(data.bars);
        } else if (data.visitedBarIds) {
          // For backward compatibility with older data structure
          console.log("Using legacy visitedBarIds format");
        }
      } else {
        // Document doesn't exist yet, use default location
        setCurrentLocation(DEFAULT_LOCATION);
      }
    }, (error) => {
      console.error("Error getting data from Firebase:", error);
      setCurrentLocation(DEFAULT_LOCATION);
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  // For admin: Update location in Firebase when browser location changes
  useEffect(() => {
    if (!isAdmin) return;
    
    const updateAdminLocation = () => {
      if (navigator.geolocation) {
        setIsUpdatingLocation(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            try {
              // Update Firebase with admin's location
              const crawlDocRef = doc(db, 'crawl', 'current');
              await setDoc(crawlDocRef, { 
                adminLocation: newLocation,
                lastUpdated: new Date().toISOString()
              }, { merge: true });
              
              console.log("Admin location updated in Firebase:", newLocation);
            } catch (error) {
              console.error("Error updating admin location:", error);
            } finally {
              setIsUpdatingLocation(false);
            }
          },
          (error) => {
            console.error("Error getting admin location:", error);
            setIsUpdatingLocation(false);
          }
        );
      }
    };
    
    // Update location immediately on load
    updateAdminLocation();
    
    // Set up interval to update location periodically (every 30 seconds)
    const intervalId = setInterval(updateAdminLocation, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [isAdmin]);

  const onMapLoad = (map) => {
    setMap(map);
  };

  const centerMapOnUser = () => {
    if (map && currentLocation) {
      map.panTo(currentLocation);
      map.setZoom(15);
    }
  };

  // For admin: Manually update location
  const updateAdminLocation = () => {
    if (!isAdmin) return;
    
    setIsUpdatingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          try {
            // Update Firebase with admin's location
            const crawlDocRef = doc(db, 'crawl', 'current');
            await setDoc(crawlDocRef, { 
              adminLocation: newLocation,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            console.log("Admin location manually updated:", newLocation);
          } catch (error) {
            console.error("Error updating admin location:", error);
          } finally {
            setIsUpdatingLocation(false);
          }
        },
        (error) => {
          console.error("Error getting admin location:", error);
          setIsUpdatingLocation(false);
        }
      );
    }
  };

  // For admin: Toggle bar visited status
  const toggleBarVisited = async (barId) => {
    if (!isAdmin) return;
    
    setIsUpdatingBar(true);
    
    try {
      // Find the bar and toggle its status
      const updatedBars = crawlBars.map(bar => {
        if (bar.id === barId) {
          return { ...bar, visited: !bar.visited };
        }
        return bar;
      });
      
      // Update Firebase with the new bar status
      const crawlDocRef = doc(db, 'crawl', 'current');
      await setDoc(crawlDocRef, { 
        bars: updatedBars,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      // Update local state
      setCrawlBars(updatedBars);
      
      // If the selected bar is the one being updated, update it too
      if (selectedBar && selectedBar.id === barId) {
        const updatedBar = updatedBars.find(bar => bar.id === barId);
        setSelectedBar(updatedBar);
      }
      
      console.log(`Bar ${barId} visited status toggled to ${!crawlBars.find(bar => bar.id === barId).visited}`);
    } catch (error) {
      console.error("Error updating bar status:", error);
    } finally {
      setIsUpdatingBar(false);
    }
  };

  // Create path for the crawl
  const getPathCoordinates = () => {
    if (!currentLocation || !crawlBars.length) return [];
    
    return [
      currentLocation,
      ...crawlBars.map(bar => bar.location)
    ];
  };

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8" style={{ background: 'url("https://www.transparenttextures.com/patterns/classy-fabric.png")', backgroundColor: '#F5F5F5' }}>
        <Card className="border-4 border-[#0D3B1A] shadow-xl">
          <CardHeader className="bg-[#0D3B1A] text-white">
            <CardTitle className="text-2xl font-bold flex items-center">
              <MapPin className="h-6 w-6 text-[#FFC107] mr-2" />
              Guinness Crawl Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-4 rounded-md text-red-600 mb-4 border border-red-200">
              Failed to load Google Maps. Please check your API key.
            </div>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-[#0D3B1A] text-white hover:bg-[#0A2E14]"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoaded || !currentLocation) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]" style={{ background: 'url("https://www.transparenttextures.com/patterns/classy-fabric.png")', backgroundColor: '#F5F5F5' }}>
        <div className="flex flex-col items-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-[#0D3B1A] mb-4" />
            <Beer className="h-8 w-8 text-[#764C25] absolute top-4 left-4" />
          </div>
          <p className="text-[#0D3B1A] font-semibold">Pouring your map...</p>
        </div>
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
              <Beer className="h-8 w-8 text-[#FFC107] mr-3" />
              Guinness Crawl Map
            </CardTitle>
            <p className="text-gray-200 mt-1 italic">Sláinte! Let's find some perfect pints!</p>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-[#F5F5F5] to-[#E5E5E5]">
            <div className="mb-6 p-4 bg-[#0D3B1A] text-white rounded-lg shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M4,2H19L17,22H6L4,2M6.2,4L7.8,20H16.2L17.8,4H6.2Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 flex items-center">
                <Compass className="h-5 w-5 mr-2 text-[#FFC107]" />
                Crawl Instructions
              </h3>
              <p className="text-gray-200">
                Follow the golden path to complete your Guinness crawl! Visit all the marked pubs, enjoy the perfect pints, and rate them as you go.
              </p>
              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <Button 
                    onClick={updateAdminLocation}
                    disabled={isUpdatingLocation}
                    className="bg-[#FFC107] text-black hover:bg-[#E5AC00] shadow-md"
                  >
                    {isUpdatingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-4 w-4 mr-2" />
                        Update My Location
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-300 mt-2">
                    As the crawl leader, your location is shared with all participants
                  </p>
                </div>
              )}
            </div>
            
            <div className="relative mb-6">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={currentLocation}
                zoom={14}
                options={defaultOptions}
                onLoad={onMapLoad}
              >
                {/* User/Admin location marker */}
                <Marker
                  position={currentLocation}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: isAdmin ? "#FFC107" : "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2
                  }}
                  title={isAdmin ? "Your Location (Crawl Leader)" : "Crawl Location"}
                />
                
                {/* Crawl path */}
                <Polyline
                  path={getPathCoordinates()}
                  options={{
                    strokeColor: "#FFC107",
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    geodesic: true,
                  }}
                />
                
                {/* Bar markers */}
                {crawlBars.map((bar, index) => (
                  <Marker
                    key={bar.id}
                    position={bar.location}
                    title={bar.name}
                    label={{
                      text: (index + 1).toString(),
                      color: "white"
                    }}
                    icon={{
                      url: bar.visited 
                        ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png" 
                        : "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    }}
                    onClick={() => setSelectedBar(bar)}
                  />
                ))}
                
                {/* Info window for selected bar */}
                {selectedBar && (
                  <InfoWindow
                    position={selectedBar.location}
                    onCloseClick={() => setSelectedBar(null)}
                  >
                    <div style={{ padding: "8px", maxWidth: "250px" }}>
                      <h3 style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#0D3B1A" }}>{selectedBar.name}</h3>
                      <p style={{ margin: "0", fontSize: "14px" }}>{selectedBar.address}</p>
                      <div style={{ margin: "12px 0 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ 
                          margin: "0", 
                          color: selectedBar.visited ? '#0D3B1A' : '#764C25',
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center" 
                        }}>
                          {selectedBar.visited ? '✓ Visited' : '🍺 Not visited yet'}
                        </p>
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBarVisited(selectedBar.id);
                            }}
                            style={{ 
                              padding: "6px 10px", 
                              background: selectedBar.visited ? "#f8d7da" : "#d4edda", 
                              border: "none", 
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              marginLeft: "8px",
                              fontWeight: "bold",
                              fontSize: "13px"
                            }}
                            disabled={isUpdatingBar}
                          >
                            {isUpdatingBar ? (
                              <span>...</span>
                            ) : selectedBar.visited ? (
                              <span>Mark Unvisited</span>
                            ) : (
                              <span>Mark Visited</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
              
              <Button
                onClick={centerMapOnUser}
                className="absolute bottom-4 left-4 bg-[#0D3B1A] hover:bg-[#0A2E14] text-white shadow-lg"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Center on {isAdmin ? "Me" : "Crawl Leader"}
              </Button>
              
              {/* Map decorations */}
              <div className="absolute -bottom-3 -right-3 text-3xl rotate-[15deg]">🍀</div>
            </div>
            
            {crawlBars.length > 0 ? (
              <div className="mt-8 bg-white p-5 rounded-lg shadow-md border-2 border-[#0D3B1A]">
                <h3 className="text-xl font-bold mb-4 text-[#0D3B1A] flex items-center border-b-2 border-[#0D3B1A] pb-2">
                  <Beer className="h-5 w-5 mr-2 text-[#764C25]" />
                  Crawl Progress
                </h3>
                <div className="space-y-3">
                  {crawlBars.map((bar, index) => (
                    <div 
                      key={bar.id}
                      className={`flex items-center p-4 rounded-md cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                        bar.visited ? 'bg-green-50 border-l-4 border-green-500' : 'bg-amber-50 border-l-4 border-amber-500'
                      }`}
                      onClick={() => {
                        setSelectedBar(bar);
                        if (map) {
                          map.panTo(bar.location);
                          map.setZoom(16);
                        }
                      }}
                    >
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#0D3B1A] text-white font-bold mr-4 shadow-md">
                        {index + 1}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-[#0D3B1A]">{bar.name}</h4>
                        <p className="text-sm text-gray-600">{bar.address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {bar.visited ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <Beer className="h-3 w-3 mr-1" />
                              Visited
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              <Beer className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={bar.visited 
                              ? "border-red-200 hover:bg-red-50 bg-white" 
                              : "border-green-200 hover:bg-green-50 bg-white"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBarVisited(bar.id);
                            }}
                            disabled={isUpdatingBar}
                          >
                            {isUpdatingBar ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : bar.visited ? (
                              <X className="h-4 w-4 text-red-500" />
                            ) : (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Progress indicator */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Crawl Progress</span>
                    <span className="text-sm font-medium text-[#0D3B1A]">
                      {crawlBars.filter(bar => bar.visited).length} of {crawlBars.length} pubs visited
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-[#0D3B1A] h-2.5 rounded-full" 
                      style={{ width: `${(crawlBars.filter(bar => bar.visited).length / crawlBars.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8 bg-white rounded-lg shadow-md border-2 border-[#0D3B1A]">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Beer className="h-24 w-24 text-gray-300 absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">☘️</div>
                </div>
                <h3 className="text-xl font-bold text-[#0D3B1A] mb-2">No Pubs on the Crawl Yet</h3>
                <p className="text-gray-600">The perfect pint awaits! Check back later for pub locations.</p>
                {isAdmin && (
                  <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                    As the crawl leader, you'll need to add pubs to the crawl in Firebase.
                  </p>
                )}
              </div>
            )}
            
            {/* Footer with Irish blessing */}
            <div className="mt-8 text-center italic text-[#0D3B1A] text-sm">
              <p>"May your glass be ever full, may the roof over your head be always strong,</p>
              <p>and may you be in heaven half an hour before the devil knows you're dead."</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
