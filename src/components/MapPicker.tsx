import React, { useEffect, useRef, useState } from "react";
import { Search, MapPin, Navigation, Loader2 } from "lucide-react";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet CSS & JS dynamically to prevent React 19 dependency clashes
  useEffect(() => {
    // Check if leaflet is already loaded
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up scripts? We can keep them so we don't reload on remount
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Create map instance if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 4,
        zoomControl: false // We will add custom zoom control or standard topright
      });

      // Add Zoom control at top right
      L.control.zoom({ position: "topright" }).addTo(mapRef.current);

      // Use CartoDB Dark Matter tile layer for a beautiful dark-mode map
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);

      // Define a custom neon cyan marker icon
      const neonIcon = L.divIcon({
        className: "custom-neon-marker",
        html: `<div style="
          width: 16px; 
          height: 16px; 
          background: #00f0ff; 
          border: 3px solid #16161a; 
          border-radius: 50%; 
          box-shadow: 0 0 10px #00f0ff, 0 0 20px #00f0ff;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      // Add marker
      markerRef.current = L.marker([lat, lng], { icon: neonIcon, draggable: true }).addTo(mapRef.current);

      // Drag event handler
      markerRef.current.on("dragend", () => {
        const position = markerRef.current.getLatLng();
        onChange(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
      });

      // Map click handler
      mapRef.current.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        markerRef.current.setLatLng([lat, lng]);
        onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });
    }

    return () => {
      // Don't destroy on every single render, only cleanup if component unmounts
    };
  }, [leafletLoaded]);

  // Update marker position when lat/lng props change from inputs
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      const L = (window as any).L;
      if (!L) return;
      const currentPos = markerRef.current.getLatLng();
      if (currentPos.lat !== lat || currentPos.lng !== lng) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng]);
      }
    }
  }, [lat, lng]);

  // Handle address search using free Nominatim OpenStreetMap API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const selectSuggestion = (item: any) => {
    const targetLat = parseFloat(item.lat);
    const targetLng = parseFloat(item.lon);
    
    onChange(Number(targetLat.toFixed(6)), Number(targetLng.toFixed(6)));
    setSuggestions([]);
    setSearchQuery(item.display_name);

    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([targetLat, targetLng], 13);
      markerRef.current.setLatLng([targetLat, targetLng]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8a8a93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or city..."
            className="w-full bg-[#1e1e24] border border-[#323238] rounded-md text-xs text-[#e1e1e6] py-2.5 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] focus:border-[#00f0ff]"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-[#202024] hover:bg-[#2a2a30] border border-[#323238] text-xs font-semibold px-4 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {searching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Search"
          )}
        </button>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-11 left-0 right-0 bg-[#1e1e24] border border-[#323238] rounded-md shadow-2xl z-[1000] max-h-[180px] overflow-y-auto">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSuggestion(item)}
                className="w-full text-left px-4 py-2 text-[11px] text-[#e1e1e6] hover:bg-[#292930] border-b border-[#29292e] last:border-0 truncate flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                <span className="truncate">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Map Element */}
      <div className="relative border border-[#323238] rounded-lg overflow-hidden h-[240px] bg-[#121214]">
        {!leafletLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a1a1e] z-10 text-xs text-[#8a8a93]">
            <Loader2 className="w-6 h-6 text-[#00f0ff] animate-spin" />
            Initializing live map...
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Coordinate Display overlay */}
        <div className="absolute bottom-2 left-2 bg-[#16161a]/90 border border-[#2d2d34] px-2.5 py-1.5 rounded text-[10px] font-mono text-[#e1e1e6] z-[999] pointer-events-none flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-[#00f0ff]" />
          <span>Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}</span>
        </div>
      </div>
      <p className="text-[10px] text-[#8a8a93] italic">
        Click or drag the marker to adjust coordinates.
      </p>
    </div>
  );
}
