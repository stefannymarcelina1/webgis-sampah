/* eslint-disable react-refresh/only-export-components */
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

// Import untuk Search Control (Geocoder)
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";

// Fix icon default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom marker untuk hasil pencarian (opsional)
const searchMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Fungsi parse location yang aman (hanya mengembalikan objek dengan lat/lng number yang valid)
export const parseLocation = (loc) => {
  if (!loc) return null;
  
  // Handle objek dengan properti coordinates
  if (typeof loc === "object" && loc.coordinates && Array.isArray(loc.coordinates)) {
    const lng = loc.coordinates[0];
    const lat = loc.coordinates[1];
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // Handle objek dengan properti lat/lng langsung
  if (typeof loc === "object" && loc.lat !== undefined && loc.lng !== undefined) {
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // Handle string format POINT(lng lat)
  if (typeof loc === "string") {
    const match = loc.match(/POINT\(([-\d.]+) ([-\d.]+)\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  
  return null;
};

// Komponen untuk menangani event klik peta dan center view (dengan validasi)
function MapEvents({ setLatLng, center }) {
  const map = useMapEvents({
    click: (e) => {
      if (setLatLng) setLatLng(e.latlng);
    },
  });
  useEffect(() => {
    // Hanya set view jika center valid dan map tersedia
    if (center && map && typeof center.lat === "number" && typeof center.lng === "number" && !isNaN(center.lat) && !isNaN(center.lng)) {
      map.setView([center.lat, center.lng], 13);
    }
  }, [center, map]);
  return null;
}

// Komponen untuk menambahkan kontrol pencarian lokasi (Geocoder) dengan fallback
function SearchControl() {
  const map = useMap();
  const [geocoderError, setGeocoderError] = useState(false);

  useEffect(() => {
    let geocoder;
    try {
      const geocoderOptions = {
        defaultMarkGeocode: true,
        position: "topright",
        placeholder: "Cari lokasi (kota, jalan, tempat)...",
        errorMessage: "Lokasi tidak ditemukan atau CORS error",
        suggestMinLength: 3,
        limit: 8,
      };

      // Gunakan proxy lokal jika di development
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        geocoderOptions.url = "/nominatim/search?format=json&q={s}";
      } else {
        // Untuk production, gunakan Nominatim dengan parameter yang sesuai
        geocoderOptions.serviceUrl = "https://nominatim.openstreetmap.org/search";
        geocoderOptions.geocoder = L.Control.Geocoder.nominatim({
          serviceUrl: "https://nominatim.openstreetmap.org/search",
          geocodingQueryParams: {
            "accept-language": "id",
            countrycodes: "id",
          },
          headers: {
            "User-Agent": "WebGIS-Sampah-App/1.0",
          },
        });
      }

      geocoder = L.Control.geocoder(geocoderOptions).addTo(map);

      geocoder.on("error", (err) => {
        console.warn("Geocoder error:", err);
        setGeocoderError(true);
        const container = document.querySelector(".leaflet-control-geocoder-form");
        if (container) {
          const errorMsg = document.createElement("div");
          errorMsg.textContent = "CORS error: Gunakan proxy atau API key";
          errorMsg.style.color = "red";
          errorMsg.style.fontSize = "12px";
          errorMsg.style.padding = "2px 5px";
          container.appendChild(errorMsg);
          setTimeout(() => errorMsg.remove(), 3000);
        }
      });
    } catch (err) {
      console.error("Failed to initialize geocoder:", err);
      setGeocoderError(true);
    }

    return () => {
      if (geocoder && map) map.removeControl(geocoder);
    };
  }, [map]);

  return null;
}

// Komponen peta utama dengan validasi center yang aman
export default function Map({ data = [], setLatLng, selectedMarker, height = "350px" }) {
  // Tentukan center yang valid: prioritaskan selectedMarker, lalu defaultCenter
  let validCenter = { lat: -7.7956, lng: 110.3695 };
  
  if (selectedMarker && typeof selectedMarker.lat === "number" && typeof selectedMarker.lng === "number" && !isNaN(selectedMarker.lat) && !isNaN(selectedMarker.lng)) {
    validCenter = { lat: selectedMarker.lat, lng: selectedMarker.lng };
  }
  
  // Filter data marker yang memiliki lokasi valid
  const validMarkers = data.filter(item => {
    const pos = parseLocation(item.location);
    return pos && typeof pos.lat === "number" && typeof pos.lng === "number" && !isNaN(pos.lat) && !isNaN(pos.lng);
  });

  return (
    <MapContainer center={[validCenter.lat, validCenter.lng]} zoom={13} style={{ height, borderRadius: 8 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Fitur Search Lokasi */}
      <SearchControl />
      
      <MapEvents setLatLng={setLatLng} center={selectedMarker} />
      
      {/* Marker dari data yang valid */}
      {validMarkers.map((item, i) => {
        const pos = parseLocation(item.location);
        if (!pos) return null;
        return (
          <Marker key={i} position={[pos.lat, pos.lng]}>
            <Popup>
              <b>{item.name || item.nama}</b><br />
              {item.alamat}<br />
              Status Pembayaran: {item.payment_status || "Belum Bayar"}
            </Popup>
          </Marker>
        );
      })}
      
      {/* Marker untuk lokasi yang dipilih user (jika valid) */}
      {selectedMarker && 
       typeof selectedMarker.lat === "number" && 
       typeof selectedMarker.lng === "number" && 
       !isNaN(selectedMarker.lat) && 
       !isNaN(selectedMarker.lng) && (
        <Marker position={[selectedMarker.lat, selectedMarker.lng]}>
          <Popup>Lokasi dipilih</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}