import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Map from "../components/Map";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f0f0ed",
    fontFamily: "'DM Sans', sans-serif",
    padding: "24px",
  },
  card: {
    maxWidth: 1280,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 28px",
    borderBottom: "1px solid #eaeaea",
    background: "#fff",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 500,
    color: "#0d1f2d",
    margin: 0,
  },
  logoutBtn: {
    background: "#0F6E56",
    border: "none",
    padding: "8px 18px",
    borderRadius: 40,
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  tabContainer: {
    display: "flex",
    gap: 2,
    background: "#f9f9f7",
    padding: "0 28px",
    borderBottom: "1px solid #eee",
  },
  tab: (active) => ({
    padding: "12px 20px",
    background: active ? "#fff" : "transparent",
    border: "none",
    borderBottom: active ? "2px solid #1D9E75" : "2px solid transparent",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? "#1D9E75" : "#666",
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  content: {
    padding: "28px",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0d1f2d",
    marginBottom: 16,
    fontFamily: "'DM Sans', sans-serif",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#888",
    marginBottom: 6,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    background: "#fafaf8",
    transition: "all 0.2s",
    outline: "none",
  },
  button: (bg = "#0F6E56") => ({
    background: bg,
    border: "none",
    padding: "10px 20px",
    borderRadius: 30,
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
    marginRight: 10,
    marginTop: 8,
  }),
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 12,
  },
  th: {
    textAlign: "left",
    padding: "12px 8px",
    borderBottom: "1px solid #eee",
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: 13,
    color: "#333",
  },
};

export default function WargaDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lokasi, setLokasi] = useState(null);
  const [jenisSampah, setJenisSampah] = useState("");
  const [berat, setBerat] = useState("");
  const [sampahList, setSampahList] = useState([]);
  const [pembayaran, setPembayaran] = useState(null);
  const [activeTab, setActiveTab] = useState("form");

  useEffect(() => {
    fetchUserAndProfile();
  }, []);

  async function fetchUserAndProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data, error } = await supabase
        .from("warga")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error(error);
      if (data) {
        setProfile(data);
        if (data.location) setLokasi(data.location);
        fetchSampah(data.id);
        fetchPembayaran(data.id);
      } else {
        alert("Profil belum lengkap. Silakan hubungi admin.");
      }
    }
  }

  async function fetchSampah(wargaId) {
    if (!wargaId) return;
    const { data } = await supabase.from("sampah").select("*").eq("warga_id", wargaId);
    setSampahList(data || []);
  }

  async function fetchPembayaran(wargaId) {
    if (!wargaId) return;
    const { data } = await supabase
      .from("pembayaran")
      .select("*")
      .eq("warga_id", wargaId)
      .maybeSingle();
    setPembayaran(data);
  }

  async function simpanLokasi() {
    if (!lokasi) return alert("Klik peta untuk menentukan lokasi!");
    if (!profile) return;
    await supabase
      .from("warga")
      .update({ location: `POINT(${lokasi.lng} ${lokasi.lat})` })
      .eq("id", profile.id);
    alert("Lokasi tersimpan");
    fetchUserAndProfile();
  }

  async function requestPengangkutan() {
    if (!jenisSampah || !berat) return alert("Isi jenis dan berat sampah");
    if (!profile) return;
    await supabase.from("sampah").insert({
      warga_id: profile.id,
      jenis: jenisSampah,
      berat: parseFloat(berat),
      status_pengangkutan: "Menunggu",
    });
    alert("Request dikirim");
    fetchSampah(profile.id);
    setJenisSampah("");
    setBerat("");
  }

  async function bayarIuran() {
    if (!profile) return;
    await supabase.from("pembayaran").insert({
      warga_id: profile.id,
      jumlah: 50000,
      status_verifikasi: "Pending",
    });
    alert("Pembayaran diajukan, menunggu verifikasi admin");
    fetchPembayaran(profile.id);
  }

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!profile) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>🗑️ Dashboard Warga</h1>
            <button style={styles.logoutBtn} onClick={logout}>Keluar</button>
          </div>
          <div style={styles.content}>
            <p>Memuat data profil... Pastikan Anda sudah terdaftar sebagai warga.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🗑️ Dashboard Warga</h1>
          <button style={styles.logoutBtn} onClick={logout}>Keluar</button>
        </div>

        <div style={styles.tabContainer}>
          {["form", "riwayat", "peta"].map((tab) => (
            <button key={tab} style={styles.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab === "form" && "📋 Form Sampah"}
              {tab === "riwayat" && "📜 Riwayat"}
              {tab === "peta" && "🗺️ Peta Saya"}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          <div style={{ display: activeTab === "form" ? "block" : "none" }}>
            <h3 style={styles.sectionTitle}>📍 Lokasi Rumah</h3>
            <Map setLatLng={setLokasi} selectedMarker={lokasi} height="280px" />
            <button style={styles.button()} onClick={simpanLokasi}>Simpan Lokasi</button>

            <h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>🗑️ Request Pengangkutan</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Jenis Sampah</label>
              <input style={styles.input} value={jenisSampah} onChange={(e) => setJenisSampah(e.target.value)} placeholder="Contoh: Plastik, Organik" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Berat (kg)</label>
              <input style={styles.input} type="number" value={berat} onChange={(e) => setBerat(e.target.value)} />
            </div>
            <button style={styles.button()} onClick={requestPengangkutan}>Kirim Request</button>

            <h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>💰 Pembayaran Iuran</h3>
            {pembayaran ? (
              <p>Status: <strong>{pembayaran.status_verifikasi}</strong></p>
            ) : (
              <button style={styles.button("#1D9E75")} onClick={bayarIuran}>Bayar Iuran Rp50.000</button>
            )}
          </div>

          <div style={{ display: activeTab === "riwayat" ? "block" : "none" }}>
            <h3 style={styles.sectionTitle}>Riwayat Pengangkutan</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Jenis</th>
                  <th style={styles.th}>Berat</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sampahList.map(s => (
                  <tr key={s.id}>
                    <td style={styles.td}>{s.jenis}</td>
                    <td style={styles.td}>{s.berat} kg</td>
                    <td style={styles.td}>{s.status_pengangkutan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: activeTab === "peta" ? "block" : "none" }}>
            <Map data={[{ location: profile.location, name: profile.nama, alamat: profile.alamat, payment_status: pembayaran?.status_verifikasi }]} height="400px" />
          </div>
        </div>
      </div>
    </div>
  );
}