import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Coffee, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '#/components/ui/button';

export interface IDeliveryLocation {
    lat: number;
    lng: number;
    distanceKm: number;
    address?: string;
}

interface DeliveryMapPinPickerProps {
    storeLat: number;
    storeLng: number;
    storeName?: string;
    storeAddress?: string;
    initialLat?: number | null;
    initialLng?: number | null;
    distanceKm: number | null;
    maxDistanceKm: number;
    onLocationSelect: (location: IDeliveryLocation) => void;
    disabled?: boolean;
}

// Fallback Haversine distance with 1.3 urban road detour factor
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLineKm = R * c;
    return Math.round(straightLineKm * 1.3 * 10) / 10;
}

export default function DeliveryMapPinPicker({
    storeLat,
    storeLng,
    storeName = 'Basta Kape',
    storeAddress = '50 K-1st, Quezon City',
    initialLat,
    initialLng,
    distanceKm,
    maxDistanceKm,
    onLocationSelect,
    disabled = false
}: DeliveryMapPinPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const customerMarkerRef = useRef<L.Marker | null>(null);
    const routePolylineRef = useRef<L.Polyline | null>(null);

    const [isCalculating, setIsCalculating] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [currentPin, setCurrentPin] = useState<{ lat: number; lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );

    // Create custom SVG markers for store and delivery pin
    const storeIcon = L.divIcon({
        className: 'custom-store-pin',
        html: `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 38px;
                height: 38px;
                background-color: #78350f;
                color: white;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>
                </svg>
            </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20]
    });

    const customerIcon = L.divIcon({
        className: 'custom-customer-pin',
        html: `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 42px;
                height: 42px;
                background-color: #2563eb;
                color: white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 6px 14px rgba(37,99,235,0.4);
            ">
                <div style="transform: rotate(45deg);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="10" r="3"/>
                        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                    </svg>
                </div>
            </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42]
    });

    // Calculate road distance via OSRM public API with fallback
    const resolveLocationDetails = useCallback(
        async (lat: number, lng: number) => {
            setIsCalculating(true);
            let roadDistanceKm = 0;
            let suggestedAddress: string | undefined;

            try {
                // Fetch driving distance from OSRM
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${lng},${lat}?overview=full&geometries=geojson`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                const response = await fetch(osrmUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data.routes && data.routes.length > 0) {
                        const meters = data.routes[0].distance;
                        roadDistanceKm = Math.round((meters / 1000) * 10) / 10;

                        // Draw road geometry if available
                        if (data.routes[0].geometry && data.routes[0].geometry.coordinates && mapInstanceRef.current) {
                            const coords: [number, number][] = data.routes[0].geometry.coordinates.map(([pLon, pLat]: [number, number]) => [
                                pLat,
                                pLon
                            ]);
                            if (routePolylineRef.current) {
                                routePolylineRef.current.setLatLngs(coords);
                            } else {
                                routePolylineRef.current = L.polyline(coords, {
                                    color: '#2563eb',
                                    weight: 4,
                                    opacity: 0.7,
                                    dashArray: '6, 8'
                                }).addTo(mapInstanceRef.current);
                            }
                        }
                    }
                }
            } catch {
                // Fallback to Haversine if offline or OSRM fails
                roadDistanceKm = calculateHaversineDistanceKm(storeLat, storeLng, lat, lng);
            }

            if (!roadDistanceKm) {
                roadDistanceKm = calculateHaversineDistanceKm(storeLat, storeLng, lat, lng);
            }

            // Fetch suggested address via Nominatim
            try {
                const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
                const addressRes = await fetch(nominatimUrl);
                if (addressRes.ok) {
                    const addrData = await addressRes.json();
                    if (addrData.display_name) {
                        suggestedAddress = addrData.display_name;
                    }
                }
            } catch {
                // Ignore address fetch errors
            }

            setIsCalculating(false);
            onLocationSelect({
                lat,
                lng,
                distanceKm: roadDistanceKm,
                address: suggestedAddress
            });
        },
        [storeLat, storeLng, onLocationSelect]
    );

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const defaultCenter: [number, number] = [initialLat || storeLat || 14.6288, initialLng || storeLng || 121.0422];

        const map = L.map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: 14,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Add Store Marker
        const storeMarker = L.marker([storeLat, storeLng], {
            icon: storeIcon,
            interactive: true
        }).addTo(map);

        storeMarker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; padding: 2px;">
                <b style="color: #78350f;">☕ ${storeName}</b><br/>
                <span style="color: #6b7280;">${storeAddress}</span>
            </div>
        `);

        // If initial coords exist, place customer marker
        if (initialLat && initialLng) {
            const custMarker = L.marker([initialLat, initialLng], {
                icon: customerIcon,
                draggable: !disabled
            }).addTo(map);

            custMarker.on('dragend', () => {
                const pos = custMarker.getLatLng();
                setCurrentPin({ lat: pos.lat, lng: pos.lng });
                resolveLocationDetails(pos.lat, pos.lng);
            });

            customerMarkerRef.current = custMarker;
        }

        // Map Click Listener to set pin
        map.on('click', (e: L.LeafletMouseEvent) => {
            if (disabled) return;
            const { lat, lng } = e.latlng;
            setCurrentPin({ lat, lng });

            if (customerMarkerRef.current) {
                customerMarkerRef.current.setLatLng([lat, lng]);
            } else {
                const newMarker = L.marker([lat, lng], {
                    icon: customerIcon,
                    draggable: !disabled
                }).addTo(map);

                newMarker.on('dragend', () => {
                    const pos = newMarker.getLatLng();
                    setCurrentPin({ lat: pos.lat, lng: pos.lng });
                    resolveLocationDetails(pos.lat, pos.lng);
                });

                customerMarkerRef.current = newMarker;
            }

            resolveLocationDetails(lat, lng);
        });

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [storeLat, storeLng, storeName, storeAddress, initialLat, initialLng, disabled, resolveLocationDetails]);

    // Use current GPS Location
    const handleUseCurrentLocation = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setIsLocating(false);
                setCurrentPin({ lat: latitude, lng: longitude });

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 15);

                    if (customerMarkerRef.current) {
                        customerMarkerRef.current.setLatLng([latitude, longitude]);
                    } else {
                        const newMarker = L.marker([latitude, longitude], {
                            icon: customerIcon,
                            draggable: !disabled
                        }).addTo(mapInstanceRef.current);

                        newMarker.on('dragend', () => {
                            const pos = newMarker.getLatLng();
                            setCurrentPin({ lat: pos.lat, lng: pos.lng });
                            resolveLocationDetails(pos.lat, pos.lng);
                        });

                        customerMarkerRef.current = newMarker;
                    }
                }

                resolveLocationDetails(latitude, longitude);
            },
            () => {
                setIsLocating(false);
                alert('Unable to retrieve your location. Please drop a pin on the map.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const isOutOfScope = distanceKm !== null && distanceKm > maxDistanceKm;

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                    <label className="font-bold text-foreground/90 block text-xs flex items-center gap-1.5">
                        <MapPin className="size-4 text-primary" />
                        Pin Delivery Destination on Map <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">Click on the map or drag the blue pin to pinpoint your drop-off location.</p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLocating || disabled}
                    onClick={handleUseCurrentLocation}
                    className="h-8 text-xs font-semibold rounded-lg gap-1.5 self-start sm:self-auto border-border/80 hover:border-primary shrink-0"
                >
                    {isLocating ? (
                        <>
                            <Loader2 className="size-3.5 animate-spin text-primary" />
                            Locating...
                        </>
                    ) : (
                        <>
                            <Navigation className="size-3.5 text-primary" />
                            Use My Current Location
                        </>
                    )}
                </Button>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-inner bg-muted/40 h-[260px] sm:h-[300px]">
                <div ref={mapContainerRef} className="size-full z-0" />

                {/* Calculating spinner overlay */}
                {isCalculating && (
                    <div className="absolute top-3 right-3 z-1000 bg-background/90 backdrop-blur-xs border border-border/60 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-foreground shadow-xs animate-in fade-in">
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        Calculating road distance...
                    </div>
                )}

                {/* Map Legend */}
                <div className="absolute bottom-3 left-3 z-1000 bg-background/90 backdrop-blur-xs border border-border/60 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80 shadow-xs flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Coffee className="size-3.5 text-amber-800" />
                        {storeName} (Store)
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-full bg-blue-600 inline-block" />
                        Your Delivery Pin
                    </span>
                </div>
            </div>

            {/* Distance & Validation Status Bar */}
            {currentPin && distanceKm !== null ? (
                <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                        isOutOfScope
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    }`}
                >
                    {isOutOfScope ? (
                        <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                    ) : (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between font-bold">
                            <span>{isOutOfScope ? 'Selected location is out of scope for delivery' : 'Delivery Route Calculated'}</span>
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-background/60 border border-current">
                                {distanceKm.toFixed(1)} km away
                            </span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">
                            {isOutOfScope
                                ? `Selected address is ${distanceKm.toFixed(1)} km away. Delivery is currently limited to a maximum of ${maxDistanceKm.toFixed(1)} km from ${storeName}.`
                                : `Driving distance from our kitchen is approximately ${distanceKm.toFixed(1)} km. Your shipping fee has been automatically applied.`}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-2.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground/60 shrink-0" />
                    <span>Please drop a pin on the map to calculate your exact delivery distance and shipping fee.</span>
                </div>
            )}
        </div>
    );
}
