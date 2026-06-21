/* eslint-disable react-refresh/only-export-components */
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";

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

// Komponen Search Lokasi Custom (tanpa leaflet-control-geocoder agar tidak ada bug URL)
function SearchControl() {
  const map = useMap();
  const controlRef = useRef(null);

  useEffect(() => {
    // Buat custom Leaflet control
    const SearchBox = L.Control.extend({
      onAdd() {
        const wrapper = L.DomUtil.create("div", "custom-geocoder-wrap");

        // Style wrapper
        wrapper.style.cssText = `
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          min-width: 260px;
          font-family: sans-serif;
        `;

        // Input
        const input = L.DomUtil.create("input", "", wrapper);
        input.type = "text";
        input.placeholder = "Cari lokasi...";
        input.style.cssText = `
          border: none;
          outline: none;
          font-size: 13px;
          width: 100%;
          padding: 2px 0;
          color: #333;
          background: transparent;
        `;

        // Dropdown hasil
        const dropdown = L.DomUtil.create("div", "", wrapper);
        dropdown.style.cssText = `
          display: none;
          flex-direction: column;
          margin-top: 6px;
          border-top: 1px solid #eee;
          padding-top: 4px;
          max-height: 200px;
          overflow-y: auto;
        `;

        // Cegah klik pada control propagasi ke peta
        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.disableScrollPropagation(wrapper);

        let debounceTimer = null;

        input.addEventListener("input", () => {
          const q = input.value.trim();
          dropdown.innerHTML = "";
          dropdown.style.display = "none";

          if (q.length < 3) return;

          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            try {
              const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&accept-language=id&countrycodes=id`;
              const res = await fetch(url, {
                headers: { "Accept-Language": "id" },
              });
              const data = await res.json();

              dropdown.innerHTML = "";

              if (!Array.isArray(data) || data.length === 0) {
                const noResult = L.DomUtil.create("div", "", dropdown);
                noResult.textContent = "Lokasi tidak ditemukan";
                noResult.style.cssText = "padding: 4px 0; font-size: 12px; color: #999;";
                dropdown.style.display = "flex";
                return;
              }

              data.forEach((item) => {
                const row = L.DomUtil.create("div", "", dropdown);
                row.textContent = item.display_name;
                row.style.cssText = `
                  padding: 5px 2px;
                  font-size: 12px;
                  color: #333;
                  cursor: pointer;
                  border-bottom: 1px solid #f0f0f0;
                  line-height: 1.4;
                `;
                row.addEventListener("mouseenter", () => (row.style.background = "#f5f5f5"));
                row.addEventListener("mouseleave", () => (row.style.background = "transparent"));
                row.addEventListener("click", () => {
                  const lat = parseFloat(item.lat);
                  const lng = parseFloat(item.lon);
                  map.setView([lat, lng], 15);
                  L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(item.display_name)
                    .openPopup();
                  input.value = item.display_name;
                  dropdown.style.display = "none";
                });
                dropdown.style.display = "flex";
              });
            } catch (err) {
              console.warn("Geocoder error:", err);
            }
          }, 400);
        });

        // Tutup dropdown kalau klik di luar
        document.addEventListener("click", (e) => {
          if (!wrapper.contains(e.target)) {
            dropdown.style.display = "none";
          }
        });

        return wrapper;
      },
      onRemove() {},
    });

    const control = new SearchBox({ position: "topright" });
    control.addTo(map);
    controlRef.current = control;

    return () => {
      if (controlRef.current) map.removeControl(controlRef.current);
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