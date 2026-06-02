import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Map from "../components/Map";

const styles = {
  page: { minHeight: "100vh", background: "#f0f0ed", fontFamily: "'DM Sans', sans-serif", padding: 24 },
  card: { maxWidth: 1280, margin: "0 auto", background: "#fff", borderRadius: 24, boxShadow: "0 12px 32px rgba(0,0,0,0.08)", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #eaeaea" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 500, color: "#0d1f2d", margin: 0 },
  logoutBtn: { background: "#0F6E56", border: "none", padding: "8px 18px", borderRadius: 40, color: "#fff", cursor: "pointer" },
  content: { padding: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: "#0d1f2d", marginBottom: 16 },
  grid: { display: "flex", gap: 32, flexWrap: "wrap" },
  cardPanel: { flex: 1, minWidth: 280, background: "#fefefe", borderRadius: 20, border: "1px solid #eee", padding: 16 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 8 },
  th: { textAlign: "left", padding: "10px 6px", borderBottom: "1px solid #eee", fontSize: 13, fontWeight: 600 },
  td: { padding: "8px 6px", borderBottom: "1px solid #f0f0f0", fontSize: 13 },
  btn: (bg = "#0F6E56") => ({ background: bg, border: "none", padding: "4px 12px", borderRadius: 16, color: "#fff", fontSize: 12, cursor: "pointer", marginRight: 6 }),
};

export default function AdminDashboard() {
  const [warga, setWarga] = useState([]);
  const [pembayaran, setPembayaran] = useState([]);
  const [sampah, setSampah] = useState([]);

  useEffect(() => {
    fetchData();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.href = "/";
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function fetchData() {
    const { data: w } = await supabase.from("warga").select("*");
    const { data: p } = await supabase.from("pembayaran").select("*, warga(*)");
    const { data: s } = await supabase.from("sampah").select("*, warga(*)");
    setWarga(w || []);
    setPembayaran(p || []);
    setSampah(s || []);
  }

  async function verifikasiPayment(id, status) {
    await supabase.from("pembayaran").update({ status_verifikasi: status }).eq("id", id);
    fetchData();
  }
  async function hapusWarga(id) {
    if (confirm("Hapus warga dan semua datanya?")) {
      await supabase.from("warga").delete().eq("id", id);
      fetchData();
    }
  }
  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  const mapData = warga.map(w => {
    const payment = pembayaran.find(p => p.warga_id === w.id);
    return { ...w, payment_status: payment?.status_verifikasi === "Disetujui" ? "Sudah Bayar" : "Belum Bayar" };
  });

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>👑 Admin Dashboard</h1>
          <button style={styles.logoutBtn} onClick={logout}>Keluar</button>
        </div>
        <div style={styles.content}>
          <h3 style={styles.sectionTitle}>🗺️ Peta Sebaran Warga (Hijau = Sudah Bayar)</h3>
          <Map data={mapData} height="380px" />

          <div style={styles.grid}>
            <div style={styles.cardPanel}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>✅ Verifikasi Pembayaran</h3>
              {pembayaran.map(p => (
                <div key={p.id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                  <div><strong>{p.warga?.nama}</strong> - Rp{p.jumlah}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Status: {p.status_verifikasi}</div>
                  {p.status_verifikasi === "Pending" && (
                    <div style={{ marginTop: 6 }}>
                      <button style={styles.btn("#1D9E75")} onClick={() => verifikasiPayment(p.id, "Disetujui")}>Setujui</button>
                      <button style={styles.btn("#dc2626")} onClick={() => verifikasiPayment(p.id, "Ditolak")}>Tolak</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={styles.cardPanel}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>🗑️ Data Warga</h3>
              {warga.map(w => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", padding: "8px 0" }}>
                  <span>{w.nama}</span>
                  <button style={styles.btn("#dc2626")} onClick={() => hapusWarga(w.id)}>Hapus</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}