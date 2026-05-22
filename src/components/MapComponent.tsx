import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Star, ExternalLink } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

// Fix for default marker icons in Leaflet with Vite
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Create a custom icon for favorited locations
const favoriteIcon = L.divIcon({
  html: ReactDOMServer.renderToString(
    <div className="relative">
      <MapPin className="w-8 h-8 text-amber-400 drop-shadow-lg" />
      <Star className="w-4 h-4 text-white absolute -top-1 -right-1 fill-white" />
    </div>
  ),
  className: 'custom-map-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapComponentProps {
  location: string;
}

// Component to handle map centering when coordinates change
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 13);
  return null;
}

export default function MapComponent({ location }: MapComponentProps) {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    setLoading(true);
    setError(null);

    // Use Nominatim API for geocoding
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
          setError('Standort konnte nicht gefunden werden');
        }
      })
      .catch(() => {
        setError('Fehler beim Laden der Kartendaten');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [location]);

  const handleOpenMaps = () => {
    const query = coords ? `${coords[0]},${coords[1]}` : encodeURIComponent(location);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      window.open(`http://maps.apple.com/?q=${query}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="w-full h-80 bg-white/5 rounded-[2rem] flex flex-col items-center justify-center border border-white/5 animate-pulse relative">
        <MapPin className="w-8 h-8 text-white/20 mb-4" />
        <span className="text-white/20 text-xs font-bold uppercase tracking-widest">Karte wird geladen...</span>
      </div>
    );
  }

  if (error || !coords) {
    return (
      <div className="w-full h-80 bg-white/5 rounded-[2rem] flex flex-col items-center justify-center border border-white/10 relative">
        <MapPin className="w-8 h-8 text-white/10 mb-4" />
        <span className="text-white/30 text-xs font-bold uppercase tracking-widest mb-6">{error || 'Karte nicht verfügbar'}</span>
        <button 
          onClick={handleOpenMaps}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl"
        >
          <ExternalLink className="w-4 h-4" />
          In Google Maps suchen
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-80 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative z-0 group">
      <MapContainer 
        center={coords} 
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', background: '#f8f9fa' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={coords} />
        <Marker position={coords} icon={favoriteIcon}>
          <Popup>
            <div className="font-serif font-bold text-black dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {location}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      <button 
        onClick={handleOpenMaps}
        className="absolute bottom-6 right-6 z-[10] bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl"
      >
        <ExternalLink className="w-4 h-4" />
        Karten
      </button>

      <style>{`
        .leaflet-control-container .leaflet-control {
          background: rgba(0,0,0,0.5) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(10px) !important;
          overflow: hidden;
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          color: white !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-popup-content-wrapper {
          background: #050505;
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 1rem;
        }
        .leaflet-popup-tip {
          background: #050505;
        }
        .custom-map-marker {
          filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
        }
      `}</style>
    </div>
  );
}
