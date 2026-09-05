import { useEffect, useRef, useState } from 'react';

type MapPoint = { lat: number; lng: number };

type MapProps = {
  center?: MapPoint;
  onSelect?: (lat: number, lng: number) => void;
  height?: number;
  provider?: 'mapbox' | 'osm';
  routePoints?: MapPoint[];
};

// This component attempts to load Mapbox if a token is provided via Vite env VITE_MAPBOX_TOKEN.
// If no token is present or Mapbox fails to load, it falls back to a simple clickable placeholder
// that uses browser geolocation to set a default center.
export default function Map({ center, onSelect, height = 300, provider = 'osm', routePoints = [] }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [marker, setMarker] = useState<MapPoint | null>(null);
  const [loadedCenter, setLoadedCenter] = useState<MapPoint | null>(center || null);
  const markerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const [providerReady, setProviderReady] = useState(false);

  // react to external center prop changes (e.g., when user selects a suggestion)
  useEffect(() => {
    if (center) {
      setLoadedCenter(center);
      setMarker(center);
      if (mapRef.current && typeof mapRef.current.flyTo === 'function') {
        try {
          mapRef.current.flyTo({ center: [center.lng, center.lat], zoom: 14 });
        } catch (e) {
          try {
            mapRef.current.setCenter([center.lng, center.lat]);
          } catch {}
        }
      }
    }
  }, [center]);

  useEffect(() => {
    if (!loadedCenter) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLoadedCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => setLoadedCenter({ lat: 12.9716, lng: 77.5946 }),
        );
      } else {
        setLoadedCenter({ lat: 12.9716, lng: 77.5946 });
      }
    }
  }, [loadedCenter]);

  useEffect(() => {
    if (!mapRef.current || !(window as any).L || !routePoints || routePoints.length < 2) {
      if (routeLineRef.current) {
        try { routeLineRef.current.remove(); } catch {}
        routeLineRef.current = null;
      }
      return;
    }

    if (routeLineRef.current) {
      try { routeLineRef.current.remove(); } catch {}
      routeLineRef.current = null;
    }

    const bounds = (window as any).L.latLngBounds(routePoints.map((point) => [point.lat, point.lng]));
    routeLineRef.current = (window as any).L.polyline(
      routePoints.map((point) => [point.lat, point.lng]),
      { color: '#2563eb', weight: 5, opacity: 0.8 }
    ).addTo(mapRef.current);

    try {
      mapRef.current.fitBounds(bounds, { padding: [28, 28] });
    } catch {}
  }, [routePoints]);

  useEffect(() => {
    if (!containerRef.current) return;
    const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN;

    // If provider is mapbox but no token, fall back to OSM
    const useMapbox = provider === 'mapbox' && !!token;

    if (useMapbox) {
      // Mapbox branch
      const existing = (window as any).mapboxgl;
      if (existing) {
        tryInitMapbox(existing, token);
      } else {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
        script.onload = () => {
          const mb = (window as any).mapboxgl;
          tryInitMapbox(mb, token);
        };
        script.onerror = () => {
          console.error('Failed to load Mapbox script, falling back to OSM');
          initOSM();
        };
        document.body.appendChild(script);
      }
    } else {
      // OSM branch (Leaflet)
      initOSM();
    }

    function tryInitMapbox(mb: any, token: string) {
      try {
        mb.accessToken = token;
        if (!loadedCenter) return; // wait for geolocation
        mapRef.current = new mb.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [loadedCenter.lng, loadedCenter.lat],
          zoom: 13,
        });

        // add marker if exists
        if (marker) {
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = new mb.Marker().setLngLat([marker.lng, marker.lat]).addTo(mapRef.current);
        }

        mapRef.current.on('click', (e: any) => {
          const { lng, lat } = e.lngLat;
          setMarker({ lat, lng });
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = new mb.Marker().setLngLat([lng, lat]).addTo(mapRef.current);
          onSelect && onSelect(lat, lng);
        });
        setProviderReady(true);
      } catch (err) {
        console.error('Mapbox init failed, falling back to OSM', err);
        initOSM();
      }
    }

    function initOSM() {
      const existingL = (window as any).L;
      if (existingL) {
        createLeaflet(existingL);
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        const L = (window as any).L;
        createLeaflet(L);
      };
      script.onerror = () => {
        console.error('Failed to load Leaflet');
      };
      document.body.appendChild(script);
    }

    function createLeaflet(L: any) {
      try {
        if (!loadedCenter) return;
        // remove Mapbox map if any
        if (mapRef.current && mapRef.current.remove) {
          try { mapRef.current.remove(); } catch {}
          mapRef.current = null;
        }
        const map = L.map(containerRef.current).setView([loadedCenter.lat, loadedCenter.lng], 13);
        // Use the standard OpenStreetMap tile set for consistent English labels
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        mapRef.current = map;

        // marker
        if (markerRef.current) {
          try { markerRef.current.remove(); } catch {}
          markerRef.current = null;
        }
        if (marker) {
          markerRef.current = L.marker([marker.lat, marker.lng]).addTo(mapRef.current);
        }

        map.on('click', function (e: any) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
          setMarker({ lat, lng });
          onSelect && onSelect(lat, lng);
        });
        setProviderReady(true);
      } catch (err) {
        console.error('Leaflet init error', err);
      }
    }

    return () => {
      try {
        if (mapRef.current) {
          if (provider === 'osm' || !(window as any).mapboxgl) {
            // Leaflet
            try { mapRef.current.remove(); } catch {}
          } else if (mapRef.current && mapRef.current.remove) {
            try { mapRef.current.remove(); } catch {}
          }
          mapRef.current = null;
        }
      } catch {}
    };
  }, [loadedCenter, onSelect, provider]);

  // Placeholder click is not needed for full map providers, but keep a simple fallback handler
  function handlePlaceholderClick(e: React.MouseEvent) {
    if (!containerRef.current || !loadedCenter) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lng = loadedCenter.lng + (x / rect.width - 0.5) * 0.1;
    const lat = loadedCenter.lat - (y / rect.height - 0.5) * 0.1;
    setMarker({ lat, lng });
    onSelect && onSelect(lat, lng);
  }

  return (
    <div style={{ width: '100%', height }}>
      <div
        ref={containerRef}
        onClick={providerReady ? undefined : handlePlaceholderClick}
        style={{ width: '100%', height: '100%', position: 'relative', cursor: providerReady ? 'grab' : 'crosshair', border: '1px solid #ddd', borderRadius: 6 }}
      >
        {!mapRef.current && (
          <div style={{ position: 'absolute', left: 12, top: 12 }}>
            <div>Loading map...</div>
            <div>Center: {loadedCenter ? `${loadedCenter.lat.toFixed(5)}, ${loadedCenter.lng.toFixed(5)}` : 'loading...'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
