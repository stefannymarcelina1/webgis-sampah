import Swal from 'sweetalert2';
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Map from "../components/Map";

/* ─────────────────────────── HELPERS ─────────────────────────── */
const fmt = (n) => new Intl.NumberFormat("id-ID").format(n);
const parseJenisAndCatatan = (jenisStr) => {
  if (!jenisStr) return { jenis: "", catatan: "" };
  const match = jenisStr.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { jenis: match[1], catatan: match[2] };
  }
  return { jenis: jenisStr, catatan: "" };
};
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const getSampahStatus = (item) => item?.status ?? item?.status_pengangkutan ?? "Menunggu";

const STATUS_COLOR = {
  Menunggu:  { bg: "#fffbe6", color: "#d48806", border: "#ffe58f" },
  Diproses:  { bg: "#e6f7ff", color: "#0958d9", border: "#91caff" },
  Selesai:   { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  Pending:   { bg: "#fffbe6", color: "#d48806", border: "#ffe58f" },
  Disetujui: { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  Ditolak:   { bg: "#fff1f0", color: "#cf1322", border: "#ffa39e" },
};

const normalizeStatus = (value) => {
  if (value === "proses" || value === "Diproses") return "Diproses";
  if (value === "selesai" || value === "Selesai") return "Selesai";
  return value;
};

function Badge({ status }) {
  const normalized = normalizeStatus(status);
  const s = STATUS_COLOR[normalized] || { bg: "#fff", color: "#888", border: "#ddd" };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: "4px 12px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
      letterSpacing: "0.2px"
    }}>
      {normalized || "-"}
    </span>
  );
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      flex: "1 1 180px",
      background: "#fff",
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      border: `1.5px solid ${accent}22`,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#0d1f2d", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#999" }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────── MAIN ─────────────────────────── */
export default function AdminDashboard() {
  const [warga, setWarga]           = useState([]);
  const [pembayaran, setPembayaran] = useState([]);
  const [sampah, setSampah]         = useState([]);
  const [pengangkutan, setPengangkutan] = useState([]);
  const [activeTab, setActiveTab]   = useState("ringkasan");
  const [bayarFilter, setBayarFilter] = useState("Semua");
  const [loading, setLoading]       = useState(true);

  // Form tambah warga
  const [showAddWarga, setShowAddWarga] = useState(false);
  const [formWarga, setFormWarga] = useState({ nama: "", alamat: "", no_hp: "", email: "" });
  const [addingWarga, setAddingWarga] = useState(false);

  useEffect(() => {
    fetchData();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.href = "/";
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [w, p, s, pg] = await Promise.all([
      supabase.from("warga").select("*").order("id", { ascending: false }),
      supabase.from("pembayaran").select("*, warga(nama, alamat)").order("id", { ascending: false }),
      supabase.from("sampah").select("*, warga(nama, alamat)").order("id", { ascending: false }),
      supabase
        .from("pengangkutan")
        .select("*, warga(nama, alamat, location), transporter:profiles!pengangkutan_transporter_id_fkey(id, nama, role)")
        .order("id", { ascending: false }),
    ]);
    setWarga(w.data || []);
    setPembayaran(p.data || []);
    setSampah((s.data || []).map((item) => ({ ...item, status: getSampahStatus(item) })));
    setPengangkutan(pg.data || []);
    setLoading(false);
  }

  async function verifikasiPayment(id, status) {
    await supabase.from("pembayaran").update({ status }).eq("id", id);
    await fetchData();
  }

  async function hapusWarga(id, nama) {
    if (!confirm(`Hapus warga "${nama}" dan semua datanya?`)) return;
    await supabase.from("warga").delete().eq("id", id);
    await fetchData();
  }

  async function updateStatusSampah(id, status) {
    const { error } = await supabase.from("sampah").update({ status }).eq("id", id);
    if (error) {
      await supabase.from("sampah").update({ status_pengangkutan: status }).eq("id", id);
    }
    await fetchData();
  }

  async function tambahWarga() {
    if (!formWarga.nama || !formWarga.alamat) return Swal.fire("Nama dan alamat wajib diisi");
    setAddingWarga(true);
    const { error } = await supabase.from("warga").insert({
      nama: formWarga.nama,
      alamat: formWarga.alamat,
      no_hp: formWarga.no_hp || null,
    });
    if (error) Swal.fire("Gagal menambah warga: " + error.message);
    else {
      setFormWarga({ nama: "", alamat: "", no_hp: "", email: "" });
      setShowAddWarga(false);
      await fetchData();
    }
    setAddingWarga(false);
  }

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  /* Statistik */
  const totalWarga     = warga.length;
  const pending        = pembayaran.filter(p => p.status === "Pending").length;
  const disetujui      = pembayaran.filter(p => p.status === "Disetujui").length;
  const sampahAktif    = sampah.filter(s => s.status === "Menunggu").length;
  
  const totalPengangkutanSelesai = pengangkutan.filter(p => ["selesai", "Selesai"].includes(p.status)).length;
  const totalPemasukan = disetujui * 50000;
  const totalPengeluaran = totalPengangkutanSelesai * 10000;
  const labaKotor = totalPemasukan - totalPengeluaran;

  /* Filter pembayaran */
  const filteredBayar = bayarFilter === "Semua"
    ? pembayaran
    : pembayaran.filter(p => p.status === bayarFilter);

  /* Peta data */
  const mapData = warga.map(w => {
    const pay = pembayaran.find(p => p.warga_id === w.id);
    return { ...w, payment_status: pay?.status === "Disetujui" ? "Sudah Bayar" : "Belum Bayar" };
  });

  const TABS = [
    { key: "ringkasan",    label: "📊 Ringkasan" },
    { key: "pembayaran",   label: "✅ Pembayaran" },
    { key: "sampah",       label: "🗑️ Sampah" },
    { key: "warga",        label: "👥 Warga" },
    { key: "transporter",  label: "🚛 Courier" },
    { key: "laporan",      label: "📈 Laporan Keuangan" },
  ];

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; }
        .adm-tab-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .adm-row:hover td { background: #f8fffe !important; }
        .adm-btn:hover { opacity: 0.85; }
        .adm-filter-btn { border: 1.5px solid #ddd; padding: 5px 14px; border-radius: 99px; background: #fff; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .adm-filter-btn.active { background: #0F6E56; color: #fff; border-color: #0F6E56; font-weight: 600; }
        .adm-input { width: 100%; padding: 9px 13px; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; background: #fafaf8; transition: border 0.2s; }
        .adm-input:focus { border-color: #1D9E75; background: #fff; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fadeUp { animation: fadeUp 0.35s ease both; }
      `}</style>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <div style={S.logoIcon}>A</div>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333", lineHeight: 1.1 }}>Admin WebGIS</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Sistem Informasi Sampah</div>
            </div>
            <div style={S.avatarSmall}>A</div>
            <button onClick={logout} style={S.btnOutlineSmall}>Logout</button>
          </div>
        </div>

        {/* Content */}
        <div style={S.contentWrapper}>
          <h1 style={S.pageTitle}>{TABS.find(t => t.key === activeTab)?.label?.replace(/[^a-zA-Z\s]/g, '') || "Dashboard"}</h1>
          
          <div style={S.content}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#999", fontSize: 15 }}>
              ⏳ Memuat data...
            </div>
          ) : (
            <>
              {/* ══════════ TAB: RINGKASAN ══════════ */}
              {activeTab === "ringkasan" && (
                <div className="fadeUp">
                  <h2 style={S.sectionTitle}>Statistik Hari Ini</h2>
                  <div style={S.statsRow}>
                    <StatCard icon="👥" label="Total Warga" value={totalWarga} sub="Terdaftar di sistem" accent="#0F6E56" />
                    <StatCard icon="⏳" label="Pembayaran Pending" value={pending} sub="Menunggu verifikasi" accent="#F59E0B" />
                    <StatCard icon="✅" label="Pembayaran Disetujui" value={disetujui} sub="Sudah terverifikasi" accent="#10B981" />
                    <StatCard icon="🗑️" label="Request Sampah" value={sampahAktif} sub="Belum diangkut" accent="#6366F1" />
                  </div>

                  <h2 style={{ ...S.sectionTitle, marginTop: 32 }}>🗺️ Peta Sebaran Warga</h2>
                  <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                    <Map data={mapData} height="400px" />
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} /> Sudah Bayar
                    </span>
                    <span style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} /> Belum Bayar
                    </span>
                  </div>
                </div>
              )}

              {/* ══════════ TAB: PEMBAYARAN ══════════ */}
              {activeTab === "pembayaran" && (
                <div className="fadeUp">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <h2 style={S.sectionTitle}>Manajemen Pembayaran</h2>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["Semua", "Pending", "Disetujui", "Ditolak"].map(f => (
                        <button
                          key={f}
                          className={`adm-filter-btn${bayarFilter === f ? " active" : ""}`}
                          onClick={() => setBayarFilter(f)}
                        >{f} {f === "Semua" ? `(${pembayaran.length})` : `(${pembayaran.filter(p => p.status === f).length})`}</button>
                      ))}
                    </div>
                  </div>
                  {filteredBayar.length === 0 ? (
                    <Empty text="Tidak ada data pembayaran" />
                  ) : (
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>No</th>
                            <th style={S.th}>Nama Warga</th>
                            <th style={S.th}>Alamat</th>
                            <th style={S.th}>Jumlah</th>
                            <th style={S.th}>Tanggal</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBayar.map((p, i) => (
                            <tr key={p.id} className="adm-row">
                              <td style={{ ...S.td, color: "#aaa", width: 36 }}>{i + 1}</td>
                              <td style={{ ...S.td, fontWeight: 500 }}>{p.warga?.nama || "-"}</td>
                              <td style={{ ...S.td, color: "#666", maxWidth: 160 }}>{p.warga?.alamat || "-"}</td>
                              <td style={{ ...S.td, fontWeight: 500, color: "#333" }}>Rp {fmt(p.jumlah || 50000)}</td>
                              <td style={S.td}>{fmtDate(p.tanggal || p.created_at)}</td>
                              <td style={S.td}><Badge status={p.status} /></td>
                              <td style={S.td}>
                                {p.status === "Pending" ? (
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <ActionBtn color="#10B981" onClick={() => verifikasiPayment(p.id, "Disetujui")}>✓ Setujui</ActionBtn>
                                    <ActionBtn color="#EF4444" onClick={() => verifikasiPayment(p.id, "Ditolak")}>✕ Tolak</ActionBtn>
                                  </div>
                                ) : (
                                  <span style={{ color: "#bbb", fontSize: 12 }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ TAB: SAMPAH ══════════ */}
              {activeTab === "sampah" && (
                <div className="fadeUp">
                  <h2 style={S.sectionTitle}>Manajemen Request Sampah</h2>
                  {sampah.length === 0 ? (
                    <Empty text="Belum ada request sampah" />
                  ) : (
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>No</th>
                            <th style={S.th}>Nama Warga</th>
                            <th style={S.th}>Alamat</th>
                            <th style={S.th}>Jenis Sampah</th>
                            <th style={S.th}>Berat</th>
                            <th style={S.th}>Catatan</th>
                            <th style={S.th}>Tanggal</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Update Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampah.map((s, i) => {
                            const info = parseJenisAndCatatan(s.jenis);
                            return (
                              <tr key={s.id} className="adm-row">
                                <td style={{ ...S.td, color: "#aaa", width: 36 }}>{i + 1}</td>
                                <td style={{ ...S.td, fontWeight: 500 }}>{s.warga?.nama || "-"}</td>
                                <td style={{ ...S.td, color: "#666", maxWidth: 140 }}>{s.warga?.alamat || "-"}</td>
                                <td style={S.td}>
                                  <span style={{ background: "#f0fdf4", color: "#166534", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                                    {info.jenis}
                                  </span>
                                </td>
                                <td style={{ ...S.td, fontWeight: 600 }}>{s.berat} kg</td>
                                <td style={{ ...S.td, color: "#888", maxWidth: 160, fontSize: 12 }}>{info.catatan || <span style={{ color: "#ddd" }}>—</span>}</td>
                                <td style={S.td}>{fmtDate(s.created_at)}</td>
                                <td style={S.td}><Badge status={s.status} /></td>
                              <td style={S.td}>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  {s.status === "Menunggu" && (
                                  <ActionBtn color="#6366F1" onClick={() => updateStatusSampah(s.id, "Diproses")}>▶ Proses</ActionBtn>
                                )}
                                {s.status === "Diproses" && (
                                  <ActionBtn color="#10B981" onClick={() => updateStatusSampah(s.id, "Selesai")}>✓ Selesai</ActionBtn>
                                )}
                                {s.status === "Selesai" && (
                                  <span style={{ color: "#bbb", fontSize: 12 }}>Selesai</span>
                                )}
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ TAB: WARGA ══════════ */}
              {activeTab === "warga" && (
                <div className="fadeUp">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <h2 style={S.sectionTitle}>Data Warga ({totalWarga})</h2>
                    <button
                      style={{ ...S.primaryBtn, display: "flex", alignItems: "center", gap: 6 }}
                      className="adm-btn"
                      onClick={() => setShowAddWarga(!showAddWarga)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      {showAddWarga ? "Batal" : "Tambah Warga"}
                    </button>
                  </div>

                  {/* Form Tambah Warga */}
                  {showAddWarga && (
                    <div style={S.formCard} className="fadeUp">
                      <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#0d1f2d", fontWeight: 600 }}>➕ Form Tambah Warga Baru</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div>
                          <label style={S.label}>Nama Lengkap *</label>
                          <input className="adm-input" placeholder="Nama lengkap warga" value={formWarga.nama} onChange={e => setFormWarga(f => ({ ...f, nama: e.target.value }))} />
                        </div>
                        <div>
                          <label style={S.label}>No. HP</label>
                          <input className="adm-input" placeholder="08xx-xxxx-xxxx" value={formWarga.no_hp} onChange={e => setFormWarga(f => ({ ...f, no_hp: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={S.label}>Alamat *</label>
                          <input className="adm-input" placeholder="Alamat lengkap" value={formWarga.alamat} onChange={e => setFormWarga(f => ({ ...f, alamat: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                        <button style={S.primaryBtn} className="adm-btn" onClick={tambahWarga} disabled={addingWarga}>
                          {addingWarga ? "Menyimpan..." : "💾 Simpan Warga"}
                        </button>
                        <button style={S.ghostBtn} className="adm-btn" onClick={() => setShowAddWarga(false)}>Batal</button>
                      </div>
                    </div>
                  )}

                  {warga.length === 0 ? (
                    <Empty text="Belum ada data warga" />
                  ) : (
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>No</th>
                            <th style={S.th}>Nama</th>
                            <th style={S.th}>Alamat</th>
                            <th style={S.th}>No. HP</th>
                            <th style={S.th}>Status Bayar</th>
                            <th style={S.th}>Terdaftar</th>
                            <th style={S.th}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {warga.map((w, i) => {
                            const pay = pembayaran.find(p => p.warga_id === w.id);
                            const sudahBayar = pay?.status_verifikasi === "Disetujui";
                            return (
                              <tr key={w.id} className="adm-row">
                                <td style={{ ...S.td, color: "#aaa", width: 36 }}>{i + 1}</td>
                                <td style={{ ...S.td, fontWeight: 600 }}>{w.nama}</td>
                                <td style={{ ...S.td, color: "#666", maxWidth: 180 }}>{w.alamat || "-"}</td>
                                <td style={S.td}>{w.no_hp || <span style={{ color: "#ccc" }}>—</span>}</td>
                                <td style={S.td}>
                                  <Badge status={sudahBayar ? "Disetujui" : pay?.status_verifikasi || "Belum"} />
                                </td>
                                <td style={S.td}>{fmtDate(w.created_at)}</td>
                                <td style={S.td}>
                                  <ActionBtn color="#EF4444" onClick={() => hapusWarga(w.id, w.nama)}>🗑 Hapus</ActionBtn>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ TAB: TRANSPORTER ══════════ */}
              {activeTab === "transporter" && (
                <div className="fadeUp">
                  <h2 style={S.sectionTitle}>Riwayat Pengangkutan Sampah</h2>
                  {pengangkutan.length === 0 ? (
                    <Empty text="Belum ada data pengangkutan" />
                  ) : (
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>No</th>
                            <th style={S.th}>Nama Warga</th>
                            <th style={S.th}>Alamat</th>
                            <th style={S.th}>Courier</th>
                            <th style={S.th}>Lokasi</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Tanggal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pengangkutan.map((pg, i) => (
                            <tr key={pg.id} className="adm-row">
                              <td style={{ ...S.td, color: "#aaa", width: 36 }}>{i + 1}</td>
                              <td style={{ ...S.td, fontWeight: 500 }}>{pg.warga?.nama || "-"}</td>
                              <td style={{ ...S.td, color: "#666" }}>{pg.warga?.alamat || "-"}</td>
                              <td style={{ ...S.td, fontSize: 12 }}>
                                {pg.transporter?.nama || pg.transporter_id || "-"}
                              </td>
                              <td style={{ ...S.td, fontSize: 12, color: "#555" }}>
                                {pg.warga?.location ? "Sudah ada lokasi" : "Belum ada lokasi"}
                              </td>
                              <td style={S.td}>
                                <Badge status={
                                  pg.status === "selesai" ? "Selesai"
                                  : pg.status === "proses" ? "Diproses"
                                  : "Menunggu"
                                } />
                              </td>
                              <td style={S.td}>{fmtDate(pg.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {/* ══════════ TAB: LAPORAN KEUANGAN ══════════ */}
              {activeTab === "laporan" && (
                <div className="fadeUp">
                  <h2 style={S.sectionTitle}>Laporan Keuangan (Circular Economy)</h2>
                  <p style={{ color: "#888", fontSize: 13, marginTop: -6, marginBottom: 22 }}>
                    Ringkasan sirkulasi keuangan dari iuran Warga dan komisi untuk Courier.
                  </p>
                  
                  <div style={S.statsRow}>
                    <StatCard icon="💵" label="Pemasukan (Iuran)" value={`Rp ${totalPemasukan.toLocaleString('id-ID')}`} sub={`${disetujui} pembayaran disetujui`} accent="#10B981" />
                    <StatCard icon="💸" label="Pengeluaran (Komisi)" value={`Rp ${totalPengeluaran.toLocaleString('id-ID')}`} sub={`${totalPengangkutanSelesai} tugas selesai`} accent="#EF4444" />
                    <StatCard icon="⚖️" label="Saldo Tersisa" value={`Rp ${labaKotor.toLocaleString('id-ID')}`} sub="Laba kotor sistem" accent="#6366F1" />
                  </div>

                  <div style={S.card}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
                      <h3 style={{ margin: 0, fontSize: 15, color: "#1f2937" }}>Detail Aliran Dana</h3>
                    </div>
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>Keterangan</th>
                            <th style={S.th}>Volume</th>
                            <th style={S.th}>Nominal per Unit</th>
                            <th style={S.th}>Total (Rp)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="adm-row">
                            <td style={S.td}>Iuran Bulanan Warga</td>
                            <td style={S.td}>{disetujui} transaksi</td>
                            <td style={S.td}>+ Rp 50.000</td>
                            <td style={{ ...S.td, color: "#10B981", fontWeight: 700 }}>+ Rp {totalPemasukan.toLocaleString('id-ID')}</td>
                          </tr>
                          <tr className="adm-row">
                            <td style={S.td}>Komisi Pengangkutan Courier</td>
                            <td style={S.td}>{totalPengangkutanSelesai} tugas</td>
                            <td style={S.td}>- Rp 10.000</td>
                            <td style={{ ...S.td, color: "#EF4444", fontWeight: 700 }}>- Rp {totalPengeluaran.toLocaleString('id-ID')}</td>
                          </tr>
                          <tr className="adm-row" style={{ backgroundColor: "#f8fafc" }}>
                            <td colSpan="3" style={{ ...S.td, fontWeight: 600, textAlign: "right" }}>Total Saldo (Laba Kotor):</td>
                            <td style={{ ...S.td, fontWeight: 700, fontSize: 16 }}>Rp {labaKotor.toLocaleString('id-ID')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mini Components ── */
function ActionBtn({ color, onClick, children }) {
  return (
    <button
      className="adm-btn"
      onClick={onClick}
      style={{
        background: color, border: "none", padding: "4px 12px",
        borderRadius: 99, color: "#fff", fontSize: 11, fontWeight: 600,
        cursor: "pointer", whiteSpace: "nowrap",
      }}
    >{children}</button>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

/* ─────────────────────────── STYLES ─────────────────────────── */
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
  ghostBtn: { background: "#fff", border: "1px solid #d1d5db", padding: "10px 20px", borderRadius: 8, color: "#374151", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  statsRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 },
  formCard: { background: "#f8f9fa", border: "1px solid #eee", borderRadius: 12, padding: "24px", marginBottom: 24 },
};