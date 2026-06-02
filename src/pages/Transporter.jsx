import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Map, { parseLocation } from "../components/Map";

const styles = {
  page: { minHeight: "100vh", background: "#f0f0ed", fontFamily: "'DM Sans', sans-serif", padding: 24 },
  card: { maxWidth: 1280, margin: "0 auto", background: "#fff", borderRadius: 24, boxShadow: "0 12px 32px rgba(0,0,0,0.08)", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #eaeaea" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 500, color: "#0d1f2d", margin: 0 },
  logoutBtn: { background: "#0F6E56", border: "none", padding: "8px 18px", borderRadius: 40, color: "#fff", cursor: "pointer" },
  tabContainer: { display: "flex", gap: 2, background: "#f9f9f7", padding: "0 28px", borderBottom: "1px solid #eee" },
  tab: (active) => ({ padding: "12px 20px", background: active ? "#fff" : "transparent", border: "none", borderBottom: active ? "2px solid #1D9E75" : "2px solid transparent", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: active ? 600 : 400, color: active ? "#1D9E75" : "#666", cursor: "pointer" }),
  content: { padding: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: "#0d1f2d", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 12 },
  th: { textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #eee", fontSize: 13, fontWeight: 600, color: "#555" },
  td: { padding: "10px 8px", borderBottom: "1px solid #f0f0f0", fontSize: 13 },
  btn: (bg = "#0F6E56") => ({ background: bg, border: "none", padding: "5px 12px", borderRadius: 20, color: "#fff", fontSize: 12, cursor: "pointer", marginRight: 8 }),
};

export default function Transporter() {
  const [tab, setTab] = useState("peta");
  const [data, setData] = useState({ warga: [], tugas: [] });
  const [myId, setMyId] = useState(null);

  const fetchAll = async (tid) => {
    const { data: w } = await supabase.from("warga").select("*, pembayaran(status)");
    const { data: t } = await supabase.from("pengangkutan").select("*, warga(*)").eq("transporter_id", tid || myId);
    setData({ warga: w || [], tugas: t || [] });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setMyId(user.id); fetchAll(user.id); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.href = "/";
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  const handleAction = async (id, status) => {
    await supabase.from("pengangkutan").update({ status }).eq("id", id);
    fetchAll(myId);
  };
  const openRoute = (loc) => {
    const p = parseLocation(loc);
    if (p) window.open(`https://www.google.com/maps?q=${p.lat},${p.lng}`, "_blank");
    else alert("Lokasi tidak ada");
  };
  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🚛 Dashboard Transporter</h1>
          <button style={styles.logoutBtn} onClick={logout}>Keluar</button>
        </div>
        <div style={styles.tabContainer}>
          {["peta", "warga", "tugas"].map(t => <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>{t.toUpperCase()}</button>)}
        </div>
        <div style={styles.content}>
          {tab === "peta" && <Map data={data.warga} height="450px" />}
          {tab === "warga" && (
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Nama</th><th style={styles.th}>Alamat</th><th style={styles.th}>Aksi</th></tr></thead>
              <tbody>
                {data.warga.map(w => (
                  <tr key={w.id}>
                    <td style={styles.td}>{w.nama}</td>
                    <td style={styles.td}>{w.alamat}</td>
                    <td style={styles.td}>
                      <button style={styles.btn()} onClick={() => supabase.from("pengangkutan").insert({ warga_id: w.id, transporter_id: myId, status: "proses" }).then(() => fetchAll(myId))}>Ambil</button>
                      <button style={styles.btn("#3b82f6")} onClick={() => openRoute(w.location)}>Rute</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === "tugas" && (
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Warga</th><th style={styles.th}>Status</th><th style={styles.th}>Aksi</th></tr></thead>
              <tbody>
                {data.tugas.map(t => (
                  <tr key={t.id}>
                    <td style={styles.td}>{t.warga?.nama}</td>
                    <td style={styles.td}>{t.status}</td>
                    <td style={styles.td}>
                      {t.status === "proses" && <button style={styles.btn()} onClick={() => handleAction(t.id, "selesai")}>Selesai</button>}
                      <button style={styles.btn("#3b82f6")} onClick={() => openRoute(t.warga?.location)}>Rute</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}