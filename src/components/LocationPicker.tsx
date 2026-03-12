import { useEffect, useRef, useCallback, useState } from 'react';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ─── Types ───────────────────────────────────────────────
export interface LocationData {
  latitude: number;
  longitude: number;
  flatNumber: string;
  address_line1: string;
  address_line2: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  display_name: string;
}

interface LocationPickerMapProps {
  /** Called every time the pin position changes (drag, click, GPS) */
  onLocationChange: (data: LocationData) => void;
  /** If true, auto-detect GPS on mount */
  autoDetectGPS?: boolean;
  /** Initial latitude to center the map (e.g. from a saved address) */
  initialLatitude?: number | null;
  /** Initial longitude to center the map (e.g. from a saved address) */
  initialLongitude?: number | null;
}

// ─── Custom pulsing green marker ─────────────────────────
const createPulsingIcon = () =>
  L.divIcon({
    className: 'leaflet-pulsing-marker',
    html: `
      <div style="position:relative;width:36px;height:44px;">
        <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(34,197,94,0.2);animation:lpulse 1.5s cubic-bezier(0.215,0.61,0.355,1) infinite"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
        <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #16a34a;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2))"></div>
      </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });

// ─── Nominatim Reverse Geocoding ─────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<LocationData | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
  console.log('[PIN] Reverse geocoding:', url);
  console.log('[PIN] Coordinates sent → lat:', lat, 'lng:', lng);

  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'PandiyinNatureInPack/1.0' },
    });
    if (!res.ok) {
      console.error('[PIN] Nominatim HTTP error:', res.status);
      return null;
    }

    const data = await res.json();

    // Log the FULL raw API response first for debugging
    console.log('[PIN] ── Raw Nominatim Response ──');
    console.log('[PIN] Full response:', JSON.stringify(data, null, 2));

    if (!data || data.error) {
      console.error('[PIN] Nominatim returned error:', data?.error);
      return null;
    }

    const addr = data.address || {};

    // ── Parse address fields from Nominatim data.address ──
    // Flat / House Number
    const flatNumber = addr.house_number || '';

    // Address Line 1 = road (street name)
    const address_line1 = addr.road || addr.pedestrian || addr.footway || '';

    // Address Line 2 = suburb (locality / neighbourhood area)
    const address_line2 = addr.suburb || addr.neighbourhood || '';

    // Area: village > hamlet > neighbourhood
    const area = addr.village || addr.hamlet || addr.neighbourhood || addr.suburb || '';

    // City = city OR town OR village
    const city = addr.city || addr.town || addr.village || '';

    // District: state_district is the standard for India
    const district = addr.state_district || addr.county || '';

    // State, pincode (postcode), country
    const state = addr.state || '';
    const pincode = addr.postcode || '';
    const country = addr.country || '';

    console.log('[PIN] ── Parsed Result ──');
    console.log('[PIN] flatNumber (house_number):', flatNumber);
    console.log('[PIN] address_line1 (road):', address_line1);
    console.log('[PIN] address_line2 (suburb):', address_line2);
    console.log('[PIN] area:', area);
    console.log('[PIN] city:', city);
    console.log('[PIN] district:', district);
    console.log('[PIN] state:', state);
    console.log('[PIN] pincode (postcode):', pincode);
    console.log('[PIN] country:', country);
    console.log('[PIN] display_name:', data.display_name);

    return {
      latitude: lat,
      longitude: lng,
      flatNumber,
      address_line1,
      address_line2,
      area,
      city,
      district,
      state,
      pincode,
      country,
      display_name: data.display_name || '',
    };
  } catch (err) {
    console.error('[PIN] Reverse geocoding fetch error:', err);
    return null;
  }
}

// ─── Component ───────────────────────────────────────────
export default function LocationPickerMap({
  onLocationChange,
  autoDetectGPS = false,
  initialLatitude,
  initialLongitude,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // ── Place or move marker and reverse-geocode ──
  const placeMarkerAndGeocode = useCallback(
    async (lat: number, lng: number) => {
      console.log('[PIN] ── Pin Placed ──');
      console.log('[PIN] latitude:', lat);
      console.log('[PIN] longitude:', lng);

      // Move marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      // Fly map to location
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 18, { duration: 0.8 });
      }

      // Reverse geocode
      setGeocoding(true);
      const result = await reverseGeocode(lat, lng);
      if (result) {
        onLocationChange(result);
      }
      setGeocoding(false);
    },
    [onLocationChange]
  );

  // ── GPS Detection ──
  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('[PIN] Geolocation API not available');
      setGpsStatus(null);
      return;
    }

    setGpsStatus('Detecting GPS...');
    console.log('[PIN] Requesting GPS permission...');
    console.log('[PIN] Protocol:', window.location.protocol, 'Host:', window.location.host);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('[PIN] ── GPS Success ──');
        console.log('[PIN] latitude:', latitude);
        console.log('[PIN] longitude:', longitude);
        console.log('[PIN] accuracy:', accuracy, 'meters');
        setGpsStatus(null);
        placeMarkerAndGeocode(latitude, longitude);
      },
      (error) => {
        console.error('[PIN] GPS Error - Code:', error.code, 'Message:', error.message);
        setGpsStatus(null);
        // Don't toast here — the map is still usable, user can drag
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [placeMarkerAndGeocode]);

  // ── Initialize map ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use saved coords if available, otherwise default to Madurai
    const startLat = (initialLatitude && initialLongitude) ? initialLatitude : 9.9252;
    const startLng = (initialLatitude && initialLongitude) ? initialLongitude : 78.1198;
    const startZoom = (initialLatitude && initialLongitude) ? 17 : 14;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: startZoom,
      zoomControl: false,
      attributionControl: false,
      tap: false, // Fix issues with tap/click on mobile inside modals
    } as L.MapOptions & { tap?: boolean });

    L.control.attribution({ position: 'bottomleft' }).addTo(map);
    
    // Only show zoom control if not on a very small screen
    if (window.innerWidth > 640) {
      L.control.zoom({ position: 'topright' }).addTo(map);
    }

    // OpenStreetMap standard tiles
    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    // Draggable marker
    const marker = L.marker([startLat, startLng], {
      draggable: true,
      icon: createPulsingIcon(),
      autoPan: true,
    }).addTo(map);

    // On drag end → reverse geocode at new position
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      console.log('[PIN] ── Marker Dragged ──');
      placeMarkerAndGeocode(pos.lat, pos.lng);
    });

    // Click on map → move marker there
    map.on('click', (e: L.LeafletMouseEvent) => {
      console.log('[PIN] ── Map Clicked ──');
      marker.setLatLng(e.latlng);
      placeMarkerAndGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Fix map rendering issues inside modals/dialogs
    // Use ResizeObserver to automatically resize map when container dimension changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        map.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Force resize after modal animation frames at multiple intervals
    // Mobile modals can take longer to finish CSS transitions
    const timeouts = [100, 250, 500, 800].map((ms) =>
      setTimeout(() => {
        if (mapRef.current) map.invalidateSize();
      }, ms)
    );

    // If we have saved coordinates, reverse-geocode them on load
    if (initialLatitude && initialLongitude) {
      placeMarkerAndGeocode(startLat, startLng);
    } else if (autoDetectGPS) {
      // Only auto-detect GPS if explicitly enabled
      detectGPS();
    }

    return () => {
      timeouts.forEach(clearTimeout);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      {/* Re-detect GPS button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={detectGPS}
        disabled={!!gpsStatus}
        className="w-full gap-2 text-sm border-primary/30 hover:bg-primary/5"
      >
        {gpsStatus ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {gpsStatus}
          </>
        ) : (
          <>
            <LocateFixed className="h-4 w-4 text-primary" />
             Use Current Location
          </>
        )}
      </Button>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-border/60 shadow-sm transition-all duration-300">
        <div
          ref={mapContainerRef}
          className="w-full h-[250px] md:h-[300px] touch-none"
          style={{ background: '#f0f4f3', zIndex: 0 }}
        />

        {/* Geocoding spinner overlay */}
        {geocoding && (
          <div
            className="absolute inset-0 bg-background/30 backdrop-blur-[1px] flex items-center justify-center"
            style={{ zIndex: 500 }}
          >
            <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-green-600" />
              <span className="text-muted-foreground">Finding address…</span>
            </div>
          </div>
        )}

        {/* Drag hint */}
        <div
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-background/85 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm flex items-center gap-1 text-[10px] text-muted-foreground"
          style={{ zIndex: 400 }}
        >
          <MapPin className="h-2.5 w-2.5" />
          Drag pin or tap map to set delivery point
        </div>
      </div>

      {/* Leaflet fixes: Tailwind preflight + z-index inside dialog */}
      <style>{`
        @keyframes lpulse {
          0% { transform: scale(0.5); opacity: 1; }
          80%, 100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-pulsing-marker { background: transparent !important; border: none !important; }

        /* Fix: Tailwind preflight sets img { display: block; max-width: 100%; height: auto; }
           which crushes Leaflet tile dimensions to 0 on mobile. Override explicitly: */
        .leaflet-container img,
        .leaflet-tile-pane img,
        .leaflet-tile {
          max-width: none !important;
          max-height: none !important;
        }

        /* z-index layering inside modal dialog */
        .leaflet-container { z-index: 0; }
        .leaflet-pane { z-index: 1 !important; }
        .leaflet-tile-pane { z-index: 200 !important; }
        .leaflet-overlay-pane { z-index: 400 !important; }
        .leaflet-marker-pane { z-index: 600 !important; }
        .leaflet-top, .leaflet-bottom { z-index: 1000 !important; }
        .leaflet-control { z-index: 1000 !important; }
      `}</style>
    </div>
  );
}
