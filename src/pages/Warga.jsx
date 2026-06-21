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

const JENIS_SAMPAH = ["Organik", "Anorganik / Plastik", "Kertas / Kardus", "Logam / Kaleng", "Kaca / Botol", "B3 (Berbahaya)", "Elektronik", "Lainnya"];

const STATUS_COLOR = {
  Menunggu:  { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  Diproses:  { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  Selesai:   { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  Pending:   { bg: "#FEF9C3", color: "#854D0E", border: "#FDE68A" },
  Disetujui: { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  Ditolak:   { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA" },
};

function Badge({ status }) {
  const s = STATUS_COLOR[status] || { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
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
    const { data } = await supabase
      .from("sampah")
      .select("*")
      .eq("warga_id", wargaId)
      .order("id", { ascending: false });
    setSampahList(data || []);
  }

  async function fetchPembayaran(wargaId) {
    const { data } = await supabase
      .from("pembayaran")
      .select("*")
      .eq("warga_id", wargaId)
      .order("tanggal", { ascending: false });
    setPembayaranList(data || []);
  }

  async function refresh() {
    if (!profile) return;
    await Promise.all([fetchSampah(profile.id), fetchPembayaran(profile.id)]);
  }

  async function simpanLokasi() {
    if (!lokasi || !profile) return alert("Klik peta untuk menentukan lokasi!");
    let lat, lng;
    if (typeof lokasi === "string") {
      const m = lokasi.match(/POINT\(([-\d.]+) ([-\d.]+)\)/i);
      if (!m) return alert("Format lokasi tidak valid");
      lng = parseFloat(m[1]); lat = parseFloat(m[2]);
    } else {
      lat = lokasi.lat; lng = lokasi.lng;
    }
    await supabase.from("warga").update({ location: `POINT(${lng} ${lat})` }).eq("id", profile.id);
    alert("✅ Lokasi berhasil disimpan!");
    init();
  }

  async function requestPengangkutan() {
    if (!jenis) return alert("Pilih jenis sampah terlebih dahulu");
    if (!berat || parseFloat(berat) <= 0) return alert("Masukkan berat yang valid");
    if (!profile) return;

    setSubmitting(true);
    const { error } = await supabase.from("sampah").insert({
      warga_id: profile.id,
      jenis: catatan ? `${jenis} (${catatan})` : jenis,
      berat: parseFloat(berat),
      status_pengangkutan: "Menunggu",
    });
    if (error) alert("Gagal mengirim request: " + error.message);
    else {
      setJenis(""); setBerat(""); setCatatan("");
      alert("✅ Request pengangkutan berhasil dikirim!");
      await fetchSampah(profile.id);
      setActiveTab("riwayat");
    }
    setSubmitting(false);
  }

  async function bayarIuran() {
    if (!profile) return;
    const adaPending = pembayaranList.some(p => p.status_verifikasi === "Pending");
    if (adaPending) return alert("Masih ada pembayaran yang menunggu verifikasi admin.");
    const { error } = await supabase.from("pembayaran").insert({
      warga_id: profile.id,
      status_verifikasi: "Pending",
    });
    if (error) alert("Gagal: " + error.message);
    else { alert("✅ Pembayaran diajukan, menunggu verifikasi admin."); await fetchPembayaran(profile.id); }
  }

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  /* Statistik */
  const totalReq   = sampahList.length;
  const menunggu   = sampahList.filter(s => s.status_pengangkutan === "Menunggu").length;
  const diproses   = sampahList.filter(s => s.status_pengangkutan === "Diproses").length;
  const selesai    = sampahList.filter(s => s.status_pengangkutan === "Selesai").length;
  const statusBayar = pembayaranList.find(p => p.status_verifikasi && p.status_verifikasi !== "Ditolak");

  const TABS = [
    { key: "beranda",   label: "🏠 Beranda" },
    { key: "request",   label: "📋 Request Sampah" },
    { key: "riwayat",   label: "📜 Riwayat" },
    { key: "pembayaran",label: "💰 Pembayaran" },
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

      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={S.avatar}>{profile.nama?.[0]?.toUpperCase() || "W"}</div>
            <div>
              <h1 style={S.headerTitle}>{profile.nama}</h1>
              <p style={S.headerSub}>{profile.alamat || "Alamat belum diatur"}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: statusBayar?.status_verifikasi === "Disetujui" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
              border: `1px solid ${statusBayar?.status_verifikasi === "Disetujui" ? "#10B981" : "#F59E0B"}40`,
              color: statusBayar?.status_verifikasi === "Disetujui" ? "#065F46" : "#92400E",
              padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
            }}>
              {statusBayar?.status_verifikasi === "Disetujui" ? "✓ Iuran Lunas" : "⚠ Iuran Belum Lunas"}
            </div>
            <button style={S.logoutBtn} className="w-btn" onClick={logout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Keluar
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t.key} className="w-tab"
              onClick={() => setActiveTab(t.key)}
              style={{ ...S.tabBtn, ...(activeTab === t.key ? S.tabActive : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
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
                      <Badge status={pembayaranList[0]?.status_verifikasi} />
                      <p style={{ color: "#888", fontSize: 12, margin: "8px 0 0" }}>
                        {pembayaranList[0]?.status_verifikasi === "Disetujui"
                          ? "✓ Iuran Anda sudah terverifikasi."
                          : pembayaranList[0]?.status_verifikasi === "Pending"
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
                        <Badge status={sampahList[0].status_pengangkutan} />
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
                Isi form di bawah ini untuk meminta pengangkutan sampah. Transporter akan segera memproses permintaan Anda.
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
                    ⚠️ <strong>Lokasi belum diatur.</strong> Transporter memerlukan lokasi Anda untuk pengangkutan.
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
                      <tr style={{ background: "#f8f8f6" }}>
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
                          <td style={S.td}><Badge status={s.status_pengangkutan} /></td>
                          <td style={S.td}>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {["Menunggu", "Diproses", "Selesai"].map((step, idx) => {
                                const current = ["Menunggu", "Diproses", "Selesai"].indexOf(s.status_pengangkutan);
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
                      <tr style={{ background: "#f8f8f6" }}>
                        <th style={S.th}>No</th>
                        <th style={S.th}>Jumlah</th>
                        <th style={S.th}>Tanggal</th>
                        <th style={S.th}>Status Verifikasi</th>
                        <th style={S.th}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pembayaranList.map((p, i) => (
                        <tr key={p.id} className="w-row">
                          <td style={{ ...S.td, color: "#bbb", width: 36 }}>{i + 1}</td>
                          <td style={{ ...S.td, fontWeight: 600, color: "#0F6E56" }}>Rp 50.000</td>
                          <td style={{ ...S.td, fontSize: 12, color: "#666" }}>{fmtDate(p.tanggal)}</td>
                          <td style={S.td}><Badge status={p.status_verifikasi} /></td>
                          <td style={{ ...S.td, fontSize: 12, color: "#888" }}>
                            {p.status_verifikasi === "Disetujui" && "✓ Admin telah memverifikasi pembayaran Anda"}
                            {p.status_verifikasi === "Pending"   && "⏳ Sedang diproses oleh admin"}
                            {p.status_verifikasi === "Ditolak"   && "✕ Ditolak admin, coba bayar kembali"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ PETA ═══ */}
          {activeTab === "peta" && (
            <div className="fadeUp">
              <h2 style={S.sectionTitle}>Lokasi Rumah Saya</h2>
              <p style={{ color: "#888", fontSize: 13, marginTop: -6, marginBottom: 16 }}>
                Klik pada peta untuk menentukan atau mengubah lokasi rumah Anda. Lokasi ini digunakan transporter untuk menjangkau rumah Anda.
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
  );
}

/* ─── Styles ─── */
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f0ed 0%, #e8f5f1 100%)",
    fontFamily: "'DM Sans', sans-serif",
    padding: "24px 16px",
  },
  card: {
    maxWidth: 1100, margin: "0 auto", background: "#fff",
    borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.10)", overflow: "hidden",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 28px",
    background: "linear-gradient(135deg, #0d1f2d 0%, #1a3a2a 100%)",
  },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    background: "rgba(29,158,117,0.3)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: 700,
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 18,
    fontWeight: 500, color: "#fff", margin: 0,
  },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "2px 0 0" },
  logoutBtn: {
    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
    padding: "7px 14px", borderRadius: 99, color: "#fff", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
    display: "flex", alignItems: "center", gap: 6,
  },
  tabBar: {
    display: "flex", background: "#0d1f2d",
    padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto",
  },
  tabBtn: {
    background: "transparent", border: "none",
    borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "transparent",
    padding: "12px 16px", color: "rgba(255,255,255,0.45)",
    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
    cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
  },
  tabActive: { color: "#1D9E75", borderBottomColor: "#1D9E75", background: "rgba(29,158,117,0.08)", fontWeight: 600 },
  content: { padding: "24px 28px 36px" },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "#0d1f2d", margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "11px 12px", fontSize: 12, fontWeight: 600, color: "#555", borderBottom: "1px solid #eee", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f5f5f5", verticalAlign: "middle" },
  primaryBtn: {
    background: "#0F6E56", border: "none", padding: "9px 18px", borderRadius: 99,
    color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  },
  outlineBtn: {
    background: "transparent", border: "1.5px solid #ddd", padding: "9px 18px", borderRadius: 99,
    color: "#555", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
};