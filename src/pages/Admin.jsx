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

const STATUS_COLOR = {
  Pending:   { bg: "#FEF3C7", color: "#92400E" },
  Disetujui: { bg: "#D1FAE5", color: "#065F46" },
  Ditolak:   { bg: "#FEE2E2", color: "#991B1B" },
  Menunggu:  { bg: "#E0F2FE", color: "#075985" },
  Diproses:  { bg: "#EDE9FE", color: "#5B21B6" },
  Selesai:   { bg: "#D1FAE5", color: "#065F46" },
};

const normalizeStatus = (value) => {
  if (value === "proses" || value === "Diproses") return "Diproses";
  if (value === "selesai" || value === "Selesai") return "Selesai";
  return value;
};

function Badge({ status }) {
  const normalized = normalizeStatus(status);
  const s = STATUS_COLOR[normalized] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
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
      supabase.from("warga").select("*").order("created_at", { ascending: false }),
      supabase.from("pembayaran").select("*, warga(nama, alamat)").order("created_at", { ascending: false }),
      supabase.from("sampah").select("*, warga(nama, alamat)").order("created_at", { ascending: false }),
      supabase
        .from("pengangkutan")
        .select("*, warga(nama, alamat, location), transporter:profiles!pengangkutan_transporter_id_fkey(id, nama, role)")
        .order("id", { ascending: false }),
    ]);
    setWarga(w.data || []);
    setPembayaran(p.data || []);
    setSampah(s.data || []);
    setPengangkutan(pg.data || []);
    setLoading(false);
  }

  async function verifikasiPayment(id, status) {
    await supabase.from("pembayaran").update({ status_verifikasi: status }).eq("id", id);
    await fetchData();
  }

  async function hapusWarga(id, nama) {
    if (!confirm(`Hapus warga "${nama}" dan semua datanya?`)) return;
    await supabase.from("warga").delete().eq("id", id);
    await fetchData();
  }

  async function updateStatusSampah(id, status) {
    await supabase.from("sampah").update({ status_pengangkutan: status }).eq("id", id);
    await fetchData();
  }

  async function tambahWarga() {
    if (!formWarga.nama || !formWarga.alamat) return alert("Nama dan alamat wajib diisi");
    setAddingWarga(true);
    const { error } = await supabase.from("warga").insert({
      nama: formWarga.nama,
      alamat: formWarga.alamat,
      no_hp: formWarga.no_hp || null,
    });
    if (error) alert("Gagal menambah warga: " + error.message);
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
  const pending        = pembayaran.filter(p => p.status_verifikasi === "Pending").length;
  const disetujui      = pembayaran.filter(p => p.status_verifikasi === "Disetujui").length;
  const sampahAktif    = sampah.filter(s => s.status_pengangkutan === "Menunggu").length;

  /* Filter pembayaran */
  const filteredBayar = bayarFilter === "Semua"
    ? pembayaran
    : pembayaran.filter(p => p.status_verifikasi === bayarFilter);

  /* Peta data */
  const mapData = warga.map(w => {
    const pay = pembayaran.find(p => p.warga_id === w.id);
    return { ...w, payment_status: pay?.status_verifikasi === "Disetujui" ? "Sudah Bayar" : "Belum Bayar" };
  });

  const TABS = [
    { key: "ringkasan",    label: "📊 Ringkasan" },
    { key: "pembayaran",   label: "✅ Pembayaran" },
    { key: "sampah",       label: "🗑️ Sampah" },
    { key: "warga",        label: "👥 Warga" },
    { key: "transporter",  label: "🚛 Transporter" },
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

      <div style={S.card}>
        {/* ── Header ── */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={S.logoBox}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <h1 style={S.headerTitle}>Admin Dashboard</h1>
              <p style={S.headerSub}>Sistem Informasi Pengolahan Sampah</p>
            </div>
          </div>
          <button style={S.logoutBtn} className="adm-btn" onClick={logout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Keluar
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button
              key={t.key}
              className="adm-tab-btn"
              onClick={() => setActiveTab(t.key)}
              style={{ ...S.tabBtn, ...(activeTab === t.key ? S.tabBtnActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
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
                        >{f} {f === "Semua" ? `(${pembayaran.length})` : `(${pembayaran.filter(p => p.status_verifikasi === f).length})`}</button>
                      ))}
                    </div>
                  </div>
                  {filteredBayar.length === 0 ? (
                    <Empty text="Tidak ada data pembayaran" />
                  ) : (
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr style={{ background: "#f8f8f6" }}>
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
                              <td style={{ ...S.td, fontWeight: 600, color: "#0F6E56" }}>Rp {fmt(p.jumlah)}</td>
                              <td style={S.td}>{fmtDate(p.created_at)}</td>
                              <td style={S.td}><Badge status={p.status_verifikasi} /></td>
                              <td style={S.td}>
                                {p.status_verifikasi === "Pending" ? (
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
                          <tr style={{ background: "#f8f8f6" }}>
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
                                <td style={S.td}><Badge status={s.status_pengangkutan} /></td>
                              <td style={S.td}>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  {s.status_pengangkutan === "Menunggu" && (
                                    <ActionBtn color="#6366F1" onClick={() => updateStatusSampah(s.id, "Diproses")}>▶ Proses</ActionBtn>
                                  )}
                                  {s.status_pengangkutan === "Diproses" && (
                                    <ActionBtn color="#10B981" onClick={() => updateStatusSampah(s.id, "Selesai")}>✓ Selesai</ActionBtn>
                                  )}
                                  {s.status_pengangkutan === "Selesai" && (
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
                          <tr style={{ background: "#f8f8f6" }}>
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
                          <tr style={{ background: "#f8f8f6" }}>
                            <th style={S.th}>No</th>
                            <th style={S.th}>Nama Warga</th>
                            <th style={S.th}>Alamat</th>
                            <th style={S.th}>Transporter</th>
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
            </>
          )}
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
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f0ed 0%, #e8f5f1 100%)",
    fontFamily: "'DM Sans', sans-serif",
    padding: "24px 16px",
  },
  card: {
    maxWidth: 1300,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.10)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 28px",
    background: "linear-gradient(135deg, #0d1f2d 0%, #1a3a2a 100%)",
  },
  logoBox: {
    width: 44, height: 44, borderRadius: 12,
    background: "rgba(29,158,117,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 20, fontWeight: 500, color: "#fff", margin: 0,
  },
  headerSub: {
    fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "2px 0 0",
  },
  logoutBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "8px 16px", borderRadius: 99,
    color: "#fff", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, fontWeight: 500,
    display: "flex", alignItems: "center", gap: 6,
    transition: "all 0.2s",
  },
  tabBar: {
    display: "flex",
    background: "#0d1f2d",
    padding: "0 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    overflowX: "auto",
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    padding: "13px 18px",
    color: "rgba(255,255,255,0.45)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, fontWeight: 500,
    cursor: "pointer", whiteSpace: "nowrap",
    transition: "all 0.2s",
    borderRadius: "8px 8px 0 0",
  },
  tabBtnActive: {
    color: "#1D9E75",
    borderBottomColor: "#1D9E75",
    background: "rgba(29,158,117,0.08)",
    fontWeight: 600,
  },
  content: {
    padding: "28px 28px 36px",
    minHeight: 400,
  },
  statsRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: 700,
    color: "#0d1f2d", margin: "0 0 4px",
    fontFamily: "'DM Sans', sans-serif",
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid #eee",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "11px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
    borderBottom: "1px solid #eee",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: "1px solid #f5f5f5",
    verticalAlign: "middle",
  },
  formCard: {
    background: "#f8fffe",
    border: "1.5px solid #d1fae5",
    borderRadius: 14,
    padding: "20px 22px",
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 11, fontWeight: 600,
    color: "#888", marginBottom: 5,
    letterSpacing: "0.05em", textTransform: "uppercase",
  },
  primaryBtn: {
    background: "#0F6E56",
    border: "none", padding: "9px 18px",
    borderRadius: 99, color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s",
  },
  ghostBtn: {
    background: "transparent",
    border: "1.5px solid #ddd",
    padding: "9px 18px", borderRadius: 99,
    color: "#555", fontFamily: "'DM Sans', sans-serif",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
};