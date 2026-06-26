import Swal from 'sweetalert2';
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Map from "../components/Map";

/* ─── Helpers ─── */
const parseJenisAndCatatan = (jenisStr) => {
  if (!jenisStr) return { jenis: "", catatan: "" };
  const match = jenisStr.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { jenis: match[1], catatan: match[2] };
  }
  return { jenis: jenisStr, catatan: "" };
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const getSampahStatus = (item) => item?.status ?? item?.status_pengangkutan ?? "Menunggu";

const JENIS_SAMPAH = ["Organik", "Anorganik / Plastik", "Kertas / Kardus", "Logam / Kaleng", "Kaca / Botol", "B3 (Berbahaya)", "Elektronik", "Lainnya"];

const STATUS_COLOR = {
  Menunggu:  { bg: "#fffbe6", color: "#d48806", border: "#ffe58f" },
  Diproses:  { bg: "#e6f7ff", color: "#0958d9", border: "#91caff" },
  Selesai:   { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  Pending:   { bg: "#fffbe6", color: "#d48806", border: "#ffe58f" },
  Disetujui: { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  Ditolak:   { bg: "#fff1f0", color: "#cf1322", border: "#ffa39e" },
};

function Badge({ status }) {
  const s = STATUS_COLOR[status] || { bg: "#fff", color: "#888", border: "#ddd" };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: "4px 12px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
      letterSpacing: "0.2px"
    }}>{status}</span>
  );
}

function StatCard({ icon, label, value, accent, sub }) {
  return (
    <div style={{
      flex: "1 1 140px", background: "#fff", borderRadius: 14, padding: "16px 18px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1.5px solid ${accent}22`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#0d1f2d", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa" }}>{sub}</div>}
    </div>
  );
}

export default function WargaDashboard() {
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lokasi, setLokasi]         = useState(null);
  const [sampahList, setSampahList] = useState([]);
  const [pembayaranList, setPembayaranList] = useState([]);
  const [activeTab, setActiveTab]   = useState("beranda");

  // Form request
  const [jenis, setJenis]       = useState("");
  const [berat, setBerat]       = useState("");
  const [catatan, setCatatan]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }

    const { data: p } = await supabase.from("warga").select("*").eq("user_id", user.id).maybeSingle();
    if (p) {
      setProfile(p);
      if (p.location) setLokasi(p.location);
      await Promise.all([fetchSampah(p.id), fetchPembayaran(p.id)]);
    }
    setLoading(false);
  }

  async function fetchSampah(wargaId) {
    try {
      const { data, error } = await supabase
        .from("sampah")
        .select("*")
        .eq("warga_id", wargaId)
        .order("id", { ascending: false });

      if (error) {
        console.error("fetchSampah error:", error);
        setSampahList([]);
        return;
      }

      setSampahList((data || []).map((item) => ({ ...item, status: getSampahStatus(item) })));
    } catch (err) {
      console.error("fetchSampah exception:", err);
      setSampahList([]);
    }
  }

  async function fetchPembayaran(wargaId) {
    try {
      const { data, error } = await supabase
        .from("pembayaran")
        .select("*")
        .eq("warga_id", wargaId)
        .order("id", { ascending: false });

      if (error) {
        console.error("fetchPembayaran error:", error);
        setPembayaranList([]);
        return;
      }

      setPembayaranList(data || []);
    } catch (err) {
      console.error("fetchPembayaran exception:", err);
      setPembayaranList([]);
    }
  }

  async function refresh() {
    if (!profile) return;
    await Promise.all([fetchSampah(profile.id), fetchPembayaran(profile.id)]);
  }

  async function simpanLokasi() {
    if (!lokasi || !profile) return Swal.fire("Klik peta untuk menentukan lokasi!");
    
    // Jika lokasi adalah string dari database, berarti user belum mengklik map
    if (typeof lokasi === "string") {
      return Swal.fire({ icon: 'info', title: 'Lokasi Tetap', text: 'Anda belum mengubah lokasi pada peta.' });
    }
    
    let lat = lokasi.lat;
    let lng = lokasi.lng;
    
    await supabase.from("warga").update({ location: `POINT(${lng} ${lat})` }).eq("id", profile.id);
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Lokasi berhasil disimpan!' });
    init();
  }

  async function requestPengangkutan() {
    if (!jenis) return Swal.fire("Pilih jenis sampah terlebih dahulu");
    if (!berat || parseFloat(berat) <= 0) return Swal.fire("Masukkan berat yang valid");
    if (!profile) return;

    setSubmitting(true);
    try {
      const payload = {
        warga_id: profile.id,
        jenis: catatan ? `${jenis} (${catatan})` : jenis,
        berat: parseFloat(berat),
        status: "Menunggu",
      };

      const { error } = await supabase.from("sampah").insert(payload);
      if (error) {
        console.error("insert sampah error:", error);
        Swal.fire("Gagal mengirim request: " + error.message);
      } else {
        setJenis(""); setBerat(""); setCatatan("");
        Swal.fire("✅ Request pengangkutan berhasil dikirim!");
        await fetchSampah(profile.id);
        setActiveTab("riwayat");
      }
    } catch (err) {
      console.error("requestPengangkutan exception:", err);
      Swal.fire("Gagal mengirim request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function bayarIuran() {
    if (!profile) return;
    const adaPending = pembayaranList.some(p => p.status === "Pending");
    if (adaPending) return Swal.fire("Masih ada pembayaran yang menunggu verifikasi admin.");
    const { error } = await supabase.from("pembayaran").insert({
  warga_id: profile.id,
  status: "Pending", 
    });
    if (error) Swal.fire("Gagal: " + error.message);
    else { Swal.fire("✅ Pembayaran diajukan, menunggu verifikasi admin."); await fetchPembayaran(profile.id); }
  }

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  /* Statistik */
  const totalReq   = sampahList.length;
  const menunggu   = sampahList.filter(s => getSampahStatus(s) === "Menunggu").length;
  const diproses   = sampahList.filter(s => getSampahStatus(s) === "Diproses").length;
  const selesai    = sampahList.filter(s => getSampahStatus(s) === "Selesai").length;
  const statusBayar = pembayaranList.find(p => p.status && p.status !== "Ditolak");

  const totalIuran = pembayaranList.filter(p => p.status === "Disetujui").length * 50000;

  const TABS = [
    { key: "beranda",   label: "🏠 Beranda" },
    { key: "request",   label: "📋 Request Sampah" },
    { key: "riwayat",   label: "📜 Riwayat" },
    { key: "pembayaran",label: "💰 Pembayaran" },
    { key: "laporan",   label: "📈 Laporan Keuangan" },
    { key: "peta",      label: "🗺️ Lokasi Saya" },
  ];

  if (loading) return (
    <div style={S.page}>
      <div style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ textAlign: "center", color: "#999" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <div>Memuat data...</div>
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.header}>
          <h1 style={S.headerTitle}>Dashboard Warga</h1>
          <button style={S.logoutBtn} onClick={logout}>Keluar</button>
        </div>
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: "#555", fontSize: 15 }}>Profil warga tidak ditemukan.<br />Silakan hubungi admin untuk mendaftarkan akun Anda.</p>
          <button style={S.primaryBtn} onClick={logout}>Keluar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; }
        .w-tab:hover { background: rgba(255,255,255,0.1) !important; }
        .w-row:hover td { background: #f8fffe !important; }
        .w-btn:hover { opacity: 0.85; }
        .w-input { width: 100%; padding: 10px 14px; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; background: #fafaf8; transition: border 0.2s; }
        .w-input:focus { border-color: #1D9E75; background: #fff; box-shadow: 0 0 0 3px rgba(29,158,117,0.1); }
        .w-select { width: 100%; padding: 10px 14px; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; background: #fafaf8; cursor: pointer; }
        .w-select:focus { border-color: #1D9E75; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fadeUp { animation: fadeUp 0.3s ease both; }
      `}</style>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <div style={S.logoIcon}>W</div>
          WebGIS Sampah
        </div>
        <div style={S.sidebarMenu}>
          {TABS.map(t => (
            <button key={t.key}
              style={activeTab === t.key ? S.sidebarMenuItemActive : S.sidebarMenuItem}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={S.mainContent}>
        {/* Top Nav */}
        <div style={S.topNav}>
          <div style={S.searchBar}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            Search or type command...
          </div>
          <div style={S.profileSection}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333", lineHeight: 1.1 }}>{profile.nama || "Warga"}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{profile.alamat || "Alamat belum diatur"}</div>
            </div>
            <div style={S.avatarSmall}>{profile.nama?.[0]?.toUpperCase() || "W"}</div>
            <button onClick={logout} style={S.btnOutlineSmall}>Logout</button>
          </div>
        </div>

        {/* Content */}
        <div style={S.contentWrapper}>
          <h1 style={S.pageTitle}>{TABS.find(t => t.key === activeTab)?.label?.replace(/[^a-zA-Z\s]/g, '') || "Dashboard"}</h1>
          
          <div style={S.content}>

          {/* ═══ BERANDA ═══ */}
          {activeTab === "beranda" && (
            <div className="fadeUp">
              <h2 style={S.sectionTitle}>Halo, {profile.nama?.split(" ")[0]}! 👋</h2>
              <p style={{ color: "#888", fontSize: 13, marginBottom: 20, marginTop: -8 }}>Selamat datang di dashboard pengelolaan sampah Anda.</p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
                <StatCard icon="📦" label="Total Request" value={totalReq} accent="#6366F1" sub="Semua waktu" />
                <StatCard icon="⏳" label="Menunggu" value={menunggu} accent="#F59E0B" sub="Belum diambil" />
                <StatCard icon="🚛" label="Sedang Diproses" value={diproses} accent="#3B82F6" sub="Dalam perjalanan" />
                <StatCard icon="✅" label="Selesai" value={selesai} accent="#10B981" sub="Sudah diangkut" />
              </div>

              {/* Info Panel */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Status Iuran */}
                <div style={{ background: "#f8fffe", border: "1.5px solid #d1fae5", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 10 }}>💰 Status Iuran Bulanan</div>
                  {pembayaranList.length === 0 ? (
                    <div>
                      <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>Belum ada riwayat pembayaran.</p>
                      <button style={S.primaryBtn} className="w-btn" onClick={() => setActiveTab("pembayaran")}>Bayar Sekarang</button>
                    </div>
                  ) : (
                    <div>
                      <Badge status={pembayaranList[0]?.status} />
                      <p style={{ color: "#888", fontSize: 12, margin: "8px 0 0" }}>
                        {pembayaranList[0]?.status === "Disetujui"
                          ? "✓ Iuran Anda sudah terverifikasi."
                          : pembayaranList[0]?.status === "Pending"
                          ? "Menunggu verifikasi dari admin."
                          : "Pembayaran ditolak. Coba bayar lagi."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Request Terbaru */}
                <div style={{ background: "#fff", border: "1.5px solid #eee", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 10 }}>🗑️ Request Terbaru</div>
                  {sampahList.length === 0 ? (
                    <div>
                      <p style={{ color: "#888", fontSize: 13, margin: "0 0 12px" }}>Belum ada request.</p>
                      <button style={S.primaryBtn} className="w-btn" onClick={() => setActiveTab("request")}>Buat Request</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{parseJenisAndCatatan(sampahList[0].jenis).jenis}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>{sampahList[0].berat} kg · {fmtDate(sampahList[0].created_at).split(",")[0]}</div>
                        </div>
                        <Badge status={sampahList[0].status} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button style={S.primaryBtn} className="w-btn" onClick={() => setActiveTab("request")}>
                  ➕ Request Pengangkutan
                </button>
                <button style={S.outlineBtn} className="w-btn" onClick={() => setActiveTab("riwayat")}>
                  📜 Lihat Riwayat
                </button>
                <button style={S.outlineBtn} className="w-btn" onClick={() => setActiveTab("peta")}>
                  🗺️ Atur Lokasi Saya
                </button>
              </div>
            </div>
          )}

          {/* ═══ REQUEST SAMPAH ═══ */}
          {activeTab === "request" && (
            <div className="fadeUp">
              <h2 style={S.sectionTitle}>Request Pengangkutan Sampah</h2>
              <p style={{ color: "#888", fontSize: 13, marginTop: -6, marginBottom: 22 }}>
                Isi form di bawah ini untuk meminta pengangkutan sampah. Courier akan segera memproses permintaan Anda.
              </p>

              <div style={{ maxWidth: 560, background: "#f8fffe", border: "1.5px solid #d1fae5", borderRadius: 16, padding: "24px 28px" }}>
                <div style={{ marginBottom: 18 }}>
                  <label style={S.label}>Jenis Sampah *</label>
                  <select className="w-select" value={jenis} onChange={e => setJenis(e.target.value)}>
                    <option value="">-- Pilih jenis sampah --</option>
                    {JENIS_SAMPAH.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={S.label}>Berat Estimasi (kg) *</label>
                  <input className="w-input" type="number" min="0.1" step="0.1" value={berat}
                    onChange={e => setBerat(e.target.value)} placeholder="Contoh: 2.5" />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={S.label}>Catatan Tambahan (opsional)</label>
                  <textarea className="w-input" rows={3} value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    placeholder="Contoh: Sampah berada di depan pagar, mohon diambil pagi hari"
                    style={{ resize: "vertical", lineHeight: 1.5 }} />
                </div>

                {/* Info lokasi */}
                {!profile.location && (
                  <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#92400E" }}>
                    ⚠️ <strong>Lokasi belum diatur.</strong> Courier memerlukan lokasi Anda untuk pengangkutan.
                    <span style={{ cursor: "pointer", textDecoration: "underline", marginLeft: 6 }}
                      onClick={() => setActiveTab("peta")}>Atur sekarang →</span>
                  </div>
                )}

                <button style={{ ...S.primaryBtn, width: "100%", padding: "12px", fontSize: 14, justifyContent: "center", opacity: submitting ? 0.7 : 1 }}
                  className="w-btn" onClick={requestPengangkutan} disabled={submitting}>
                  {submitting ? "⏳ Mengirim..." : "🚀 Kirim Request Pengangkutan"}
                </button>
              </div>
            </div>
          )}

          {/* ═══ RIWAYAT ═══ */}
          {activeTab === "riwayat" && (
            <div className="fadeUp">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={S.sectionTitle}>Riwayat Request Sampah</h2>
                <button style={S.outlineBtn} className="w-btn" onClick={refresh} title="Refresh data">
                  🔄 Refresh
                </button>
              </div>

              {sampahList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc" }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
                  <div style={{ fontSize: 14 }}>Belum ada request</div>
                  <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={() => setActiveTab("request")}>Buat Request Pertama</button>
                </div>
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>No</th>
                        <th style={S.th}>Jenis Sampah</th>
                        <th style={S.th}>Berat</th>
                        <th style={S.th}>Catatan</th>
                        <th style={S.th}>Tanggal Request</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampahList.map((s, i) => (
                        <tr key={s.id} className="w-row">
                          <td style={{ ...S.td, color: "#bbb", width: 36 }}>{i + 1}</td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{parseJenisAndCatatan(s.jenis).jenis}</td>
                          <td style={S.td}>{s.berat} kg</td>
                          <td style={{ ...S.td, color: "#888", maxWidth: 160, fontSize: 12 }}>{parseJenisAndCatatan(s.jenis).catatan || <span style={{ color: "#ddd" }}>—</span>}</td>
                          <td style={{ ...S.td, fontSize: 12, color: "#666" }}>{fmtDate(s.created_at)}</td>
                          <td style={S.td}><Badge status={s.status} /></td>
                          <td style={S.td}>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {["Menunggu", "Diproses", "Selesai"].map((step, idx) => {
                                const current = ["Menunggu", "Diproses", "Selesai"].indexOf(s.status);
                                const done = idx <= current;
                                return (
                                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <div title={step} style={{
                                      width: 10, height: 10, borderRadius: "50%",
                                      background: done ? "#10B981" : "#E5E7EB",
                                      border: `2px solid ${done ? "#10B981" : "#D1D5DB"}`,
                                    }} />
                                    {idx < 2 && <div style={{ width: 16, height: 2, background: done && idx < current ? "#10B981" : "#E5E7EB" }} />}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ PEMBAYARAN ═══ */}
          {activeTab === "pembayaran" && (
            <div className="fadeUp">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={S.sectionTitle}>Pembayaran Iuran Sampah</h2>
                <button style={S.primaryBtn} className="w-btn" onClick={bayarIuran}>
                  💳 Bayar Iuran Rp 50.000
                </button>
              </div>

              <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 14, padding: "16px 20px", marginBottom: 24, fontSize: 13, color: "#166534" }}>
                <strong>💡 Info:</strong> Iuran sampah sebesar <strong>Rp 50.000/bulan</strong>. Pembayaran akan diverifikasi oleh admin dalam 1×24 jam.
              </div>

              {pembayaranList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc" }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>💸</div>
                  <div>Belum ada riwayat pembayaran</div>
                  <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={bayarIuran}>Bayar Sekarang</button>
                </div>
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={{...S.th, width: 40, textAlign: "center"}}>No</th>
                        <th style={{...S.th, width: 140}}>Jumlah</th>
                        <th style={{...S.th, width: 120}}>Tanggal</th>
                        <th style={{...S.th, width: 120, textAlign: "center"}}>Status</th>
                        <th style={{...S.th, width: "100%"}}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pembayaranList.map((p, i) => (
                        <tr key={p.id} className="w-row">
                          <td style={{ ...S.td, color: "#bbb", textAlign: "center" }}>{i + 1}</td>
                          <td style={{ ...S.td, fontWeight: 500, color: "#333" }}>Rp 50.000</td>
                          <td style={{ ...S.td, fontSize: 13, color: "#666" }}>{fmtDate(p.tanggal)}</td>
                          <td style={{ ...S.td, textAlign: "center" }}><Badge status={p.status} /></td>
                          <td style={{ ...S.td, fontSize: 13, color: "#555" }}>
                            {p.status === "Disetujui" && "✓ Admin telah memverifikasi pembayaran Anda"}
                            {p.status === "Pending"   && "⏳ Sedang diproses oleh admin"}
                            {p.status === "Ditolak"   && "✕ Ditolak admin, mohon lakukan pembayaran kembali"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ LAPORAN KEUANGAN ═══ */}
          {activeTab === "laporan" && (
            <div className="fadeUp">
              <h2 style={S.sectionTitle}>Laporan Keuangan Pribadi</h2>
              <p style={{ color: "#888", fontSize: 13, marginTop: -6, marginBottom: 22 }}>
                Ringkasan total iuran yang telah kamu bayarkan untuk mendukung pengangkutan sampah (Circular Economy).
              </p>
              
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
                <StatCard icon="💸" label="Total Iuran Dibayar" value={`Rp ${totalIuran.toLocaleString('id-ID')}`} accent="#10B981" sub="Sepanjang waktu" />
                <StatCard icon="✅" label="Pengangkutan Selesai" value={selesai} accent="#6366F1" sub="Total sampah diangkut" />
              </div>

              <div style={S.card}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: "#1f2937" }}>Rincian Pengeluaran Iuran</h3>
                </div>
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>No</th>
                        <th style={S.th}>Tanggal Bayar</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pembayaranList.filter(p => p.status === "Disetujui").length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: "center", padding: "40px", color: "#888" }}>Belum ada iuran yang dibayarkan.</td></tr>
                      ) : (
                        pembayaranList.filter(p => p.status === "Disetujui").map((p, i) => (
                          <tr key={p.id} className="w-row">
                            <td style={{ ...S.td, color: "#bbb", width: 36 }}>{i + 1}</td>
                            <td style={S.td}>{fmtDate(p.created_at)}</td>
                            <td style={S.td}><Badge status="Disetujui" /></td>
                            <td style={{ ...S.td, color: "#EF4444", fontWeight: 700 }}>- Rp 50.000</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === "peta" && (
            <div className="fadeUp">
              <h2 style={S.sectionTitle}>Lokasi Rumah Saya</h2>
              <p style={{ color: "#888", fontSize: 13, marginTop: -6, marginBottom: 16 }}>
                Klik pada peta untuk menentukan atau mengubah lokasi rumah Anda. Lokasi ini digunakan courier untuk menjangkau rumah Anda.
              </p>

              {profile.location && (
                <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#065f46" }}>
                  ✅ Lokasi Anda sudah terdaftar. Klik peta untuk mengubah lokasi.
                </div>
              )}

              <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", marginBottom: 16 }}>
                <Map
                  setLatLng={setLokasi}
                  selectedMarker={typeof lokasi === "string" ? null : lokasi}
                  height="360px"
                />
              </div>

              <button style={{ ...S.primaryBtn, display: "inline-flex", alignItems: "center", gap: 8 }}
                className="w-btn" onClick={simpanLokasi}>
                📍 Simpan Lokasi
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const S = {
  page: { display: "flex", minHeight: "100vh", background: "#f5f7f9", fontFamily: "'DM Sans', sans-serif" },
  sidebar: { width: 250, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column" },
  sidebarHeader: { padding: "24px 24px", fontSize: 17, fontWeight: 700, color: "#1f2937", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f0f0f0", fontFamily: "'DM Sans', sans-serif" },
  logoIcon: { width: 28, height: 28, background: "#35b09e", borderRadius: 8, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 },
  sidebarMenu: { padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 },
  sidebarMenuItem: { background: "transparent", border: "none", padding: "12px 16px", color: "#6b7280", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", borderRadius: 8, transition: "all 0.2s" },
  sidebarMenuItemActive: { background: "#eaf7f5", color: "#35b09e", border: "none", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 8 },
  mainContent: { flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "auto" },
  topNav: { background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 },
  searchBar: { display: "flex", alignItems: "center", background: "#f9fafb", padding: "10px 16px", borderRadius: 8, width: 300, border: "1px solid #f0f0f0", color: "#9ca3af", fontSize: 13, gap: 8 },
  profileSection: { display: "flex", alignItems: "center", gap: 16 },
  avatarSmall: { width: 36, height: 36, borderRadius: 10, background: "#eaf7f5", color: "#35b09e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 },
  btnOutlineSmall: { background: "#fff", border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#4b5563" },
  contentWrapper: { padding: "32px 40px", maxWidth: 1200, width: "100%", margin: "0 auto" },
  pageTitle: { fontSize: 22, fontWeight: 600, color: "#111827", margin: "0 0 24px" },
  card: { background: "#fff", borderRadius: 12, border: "1px solid #f0f0f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" },
  content: { padding: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: "#1f2937", margin: "0 0 12px", fontFamily: "'DM Sans', sans-serif" },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, letterSpacing: "0.02em", textTransform: "uppercase" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #f0f0f0", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "14px 16px", fontSize: 13, fontWeight: 500, color: "#8c8c8c", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", background: "#fafafa" },
  td: { padding: "16px 16px", fontSize: 14, borderBottom: "1px solid #f0f0f0", verticalAlign: "middle", color: "#333" },
  primaryBtn: { background: "#35b09e", border: "none", padding: "10px 20px", borderRadius: 8, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "background 0.2s" },
  outlineBtn: { background: "#fff", border: "1px solid #d1d5db", padding: "10px 20px", borderRadius: 8, color: "#374151", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer" },
};