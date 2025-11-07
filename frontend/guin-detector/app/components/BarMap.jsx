"use client";

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Beer } from 'lucide-react';

// Replace with your Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function BarMap({ bars, onBarSelect, selectedBarId }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [selectedBar, setSelectedBar] = useState(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [-6.2603, 53.3498], // Dublin coordinates
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !bars) return;

    // Remove existing markers before adding new ones
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each bar
    bars.forEach(bar => {
      if (!bar.latitude || !bar.longitude) return;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `<div class="marker-content"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC107" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg></div>`;
      
      // Add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat([bar.longitude, bar.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-[#FFC107]">${bar.name}</h3>
                <p class="text-sm text-gray-600">${bar.address || ''}</p>
                <button 
                  class="text-sm text-[#FFC107] hover:text-[#ffd454] mt-2 inline-block cursor-pointer"
                  onclick="window.handleBarSelect('${bar.id}')"
                >
                  View Wall
                </button>
              </div>
            `)
        )
        .addTo(map.current);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (bars.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      bars.forEach(bar => {
        if (bar.latitude && bar.longitude) {
          bounds.extend([bar.longitude, bar.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Add global handler for bar selection
    window.handleBarSelect = (barId) => {
      if (onBarSelect) {
        onBarSelect(barId);
      }
    };

    // Cleanup global handler
    return () => {
      delete window.handleBarSelect;
    };
  }, [bars, onBarSelect]);

  useEffect(() => {
    if (!map.current || !selectedBarId) return;

    const bar = bars?.find((b) => b.id === selectedBarId);
    if (!bar || !bar.latitude || !bar.longitude) return;

    map.current.flyTo({
      center: [bar.longitude, bar.latitude],
      zoom: 14,
      essential: true,
      speed: 1.2,
    });
  }, [selectedBarId, bars]);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
      <style jsx global>{`
        .custom-marker {
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-content {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 50%;
          padding: 8px;
          box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
        }
        .mapboxgl-popup-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .mapboxgl-popup-tip {
          border-top-color: white;
        }
      `}</style>
    </div>
  );
} 