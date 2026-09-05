import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../../components/Map/Map';
import { createBooking } from '../../services/bookingService';
import { createBookingRequest } from '../../services/bookingService';
import { fetchAllBikeRides } from '../../services/bikeService';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aHar = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aHar), Math.sqrt(1 - aHar));
  return R * c;
}

const getStoredUser = (): { fullName?: string; email?: string; mobile?: string } | null => {
  try {
    const storedUser = localStorage.getItem('jaldiJanaUser');
    if (!storedUser) {
      return null;
    }

    const parsed = JSON.parse(storedUser) as { fullName?: string; email?: string; mobile?: string };
    return parsed?.fullName ? parsed : null;
  } catch (error) {
    console.error('Failed to read stored user', error);
    return null;
  }
};

export default function BookingPage() {
  // latest reverse-geocoded address object (from Nominatim)
  // populated inside reverseGeocode when Mapbox token is not present
  // shape example: { suburb, town, county, state_district, state, postcode, country, country_code }
  const [address, setAddress] = useState<any>(null);
  const navigate = useNavigate();
  const [user, setUser] = useState<{ fullName?: string; email?: string; mobile?: string; } | null>(() => getStoredUser());
  const [customer, setCustomer] = useState('');
  const [type, setType] = useState<'BIKE_RIDE' | 'SCOOTER_RIDE'>('BIKE_RIDE');

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setCustomer(storedUser.fullName || '');
      return;
    }

    fetch('https://common-oauth-service.onrender.com/api/auth/me', {
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        return response.json();
      })
      .then((data) => {
        setUser(data);
        setCustomer(data.fullName || '');
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  const hasMapbox = !!(import.meta as any).env?.VITE_MAPBOX_TOKEN;
  const [mapProvider, setMapProvider] = useState<'mapbox' | 'osm'>('osm');

  const [pickup, setPickup] = useState<{ name?: string; lat?: number; lng?: number }>({ name: '' });
  const [drop, setDrop] = useState<{ name?: string; lat?: number; lng?: number }>({ name: '' });
  const [pickupQuery, setPickupQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [pickupCenter, setPickupCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

  const [dropQuery, setDropQuery] = useState('');
  const [dropSuggestions, setDropSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [dropCenter, setDropCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // geocode helpers (Mapbox if token present, fallback to Nominatim)
  async function geocodeQuery(query: string) {
    const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    if (!query) return [];
    try {
      if (token) {
        // Restrict Mapbox geocoding results to India only using country=IN
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=6&language=en&country=IN`;
        const res = await fetch(url);
        const data = await res.json();
        return (data.features || []).map((f: any) => ({ name: f.place_name, lat: f.center[1], lng: f.center[0] }));
      } else {
        // Restrict Nominatim results to India using countrycodes=in
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&accept-language=en&countrycodes=in`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        return (data || []).map((d: any) => ({ name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }));
      }
    } catch (e) {
      console.error('geocode failed', e);
      return [];
    }
  }

  // debounced pickup query
  useEffect(() => {
    const t = setTimeout(() => {
      if (!pickupQuery) {
        setPickupSuggestions([]);
        setPickupCenter(undefined);
        return;
      }
      geocodeQuery(pickupQuery).then((res) => {
        setPickupSuggestions(res);
        // do NOT change map center while user is typing; wait for explicit "Use on map"
      });
    }, 300);
    return () => clearTimeout(t);
  }, [pickupQuery]);

  // debounced drop query
  useEffect(() => {
    const t = setTimeout(() => {
      if (!dropQuery) {
        setDropSuggestions([]);
        setDropCenter(undefined);
        return;
      }
      geocodeQuery(dropQuery).then((res) => {
        setDropSuggestions(res);
        // do NOT change map center while user is typing; wait for explicit "Use on map"
      });
    }, 300);
    return () => clearTimeout(t);
  }, [dropQuery]);

  const distanceKm = useMemo(() => {
    if (pickup.lat && pickup.lng && drop.lat && drop.lng) {
      return haversineKm({ lat: pickup.lat, lng: pickup.lng }, { lat: drop.lat, lng: drop.lng }).toFixed(2);
    }
    return '';
  }, [pickup, drop]);

  const [bikes, setBikes] = useState<Array<any>>([]);
  const [selectedBikes, setSelectedBikes] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchAllBikeRides()
      .then((data) => {
        if (!mounted) return;
        // ensure array
        setBikes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to fetch bike rides', err);
        setBikes([]);
      });
    return () => { mounted = false; };
  }, []);

  const [booked, setBooked] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{ pickup: string; destination: string; distance: string; vehicle: string } | null>(null);
  const [driverAssigned, setDriverAssigned] = useState<string | null>(null);
  const [driverResponse, setDriverResponse] = useState<'ACCEPT' | 'REJECT' | ''>('');

  useEffect(() => {
    if (booked) {
      // simulate driver assignment

      setTimeout(() => {
        if (selectedBikes && selectedBikes.length > 0) {
          const bk = bikes.find((b) => b.vehicleId === selectedBikes[0]);
          setDriverAssigned(bk ? bk.driverName : null);
        } else {
          setDriverAssigned(null);
        }
      }, 800);
    }
  }, [booked]);

  function toggleBikeSelection(id: string) {
    setSelectedBikes((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [fullScreenFor, setFullScreenFor] = useState<'pickup' | 'drop' | null>(null);
  const [fullScreenCenter, setFullScreenCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [fullScreenQuery, setFullScreenQuery] = useState('');
  const [fullScreenSuggestions, setFullScreenSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [fullScreenChosenName, setFullScreenChosenName] = useState<string>('');

  function openFullScreen(which: 'pickup' | 'drop') {
    setFullScreenFor(which);
    setFullScreenCenter(which === 'pickup' ? pickupCenter : dropCenter);
    // initialize search box with existing name
    const existingName = which === 'pickup' ? (pickup.name || '') : (drop.name || '');
    setFullScreenQuery(existingName);
    setFullScreenChosenName(existingName);
    setFullScreenOpen(true);
  }

  // debounced search in fullscreen overlay
  useEffect(() => {
    const t = setTimeout(() => {
      if (!fullScreenQuery) {
        setFullScreenSuggestions([]);
        return;
      }
      geocodeQuery(fullScreenQuery).then((res) => {
        setFullScreenSuggestions(res);
        if (res && res.length > 0) setFullScreenCenter({ lat: res[0].lat, lng: res[0].lng });
      });
    }, 300);
    return () => clearTimeout(t);
  }, [fullScreenQuery]);

  // reverse geocode lat/lng to a human readable name
  // returns { displayName, address? } or null on error
  async function reverseGeocode(lat: number, lng: number): Promise<{ displayName: string; address?: any } | null> {
    const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    try {
      if (token) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&language=en`;
        const res = await fetch(url);
        const data = await res.json();
        const feat = data.features && data.features[0];
        const place = feat && feat.place_name ? feat.place_name : '';
        return { displayName: place || '', address: feat || undefined };
      } else {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        const addressObj = data.address;
        return { displayName: data.display_name || '', address: addressObj };
      }
    } catch (e) {
      console.error('reverse geocode failed', e);
      return null;
    }
  }

  async function handleMapSelect(lat: number, lng: number) {
    // set coords immediately
    if (fullScreenFor === 'pickup') {
      setPickup((p) => ({ ...p, lat, lng }));
      setPickupCenter({ lat, lng });
    } else if (fullScreenFor === 'drop') {
      setDrop((d) => ({ ...d, lat, lng }));
      setDropCenter({ lat, lng });
    }

    // attempt reverse geocode to get place name
    const res = await reverseGeocode(lat, lng);
    const name = res?.displayName || '';
    if (res?.address) setAddress(res.address);
    if (name) {
      setFullScreenChosenName(name);
      setFullScreenQuery(name);
      // also update the specific target name immediately
      if (fullScreenFor === 'pickup') {
        setPickup((p) => ({ ...p, name }));
      } else if (fullScreenFor === 'drop') {
        setDrop((d) => ({ ...d, name }));
      }
    }
  }

  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number; coords: Array<{ lat: number; lng: number }> } | null>(null);

  async function fetchRouteInfo(start: { lat?: number; lng?: number }, end: { lat?: number; lng?: number }) {
    if (!start.lat || !start.lng || !end.lat || !end.lng) {
      setRouteInfo(null);
      return;
    }

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) {
        setRouteInfo(null);
        return;
      }
      const data = await res.json();
      const route = data.routes && data.routes[0];
      if (!route || !route.geometry || !route.geometry.coordinates) {
        setRouteInfo(null);
        return;
      }

      const coords = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      setRouteInfo({
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        coords,
      });
    } catch (error) {
      console.error('Route calculation failed', error);
      setRouteInfo(null);
    }
  }

  useEffect(() => {
    fetchRouteInfo(pickup, drop);
  }, [pickup.lat, pickup.lng, drop.lat, drop.lng]);

  function useCurrentLocationFor(which: 'pickup' | 'drop') {
    if (!navigator.geolocation) {
      alert('This browser does not support geolocation.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (which === 'pickup') {
          setPickup((prev) => ({ ...prev, ...nextPoint, name: prev.name || 'Current location' }));
          setPickupCenter(nextPoint);
          setPickupQuery('Current location');
        } else {
          setDrop((prev) => ({ ...prev, ...nextPoint, name: prev.name || 'Current location' }));
          setDropCenter(nextPoint);
          setDropQuery('Current location');
        }

        const res = await reverseGeocode(nextPoint.lat, nextPoint.lng);
        const name = res?.displayName || '';
        if (res?.address) setAddress(res.address);
        if (name) {
          if (which === 'pickup') {
            setPickup((prev) => ({ ...prev, ...nextPoint, name }));
          } else {
            setDrop((prev) => ({ ...prev, ...nextPoint, name }));
          }
        }
      },
      () => {
        const fallback = { lat: 12.9716, lng: 77.5946 };
        if (which === 'pickup') {
          setPickup((prev) => ({ ...prev, ...fallback, name: prev.name || 'Chennai, India' }));
          setPickupCenter(fallback);
        } else {
          setDrop((prev) => ({ ...prev, ...fallback, name: prev.name || 'Chennai, India' }));
          setDropCenter(fallback);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const routeSummary = routeInfo
    ? `${routeInfo.distanceKm.toFixed(2)} km • ${routeInfo.durationMin.toFixed(0)} min`
    : pickup.lat && pickup.lng && drop.lat && drop.lng
      ? `${haversineKm({ lat: pickup.lat, lng: pickup.lng }, { lat: drop.lat, lng: drop.lng }).toFixed(2)} km • route pending`
      : 'Add pickup and destination to calculate route';

  const mapillaryLink = pickup.lat && pickup.lng
    ? `https://www.mapillary.com/app/?focus=map&lat=${pickup.lat}&lng=${pickup.lng}&zoom=18`
    : 'https://www.mapillary.com/app/';

  if (!user) {
    return null;
  }

  return (
    <main className="ride-booking-page">
      <style>{`
        .ride-booking-page {
          --bg-1: #07131f;
          --bg-2: #0f172a;
          --panel: rgba(15, 23, 42, 0.8);
          --panel-soft: rgba(15, 23, 42, 0.62);
          --border: rgba(148, 163, 184, 0.2);
          --text: #edf6ff;
          --muted: #bfcee0;
          --gold: #fbbf24;
          --gold-strong: #f97316;
          --sky: #38bdf8;
          --shadow: 0 28px 60px rgba(2, 6, 23, 0.45);
          min-height: calc(100vh - 72px);
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(8, 17, 29, 0.85), rgba(10, 24, 37, 0.82)),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'%3E%3Cg fill='none' stroke='%2359b3d8' stroke-width='4' opacity='0.5'%3E%3Cpath d='M-100 580 L420 480 L650 520 L980 420 L1400 470 L1720 380'/%3E%3Cpath d='M180 150 L880 250 L1120 170 L1500 210'/%3E%3Cpath d='M250 820 L480 680 L760 760 L1040 620 L1340 720'/%3E%3Cpath d='M120 190 L120 760 M430 100 L430 820 M780 120 L780 870 M1160 90 L1160 830 M1450 170 L1450 830'/%3E%3C/g%3E%3Cg fill='%23dfeaf8' font-family='Arial, sans-serif'%3E%3Ctext x='410' y='470' font-size='84' font-weight='700' fill='%23dfeaf8' opacity='0.9'%3EBIHAR%3C/text%3E%3Ctext x='1050' y='280' font-size='52' fill='%23cfe7ff' opacity='0.9'%3EPATNA%3C/text%3E%3Ctext x='1010' y='640' font-size='44' fill='%23cfe7ff' opacity='0.8'%3EGAYA%3C/text%3E%3C/g%3E%3Cg stroke='%23c7d2fe' stroke-width='3' opacity='0.44'%3E%3Cpath d='M0 200 H1600 M0 360 H1600 M0 520 H1600 M0 680 H1600 M0 840 H1600 M380 0 V900 M760 0 V900 M1140 0 V900'/%3E%3C/g%3E%3C/svg%3E");
          background-size: cover;
          background-position: center;
          color: var(--text);
        }

        .ride-booking-shell {
          max-width: 1220px;
          margin: 0 auto;
          display: grid;
          gap: 20px;
        }

        .ride-booking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 12px 4px;
        }

        .ride-booking-header h1 {
          margin: 0;
          font-size: clamp(2.2rem, 4vw, 3.2rem);
        }

        .ride-booking-header .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.38);
          color: #fde68a;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .ride-hero-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 22px 24px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.86), rgba(14, 116, 144, 0.35));
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
        }

        .ride-hero-banner h2 {
          margin: 8px 0 0;
          font-size: clamp(1.7rem, 2.4vw, 2.6rem);
        }

        .hero-mini {
          display: inline-block;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.12);
          border: 1px solid rgba(251, 191, 36, 0.22);
          color: #fde68a;
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .hero-metrics {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hero-metrics div {
          min-width: 120px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.58);
          border: 1px solid var(--border);
        }

        .hero-metrics strong,
        .hero-metrics span {
          display: block;
        }

        .hero-metrics strong {
          color: #f8fafc;
          font-size: 1.1rem;
        }

        .hero-metrics span {
          color: var(--muted);
          font-size: 0.75rem;
        }

        .ride-booking-grid {
          display: grid;
          grid-template-columns: 1.05fr 1.2fr;
          gap: 20px;
        }

        .ride-panel {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border);
          border-radius: 26px;
          box-shadow: var(--shadow);
          padding: 22px;
          backdrop-filter: blur(10px);
        }

        .ride-user-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 18px;
        }

        .ride-user-name {
          font-size: 1.06rem;
          font-weight: 700;
        }

        .ride-user-email {
          display: block;
          margin-top: 4px;
          color: var(--muted);
          font-size: 0.82rem;
        }

        .ride-badge {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #bae6fd;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .ride-form {
          display: grid;
          gap: 18px;
          margin-top: 20px;
        }

        .ride-field {
          display: grid;
          gap: 8px;
        }

        .ride-field label {
          font-size: 0.85rem;
          color: var(--muted);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .ride-readonly {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
          color: #f8fafc;
          font-weight: 600;
        }

        .ride-select {
          width: 100%;
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.7);
          color: #f8fafc;
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 1rem;
        }

        .ride-action-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ride-btn {
          border: none;
          border-radius: 14px;
          padding: 13px 18px;
          font-size: 0.97rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .ride-btn:hover {
          transform: translateY(-1px);
        }

        .ride-btn.primary {
          background: linear-gradient(135deg, var(--gold), var(--gold-strong));
          color: #111827;
        }

        .ride-btn.secondary {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border);
          color: var(--text);
        }

        .ride-map-box {
          display: grid;
          gap: 16px;
        }

        .ride-location-card {
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.6);
        }

        .ride-location-card h3 {
          margin: 0 0 10px;
          font-size: 1.1rem;
        }

        .ride-location-card p {
          margin: 8px 0;
          color: var(--muted);
        }

        .ride-map-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ride-map-toolbar button {
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.8);
          color: var(--text);
          border-radius: 10px;
          padding: 9px 12px;
          cursor: pointer;
        }

        .ride-route-box {
          border: 1px solid rgba(56, 189, 248, 0.28);
          border-radius: 18px;
          background: rgba(14, 165, 233, 0.08);
          padding: 16px;
        }

        .ride-route-box strong {
          display: block;
          margin-bottom: 8px;
        }

        .ride-route-box a {
          color: #7dd3fc;
          text-decoration: none;
        }

        .ride-availability {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .ride-bike-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.65);
          color: var(--text);
        }

        .ride-bike-tag input {
          accent-color: var(--gold);
        }

        .ride-status-box {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid var(--border);
        }

        .ride-status-box p {
          margin: 7px 0;
          color: var(--muted);
        }

        .ride-confirm-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 6, 23, 0.72);
          z-index: 10000;
          padding: 20px;
        }

        .ride-confirm-modal {
          width: min(520px, 100%);
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 26px;
          box-shadow: var(--shadow);
          padding: 26px;
        }

        .ride-confirm-modal h3 {
          margin: 0 0 8px;
          font-size: 1.8rem;
        }

        .ride-confirm-modal p {
          margin: 8px 0;
          color: var(--muted);
        }

        .ride-confirm-details {
          margin: 18px 0;
          display: grid;
          gap: 10px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid var(--border);
        }

        .ride-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        @media (max-width: 980px) {
          .ride-booking-grid {
            grid-template-columns: 1fr;
          }

          .ride-booking-page {
            padding: 18px;
          }
        }
      `}</style>

      <div className="ride-booking-shell">
        <header className="ride-booking-header">
          <h1>Book your ride</h1>
          <div className="chip">⚡ Fast booking</div>
        </header>

        <div className="ride-hero-banner">
          <div>
            <span className="hero-mini">City rides</span>
            <h2>Book a safe ride in minutes</h2>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>₹10/km</strong>
              <span>Base fare</span>
            </div>
            <div>
              <strong>3 min</strong>
              <span>Avg. pickup</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Support</span>
            </div>
          </div>
        </div>

        <div className="ride-booking-grid">
          <section className="ride-panel">
            <div className="ride-user-card">
              <div>
                <div className="ride-user-name">{customer || user?.fullName || 'Passenger'}</div>
                <span className="ride-user-email">{user?.email || 'Logged in rider'}</span>
              </div>
              <span className="ride-badge">Verified</span>
            </div>

            <div className="ride-form">
              <div className="ride-field">
                <label>Customer</label>
                <div className="ride-readonly">{customer || user?.fullName || 'Passenger'}</div>
              </div>

              <div className="ride-field">
                <label>Trip type</label>
                <select value={type} onChange={(e) => setType(e.target.value as any)} className="ride-select">
                  <option value="BIKE_RIDE">Bike ride</option>
                  <option value="SCOOTER_RIDE">Scooter ride</option>
                </select>
              </div>

              <div className="ride-field">
                <label>Pickup</label>
                <div className="ride-location-card">
                    <h3>Pickup</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                        placeholder="Search pickup location"
                        value={pickupQuery}
                        onChange={(e) => { setPickupQuery(e.target.value); setPickup((p) => ({ ...p, name: '' })); }}
                        style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <button type="button" onClick={() => { geocodeQuery(pickupQuery).then((res) => { setPickupSuggestions(res); /* do not auto-center map */ }); }}>Search</button>
                    </div>

                    {pickupSuggestions.length > 0 && (
                      <div style={{ marginBottom: 8, background: '#fff', border: '1px solid #e6edf3', maxHeight: 180, overflow: 'auto', borderRadius: 6 }}>
                        <ul style={{ margin: 0, padding: 8, listStyle: 'none' }}>
                          {pickupSuggestions.map((s, i) => {
                            const q = (pickupQuery || '').trim();
                            const nameLc = s.name.toLowerCase();
                            const qLc = q.toLowerCase();
                            const idx = q ? nameLc.indexOf(qLc) : -1;
                            const before = idx > -1 ? s.name.slice(0, idx) : '';
                            const match = idx > -1 ? s.name.slice(idx, idx + q.length) : '';
                            const after = idx > -1 ? s.name.slice(idx + q.length) : s.name;
                            return (
                              <li
                                key={i}
                                onClick={() => {
                                  // select suggestion: update stored pickup coords and name, but do NOT change map center
                                  setPickup({ name: s.name, lat: s.lat, lng: s.lng });
                                  setPickupQuery(s.name);
                                  setPickupSuggestions([]);
                                }}
                                style={{ cursor: 'pointer', padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}
                              >
                                <div style={{ color: '#0f172a', fontSize: 14 }}>
                                  {idx > -1 ? (
                                    <>
                                      <span>{before}</span>
                                      <strong style={{ color: '#0b1220' }}>{match}</strong>
                                      <span style={{ color: '#6b7280' }}>{after}</span>
                                    </>
                                  ) : (
                                    <span>{s.name}</span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <p><strong>{pickup.name || '—'}</strong></p>
                    <p>Lat: {pickup.lat ?? '—'}</p>
                    <p>Lng: {pickup.lng ?? '—'}</p>
                    <div className="ride-map-toolbar">
                      <button type="button" onClick={() => useCurrentLocationFor('pickup')}>Use my location</button>
                      <button type="button" onClick={() => { if (pickup.lat && pickup.lng) { setPickupCenter({ lat: pickup.lat, lng: pickup.lng }); } }}>Use on map</button>
                    </div>
                  </div>
              </div>
              

              <div className="ride-field">
                <label>Destination</label>
                <div className="ride-location-card">
                  <h3>Destination</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      placeholder="Search destination"
                      value={dropQuery}
                      onChange={(e) => { setDropQuery(e.target.value); setDrop((d) => ({ ...d, name: '' })); }}
                      style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <button type="button" onClick={() => { geocodeQuery(dropQuery).then((res) => { setDropSuggestions(res); /* do not auto-center map */ }); }}>Search</button>
                  </div>

                  {dropSuggestions.length > 0 && (
                    <div style={{ marginBottom: 8, background: '#fff', border: '1px solid #e6edf3', maxHeight: 180, overflow: 'auto', borderRadius: 6 }}>
                      <ul style={{ margin: 0, padding: 8, listStyle: 'none' }}>
                        {dropSuggestions.map((s, i) => {
                          const q = (dropQuery || '').trim();
                          const nameLc = s.name.toLowerCase();
                          const qLc = q.toLowerCase();
                          const idx = q ? nameLc.indexOf(qLc) : -1;
                          const before = idx > -1 ? s.name.slice(0, idx) : '';
                          const match = idx > -1 ? s.name.slice(idx, idx + q.length) : '';
                          const after = idx > -1 ? s.name.slice(idx + q.length) : s.name;
                          return (
                            <li
                              key={i}
                              onClick={() => {
                                // select suggestion: update stored drop coords and name, but do NOT change map center
                                setDrop({ name: s.name, lat: s.lat, lng: s.lng });
                                setDropQuery(s.name);
                                setDropSuggestions([]);
                              }}
                              style={{ cursor: 'pointer', padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}
                            >
                              <div style={{ color: '#0f172a', fontSize: 14 }}>
                                {idx > -1 ? (
                                  <>
                                    <span>{before}</span>
                                    <strong style={{ color: '#0b1220' }}>{match}</strong>
                                    <span style={{ color: '#6b7280' }}>{after}</span>
                                  </>
                                ) : (
                                  <span>{s.name}</span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <p><strong>{drop.name || '—'}</strong></p>
                  <p>Lat: {drop.lat ?? '—'}</p>
                  <p>Lng: {drop.lng ?? '—'}</p>
                  <div className="ride-map-toolbar">
                    <button type="button" onClick={() => useCurrentLocationFor('drop')}>Use my location</button>
                    <button type="button" onClick={() => { if (drop.lat && drop.lng) { setDropCenter({ lat: drop.lat, lng: drop.lng }); } }}>Use on map</button>
                  </div>
                </div>
              </div>

              <div className="ride-field">
                <label>Distance</label>
                <div className="ride-readonly">{distanceKm ? `${distanceKm} km` : 'Choose pickup and destination'}</div>
              </div>

              <div className="ride-field">
                <label>Available rides</label>
                <div className="ride-availability">
                  {bikes.map((bike) => (
                    <label key={bike.vehicleId} className="ride-bike-tag">
                      <input type="checkbox" checked={selectedBikes.includes(bike.vehicleId)} onChange={() => toggleBikeSelection(bike.vehicleId)} />
                      {`${bike.vehicleType} — ${bike.driverName} (${bike.driverPhoneNumber})`}
                    </label>
                  ))}
                </div>
              </div>

              <div className="ride-action-row">
                <button
                  className="ride-btn primary"
                  type="button"
                  onClick={async () => {
                    // construct payload matching Java BookingRequest shape
                    const bookingPayload: any = {
                      user: {
                        name: user?.fullName ?? null,
                        email: user?.email ?? null,
                        mobile: user?.mobile ?? null,
                      },
                      driverVehicleId: selectedBikes && selectedBikes.length > 0 ? selectedBikes[0] : null,
                      rideType: type || null,
                      pickupAddress: pickup.name || pickupQuery || null,
                      pickupLatitude: typeof pickup.lat === 'number' ? pickup.lat : null,
                      pickupLongitude: typeof pickup.lng === 'number' ? pickup.lng : null,
                      dropAddress: drop.name || dropQuery || null,
                      dropLatitude: typeof drop.lat === 'number' ? drop.lat : null,
                      dropLongitude: typeof drop.lng === 'number' ? drop.lng : null,
                      distanceInKm: distanceKm ? parseFloat(distanceKm) : null,
                      estimatedFare: null,
                      scheduledAt: null,
                      startedAt: null,
                      completedAt: null,
                      status: null,
                    };

                    try {
                      // prefer the booking request endpoint
                      const res = await createBookingRequest(bookingPayload);
                      setBooked(true);
                      setConfirmationData({
                        pickup: bookingPayload.pickupAddress || 'Current location',
                        destination: bookingPayload.dropAddress || 'Destination',
                        distance: bookingPayload.distanceInKm ? `${bookingPayload.distanceInKm} km` : 'Pending',
                        vehicle: bookingPayload.driverVehicleId
                          ? (() => {
                              const bk = bikes.find((b) => b.vehicleId === bookingPayload.driverVehicleId);
                              return bk ? `${bk.vehicleType} (${bk.driverName})` : bookingPayload.driverVehicleId;
                            })()
                          : 'Any available ride',
                      });
                      setShowConfirmation(true);
                      // prefer assigning driver name from selected bike if available
                      if (bookingPayload.driverVehicleId) {
                        const bk = bikes.find((b) => b.vehicleId === bookingPayload.driverVehicleId);
                        setDriverAssigned(bk ? bk.driverName : (res && (res as any).driverAssigned ? (res as any).driverAssigned : null));
                      } else if (res && (res as any).driverAssigned) {
                        setDriverAssigned((res as any).driverAssigned);
                      }
                    } catch (err: any) {
                      console.error('Booking failed', err?.response || err);
                      alert('Booking failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
                    }
                  }}
                  disabled={booked}
                >
                  {booked ? 'Booked' : 'Confirm booking'}
                </button>

                <button
                  className="ride-btn secondary"
                  type="button"
                  onClick={() => {
                    setBooked(false);
                    setDriverAssigned(null);
                    setDriverResponse('');
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="ride-panel ride-map-box">
            <div className="ride-route-box">
              <strong>Route summary</strong>
              <div>{routeSummary}</div>
              <p>
                <a href={mapillaryLink} target="_blank" rel="noreferrer">Street-level view via Mapillary</a>
              </p>
            </div>

            <div style={{ width: '100%', height: 420, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <Map
                provider={mapProvider}
                center={pickupCenter || dropCenter || { lat: 25.5941, lng: 85.1376 }}
                onSelect={(lat, lng) => { handleMapSelect(lat, lng); }}
                height={420}
                routePoints={routeInfo?.coords}
              />
            </div>

            <div className="ride-status-box">
              <p><strong>Booked:</strong> {booked ? 'Yes' : 'No'}</p>
              <p><strong>Driver Assigned:</strong> {driverAssigned ?? '—'}</p>
                  {driverAssigned && (
                <>
                  <p><strong>Driver Response:</strong> {driverResponse || '—'}</p>
                  <p><strong>Selected Bikes:</strong> {selectedBikes.length ? selectedBikes.map((id) => {
                    const bk = bikes.find((b) => b.vehicleId === id);
                    return bk ? `${bk.vehicleType} (${bk.driverName})` : id;
                  }).join(', ') : '—'}</p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {showConfirmation && confirmationData && (
        <div className="ride-confirm-overlay">
          <div className="ride-confirm-modal">
            <h3>Ride booked</h3>
            <p>Your booking request has been confirmed successfully.</p>

            <div className="ride-confirm-details">
              <div><strong>Passenger:</strong> {customer || user?.fullName}</div>
              <div><strong>Pickup:</strong> {confirmationData.pickup}</div>
              <div><strong>Destination:</strong> {confirmationData.destination}</div>
              <div><strong>Distance:</strong> {confirmationData.distance}</div>
              <div><strong>Ride:</strong> {confirmationData.vehicle}</div>
            </div>

            <div className="ride-confirm-actions">
              <button className="ride-btn secondary" type="button" onClick={() => setShowConfirmation(false)}>
                Close
              </button>
              <button className="ride-btn primary" type="button" onClick={() => setShowConfirmation(false)}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {fullScreenOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, alignItems: 'center' }}>
            <div>
              <button onClick={() => { setFullScreenFor('pickup'); setFullScreenCenter(pickupCenter); }} style={{ marginRight: 8, background: fullScreenFor === 'pickup' ? '#ddd' : undefined }}>Pickup</button>
              <button onClick={() => { setFullScreenFor('drop'); setFullScreenCenter(dropCenter); }} style={{ background: fullScreenFor === 'drop' ? '#ddd' : undefined }}>Destination</button>
            </div>
            <div>
              <button onClick={() => setFullScreenOpen(false)} style={{ fontSize: 18 }}>Close ✕</button>
            </div>
          </div>
          
          <div style={{ flex: 1, padding: 12 }}>
            <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 6, overflow: 'hidden' }}>
              <Map
                provider={mapProvider}
                center={fullScreenCenter}
                onSelect={(lat, lng) => { handleMapSelect(lat, lng); }}
                height={window.innerHeight - 96}
                routePoints={routeInfo?.coords}
              />
            </div>
          </div>
          <div style={{ padding: 12, background: '#fff', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <strong>Active:</strong> {fullScreenFor}
            </div>
            <button onClick={() => {
              if (fullScreenFor === 'pickup') {
                const nameToSave = fullScreenChosenName || fullScreenQuery || pickup.name;
                setPickup((p) => ({ ...p, name: nameToSave, lat: (fullScreenCenter && fullScreenCenter.lat) ?? p.lat, lng: (fullScreenCenter && fullScreenCenter.lng) ?? p.lng }));
                setPickupCenter(fullScreenCenter ?? pickupCenter);
              } else if (fullScreenFor === 'drop') {
                const nameToSave = fullScreenChosenName || fullScreenQuery || drop.name;
                setDrop((d) => ({ ...d, name: nameToSave, lat: (fullScreenCenter && fullScreenCenter.lat) ?? d.lat, lng: (fullScreenCenter && fullScreenCenter.lng) ?? d.lng }));
                setDropCenter(fullScreenCenter ?? dropCenter);
              }
              setFullScreenSuggestions([]);
              setFullScreenOpen(false);
            }}>Done</button>
          </div>
        </div>
      )}
    </main>
  );
}
