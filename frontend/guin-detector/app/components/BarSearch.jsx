import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2 } from "lucide-react";

export default function BarSearch({ onBarSelect }) {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nearbyBars, setNearbyBars] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Get user's location on component mount
  useEffect(() => {
    getUserLocation();
  }, []);

  // Fetch nearby bars when user location is available
  useEffect(() => {
    if (userLocation) {
      fetchNearbyBars();
    }
  }, [userLocation]);

  // Handle search input changes with debounce
  useEffect(() => {
    // Safely check if searchValue exists and has a length
    if (!searchValue || searchValue.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounce
    const timeout = setTimeout(() => {
      searchBars(searchValue);
    }, 300);

    setSearchTimeout(timeout);

    // Cleanup on unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchValue]);

  const getUserLocation = () => {
    setLoadingNearby(true);
    setLocationError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Unable to get your location. Please search manually.");
          setLoadingNearby(false);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser. Please search manually.");
      setLoadingNearby(false);
    }
  };

  const fetchNearbyBars = async () => {
    try {
      setLoadingNearby(true);
      
        const response = await fetch(`/api/nearby-bars?lat=${userLocation.lat}&lon=${userLocation.lng}`);

        setLoadingNearby(false);
      
      if (!response.ok) {
        throw new Error('Failed to fetch nearby bars');
      }
      
      const data = await response.json();
      
      console.log('data');
      console.log(data);
      if (data && data.length > 0) {
        setNearbyBars(data.map(place => {
          // Ensure each place has the required properties
          if (!place) return null;
          return {
            id: place.id || Math.random().toString(36).substring(2),
            name: place.displayName || place.name || 'Unknown Bar',
            address: place.formattedAddress || place.vicinity || 'No address available',
            latitude: place.latitude || (place.location?.latitude) || null,
            longitude: place.longitude || (place.location?.longitude) || null,
            photoName: place.photoName || null,
            rating: place.rating || null
          };
        }).filter(Boolean));
      } else {
        setLocationError("No bars found nearby. Please search manually.");
      }
    } catch (error) {
      console.error("Error fetching nearby bars:", error);
      setLocationError("Error finding nearby bars. Please search manually.");
    } finally {
      setLoadingNearby(false);
    }
  };

  const searchBars = async (query) => {
    if (!query || query.trim().length < 2) return;
    
    try {
      setLoadingSearch(true);
      
      const response = await fetch(`/api/search-bars?keyWord=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search bars');
      }
      
      const data = await response.json();
      
      // Ensure we have an array to map over
      if (!Array.isArray(data)) {
        console.error("Search API did not return an array:", data);
        setSearchResults([]);
        return;
      }
      
      setSearchResults(data.map(place => {
        // Ensure each place has the required properties
        if (!place) return null;
        
        return {
          id: place.id || Math.random().toString(36).substring(2),
          name: place.displayName || place.name || 'Unknown Bar',
          address: place.formattedAddress || place.vicinity || 'No address available',
          latitude: place.latitude || (place.location?.latitude) || null,
          longitude: place.longitude || (place.location?.longitude) || null,
          photoName: place.photoName || null,
          rating: place.rating || null
        };
      }).filter(Boolean)); // Remove any null entries
    } catch (error) {
      console.error("Error searching bars:", error);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleInputChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleSelect = (bar) => {
    // Ensure we set a string value to the input
    setSearchValue(bar.name || bar.displayName?.text || '');
    setSearchResults([]);
    onBarSelect(bar);
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Input
          value={searchValue}
          onChange={handleInputChange}
          placeholder="Search for a bar..."
          className="pl-10"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        {loadingSearch && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      
      {loadingNearby && !searchValue && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500 mr-2" />
          <span className="text-sm text-gray-500">Finding nearby bars...</span>
        </div>
      )}
      
      {locationError && !searchValue && (
        <div className="text-sm text-amber-600 mt-2">
          {locationError}
        </div>
      )}
      
      {/* Show search results when searching */}
      {searchResults.length > 0 && (
        <ul className="mt-2 max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
          {searchResults.map((bar) => (
            <li
              key={bar.id}
              onClick={() => handleSelect(bar)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <div className="font-medium">{bar.name}</div>
                <div className="text-sm text-gray-500">{bar.address}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {/* Show nearby bars if available and no search is active */}
      {!searchValue && nearbyBars.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-medium text-gray-500 mb-2 px-2">Nearby Bars</h3>
          <ul className="max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
            {nearbyBars.map((bar) => (
              <li
                key={bar.id}
                onClick={() => handleSelect(bar)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="font-medium">{bar.name}</div>
                  <div className="text-sm text-gray-500">{bar.address}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* No results message */}
      {searchValue && searchValue.length >= 2 && !loadingSearch && searchResults.length === 0 && (
        <div className="text-sm text-gray-500 mt-2 text-center py-2">
          No bars found matching "{searchValue}"
        </div>
      )}
    </div>
  );
}