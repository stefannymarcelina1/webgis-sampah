import Swal from 'sweetalert2';
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Map, { parseLocation } from "../components/Map";
import { getSampahStatus, updateSampahStatus } from "../lib/sampah";

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

const STATUS_COLOR = {
  Menunggu:  { bg: "#fffbe6", color: "#d48806", border: "#ffe58f" },
  Diproses:  { bg: "#e6f7ff", color: "#0958d9", border: "#91caff" },
  Selesai:   { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  proses:    { bg: "#e6f7ff", color: "#0958d9", border: "#91caff" },
  selesai:   { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
};

const normalizeTransportStatus = (value) => {
  if (value === "proses" || value === "Diproses") return "Diproses";
  if (value === "selesai" || value === "Selesai") return "Selesai";
  return value;
};

function Badge({ status }) {
  const label = normalizeTransportStatus(status) || status;
  const s = STATUS_COLOR[label] || STATUS_COLOR[status] || { bg: "#fff", color: "#888", border: "#ddd" };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: "4px 12px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
      letterSpacing: "0.2px"
    }}>{label}</span>
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

export default function Courier() {
  const [myId, setMyId] = useState(null);
  const [activeTab, setActiveTab] = useState("beranda");
  const [loading, setLoading] = useState(true);

  // Data state
  const [tugasBaru, setTugasBaru]   = useState([]); // sampah Menunggu (semua warga)
  const [tugasAktif, setTugasAktif] = useState([]); // pengangkutan milik saya (proses)
  const [riwayat, setRiwayat]       = useState([]); // pengangkutan selesai
  const [semuaWarga, setSemuaWarga] = useState([]); // untuk peta
  const [sampahDiproses, setSampahDiproses] = useState([]); // detail sampah diproses & selesai

  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setMyId(user.id);
        fetchAll(user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.href = "/";
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function fetchAll(tid) {
    setLoading(true);
    const id = tid || myId;

    const [resAktif, resSelesai, resWarga, resSampah, resPengangkutan] = await Promise.all([
      // Dummy to keep array size same
      Promise.resolve({data: []}),
      Promise.resolve({data: []}),

      // Semua warga untuk peta
      supabase.from("warga").select("*"),

      // Semua sampah untuk detail status
      supabase.from("sampah").select("*"),

      // Semua pengangkutan
      supabase.from("pengangkutan").select("*")
    ]);

    const wargaData = resWarga.data || [];
    const wargaById = Object.fromEntries(wargaData.map((item) => [item.id, item]));
    const semuaSampah = resSampah.data || [];
    const pengangkutanData = resPengangkutan.data || [];

    const aktifData = pengangkutanData.filter(p => p.transporter_id === id && ["proses", "Diproses"].includes(p.status));
    const selesaiData = pengangkutanData.filter(p => p.transporter_id === id && ["selesai", "Selesai"].includes(p.status));

    // MENGHILANGKAN FILTER UNTUK DEBUGGING - TAMPILKAN SEMUA SAMPAH!
    const tugasBaruData = semuaSampah; // .filter((item) => getSampahStatus(item) === "Menunggu");
    const sampahDiprosesData = semuaSampah; // .filter((item) => ["Diproses", "Selesai"].includes(getSampahStatus(item)));

    window.myDebugData = `Sampah: ${semuaSampah.length}`;
    console.log("Semua sampah: ", semuaSampah);
    console.log("Tugas baru: ", tugasBaruData);

    window.myDebugData = `Sampah: ${semuaSampah.length}, Status 1st: ${semuaSampah[0]?.status}, getStatus: ${getSampahStatus(semuaSampah[0])}`;

    setTugasBaru(tugasBaruData.map((item) => ({ ...item, status: getSampahStatus(item), warga: wargaById[item.warga_id] || null })));
    setTugasAktif(aktifData.map((item) => ({ ...item, warga: wargaById[item.warga_id] || null })));
    setRiwayat(selesaiData.map((item) => ({ ...item, warga: wargaById[item.warga_id] || null })));
    setSemuaWarga(wargaData);
    setSampahDiproses(sampahDiprosesData.map((item) => ({ ...item, status: getSampahStatus(item), warga: wargaById[item.warga_id] || null })));
    setLoading(false);
  }

  /* Ambil tugas: insert pengangkutan -> JIKA SUKSES -> update sampah status */
  async function ambilTugas(sampah) {
    if (!myId) return;
    setActionLoading(sampah.id);
    try {
      // 1. Insert record pengangkutan
      const { error: errInsert } = await supabase.from("pengangkutan").insert({
        warga_id: sampah.warga_id,
        transporter_id: myId,
        status: "proses",
      });

      if (errInsert) {
        throw new Error("Gagal insert pengangkutan: " + errInsert.message);
      }

      // 2. Update status sampah → Diproses HANYA jika insert sukses
      const { error: errUpdate } = await updateSampahStatus(supabase, sampah.id, "Diproses");
      if (errUpdate) {
        throw new Error("Gagal update status sampah: " + errUpdate.message);
      }

      await fetchAll(myId);
      setActiveTab("aktif");
    } catch (err) {
      console.error(err);
      Swal.fire(err.message);
    }
    setActionLoading(null);
  }

  async function resetStuckTasks() {
    await supabase.from("sampah").update({ status: "Menunggu" }).eq("status", "Diproses");
    await fetchAll(myId);
    Swal.fire("Berhasil mereset tugas yang stuck ke Menunggu!");
  }

  /* Selesaikan tugas: update pengangkutan → selesai + update sampah → Selesai */
  async function selesaikanTugas(pengangkutan) {
    setActionLoading(pengangkutan.id);
    try {
      // 1. Update pengangkutan → selesai
      await supabase
        .from("pengangkutan")
        .update({ status: "selesai" })
        .eq("id", pengangkutan.id)
        .eq("transporter_id", myId);

      // 2. Update sampah → Selesai (semua sampah Diproses dari warga ini)
      const { data: sampahRows } = await supabase.from("sampah").select("id").eq("warga_id", pengangkutan.warga_id);
      for (const row of sampahRows || []) {
        const { error: updateError } = await updateSampahStatus(supabase, row.id, "Selesai");
        if (updateError) {
          console.error("Gagal mengubah status sampah selesai:", updateError);
        }
      }

      await fetchAll(myId);
    } catch (err) {
      console.error(err);
      Swal.fire("Gagal menyelesaikan tugas: " + err.message);
    }
    setActionLoading(null);
  }

  const openRoute = (loc) => {
    const p = parseLocation(loc);
    if (p) window.open(`https://www.google.com/maps?q=${p.lat},${p.lng}`, "_blank");
    else Swal.fire("Lokasi warga belum diatur");
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  /* Statistik */
  const totalTersedia  = tugasBaru.length;
  const totalAktif     = tugasAktif.length;
  const totalSelesai   = riwayat.length;
  const totalSemua     = totalAktif + totalSelesai;

  /* Map data: warga dengan request menunggu */
  const mapData = semuaWarga.map(w => {
    const pay = w.pembayaran?.[0];
    return { ...w, payment_status: pay?.status_verifikasi === "Disetujui" ? "Sudah Bayar" : "Belum Bayar" };
  });

  const TABS = [
    { key: "beranda", label: "📊 Beranda" },
    { key: "baru",    label: `📋 Tugas Baru${totalTersedia > 0 ? ` (${totalTersedia})` : ""}` },
    { key: "aktif",   label: `🔄 Aktif${totalAktif > 0 ? ` (${totalAktif})` : ""}` },
    { key: "riwayat", label: "✅ Riwayat" },
    { key: "pendapatan", label: "💰 Pendapatan" },
    { key: "peta",    label: "🗺️ Peta" },
  ];

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; }
        .t-tab:hover { background: rgba(255,255,255,0.1) !important; }
        .t-row:hover td { background: #f8fffe !important; }
        .t-btn:hover { opacity: 0.85; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fadeUp { animation: fadeUp 0.3s ease both; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulse { animation: pulse 1.5s ease infinite; }
      `}</style>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <div style={S.logoIcon}>T</div>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333", lineHeight: 1.1 }}>Courier</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Petugas Courier</div>
            </div>
            <div style={S.avatarSmall}>T</div>
            <button onClick={logout} style={S.btnOutlineSmall}>Logout</button>
          </div>
        </div>

        {/* Content */}
        <div style={S.contentWrapper}>
          <h1 style={S.pageTitle}>{TABS.find(t => t.key === activeTab)?.label?.replace(/[^a-zA-Z0-9\s()]/g, '') || "Dashboard"}</h1>
          
          <div style={S.content}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <div>Memuat data...</div>
            </div>
          ) : (
            <>
              {/* ═══ BERANDA ═══ */}
              {activeTab === "beranda" && (
                <div className="fadeUp">
                  <h2 style={S.sectionTitle}>Selamat Datang, Courier! 👋</h2>
                  <p style={{ color: "#888", fontSize: 13, marginTop: -6, marginBottom: 22 }}>
                    Monitor dan kelola semua tugas pengangkutan sampah dari dashboard ini.
                  </p>

                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
                    <StatCard icon="📋" label="Tugas Tersedia" value={totalTersedia} accent="#3B82F6" sub="Menunggu diambil" />
                    <StatCard icon="🔄" label="Tugas Aktif" value={totalAktif} accent="#F59E0B" sub="Sedang diproses" />
                    <StatCard icon="✅" label="Tugas Selesai" value={totalSelesai} accent="#10B981" sub="Sudah selesai" />
                    <StatCard icon="📦" label="Total Tugas" value={totalSemua} accent="#6366F1" sub="Semua waktu" />
                  </div>

                  {/* Peringatan tugas menunggu */}
                  {totalTersedia > 0 && (
                    <div style={{ background: "#FEF3C7", border: "1.5px solid #FCD34D", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#92400E", fontSize: 14 }}>⚠️ Ada {totalTersedia} tugas pengangkutan menunggu!</div>
                        <div style={{ color: "#B45309", fontSize: 12, marginTop: 4 }}>Segera ambil tugas agar warga mendapatkan layanan terbaik.</div>
                      </div>
                      <button style={{ ...S.primaryBtn, background: "#D97706" }} className="t-btn" onClick={() => setActiveTab("baru")}>
                        Lihat Tugas →
                      </button>
                    </div>
                  )}

                  {/* Tugas aktif summary */}
                  {totalAktif > 0 && (
                    <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#1D4ED8", fontSize: 14 }}>🚛 {totalAktif} tugas sedang berjalan</div>
                        <div style={{ color: "#3B82F6", fontSize: 12, marginTop: 4 }}>Update status ketika pengangkutan selesai.</div>
                      </div>
                      <button style={{ ...S.primaryBtn, background: "#2563EB" }} className="t-btn" onClick={() => setActiveTab("aktif")}>
                        Kelola Tugas →
                      </button>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button style={S.primaryBtn} className="t-btn" onClick={() => setActiveTab("baru")}>📋 Tugas Baru</button>
                    <button style={S.outlineBtn} className="t-btn" onClick={() => setActiveTab("peta")}>🗺️ Lihat Peta</button>
                    <button style={S.outlineBtn} className="t-btn" onClick={() => fetchAll(myId)}>🔄 Refresh Data</button>
                  </div>
                </div>
              )}

              {/* ═══ TUGAS BARU ═══ */}
              {activeTab === "baru" && (
                <div className="fadeUp">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <h2 style={S.sectionTitle}>Tugas Pengangkutan Tersedia</h2>
                      <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Request sampah dari warga yang belum diambil courier manapun.</p>
                    </div>
                    <button style={S.outlineBtn} className="t-btn" onClick={() => fetchAll(myId)}>🔄 Refresh</button>
                  </div>

                  {tugasBaru.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc" }}>
                      <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#888" }}>Tidak ada tugas baru!</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>Semua request sampah sudah diambil.</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {tugasBaru.map((s) => {
                        const pos = parseLocation(s.warga?.location);
                        return (
                          <div key={s.id} style={{
                            background: "#fff", border: "1.5px solid #e5e7eb",
                            borderRadius: 14, padding: "16px 20px",
                            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                            gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                            transition: "border-color 0.2s",
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: "#0d1f2d" }}>{s.warga?.nama || "Warga"}</span>
                                <Badge status={s.status} />
                              </div>
                              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                                📍 {s.warga?.alamat || "Alamat tidak tersedia"}
                              </div>
                              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                                <span>🗑️ <strong>{parseJenisAndCatatan(s.jenis).jenis}</strong></span>
                                <span>⚖️ <strong>{s.berat} kg</strong></span>
                                <span>🕐 {fmtDate(s.created_at)}</span>
                              </div>
                              {parseJenisAndCatatan(s.jenis).catatan && (
                                <div style={{ marginTop: 8, background: "#f9fafb", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#666" }}>
                                  💬 {parseJenisAndCatatan(s.jenis).catatan}
                                </div>
                              )}
                              {!pos && (
                                <div style={{ marginTop: 8, fontSize: 11, color: "#EF4444", background: "#FEF2F2", padding: "4px 8px", borderRadius: 6, display: "inline-block" }}>
                                  ⚠️ Lokasi belum diatur
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                              <button
                                style={{ ...S.primaryBtn, fontSize: 12, padding: "8px 14px", opacity: actionLoading === s.id ? 0.6 : 1 }}
                                className="t-btn"
                                disabled={actionLoading === s.id}
                                onClick={() => ambilTugas(s)}
                              >
                                {actionLoading === s.id ? "⏳ Memproses..." : "✋ Ambil Tugas"}
                              </button>
                              {pos && (
                                <button
                                  style={{ ...S.outlineBtn, fontSize: 12, padding: "7px 14px" }}
                                  className="t-btn"
                                  onClick={() => openRoute(s.warga?.location)}
                                >
                                  🗺️ Rute
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TUGAS AKTIF ═══ */}
              {activeTab === "aktif" && (
                <div className="fadeUp">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <h2 style={S.sectionTitle}>Tugas Aktif Saya</h2>
                      <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Tugas pengangkutan yang sedang Anda proses. Klik "Selesai" setelah pengangkutan selesai.</p>
                    </div>
                    <button style={S.outlineBtn} className="t-btn" onClick={() => fetchAll(myId)}>🔄 Refresh</button>
                  </div>

                  {tugasAktif.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc" }}>
                      <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#888" }}>Tidak ada tugas aktif</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>Ambil tugas baru dari tab "Tugas Baru".</div>
                      <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={() => setActiveTab("baru")}>Lihat Tugas Baru</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {tugasAktif.map((pg) => {
                        const pos = parseLocation(pg.warga?.location);
                        const items = sampahDiproses.filter(s => s.warga_id === pg.warga_id && s.status === "Diproses");
                        return (
                          <div key={pg.id} style={{
                            background: "#FFFBEB", border: "1.5px solid #FCD34D",
                            borderRadius: 14, padding: "16px 20px",
                            display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: "#0d1f2d" }}>{pg.warga?.nama || "Warga"}</span>
                                <Badge status="proses" />
                              </div>
                              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                                📍 {pg.warga?.alamat || "Alamat tidak tersedia"}
                              </div>
                              {pg.warga?.no_hp && (
                                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                                  📱 {pg.warga.no_hp}
                                </div>
                              )}
                              {items.length > 0 && (
                                <div style={{ marginTop: 8, background: "rgba(245, 158, 11, 0.03)", borderRadius: 8, padding: "8px 12px", border: "1px dashed #FCD34D", display: "flex", flexDirection: "column", gap: 6 }}>
                                  {items.map(item => {
                                    const info = parseJenisAndCatatan(item.jenis);
                                    return (
                                      <div key={item.id} style={{ fontSize: 12, color: "#555" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                          <span>🗑️ <strong>{info.jenis}</strong></span>
                                          <span>⚖️ {item.berat} kg</span>
                                        </div>
                                        {info.catatan && (
                                          <div style={{ fontSize: 11, color: "#888", fontStyle: "italic", marginTop: 2 }}>
                                            💬 {info.catatan}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <div style={{ fontSize: 11, color: "#B45309", marginTop: 8 }}>
                                🕐 Request: {items[0] ? fmtDate(items[0].created_at) : "-"}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                              <button
                                style={{ ...S.primaryBtn, background: "#10B981", fontSize: 12, padding: "8px 14px", opacity: actionLoading === pg.id ? 0.6 : 1 }}
                                className="t-btn"
                                disabled={actionLoading === pg.id}
                                onClick={() => selesaikanTugas(pg)}
                              >
                                {actionLoading === pg.id ? "⏳ Memproses..." : "✅ Tandai Selesai"}
                              </button>
                              <button
                                style={{ ...S.outlineBtn, fontSize: 12, padding: "7px 14px" }}
                                className="t-btn"
                                onClick={() => openRoute(pg.warga?.location)}
                              >
                                🗺️ Buka Rute
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ RIWAYAT ═══ */}
              {activeTab === "riwayat" && (
                <div className="fadeUp">
                  <h2 style={S.sectionTitle}>Riwayat Pengangkutan Selesai</h2>

                  {riwayat.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc" }}>
                      <div style={{ fontSize: 48, marginBottom: 10 }}>📋</div>
                      <div>Belum ada pengangkutan yang selesai</div>
                    </div>
                  ) : (
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr style={{ background: "#f8f8f6" }}>
                            <th style={S.th}>No</th>
                            <th style={S.th}>Nama Warga</th>
                            <th style={S.th}>Alamat</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Tanggal Diambil</th>
                            <th style={S.th}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riwayat.map((pg, i) => {
                            const items = sampahDiproses.filter(s => s.warga_id === pg.warga_id && s.status === "Selesai");
                            return (
                              <tr key={pg.id} className="t-row">
                                <td style={{ ...S.td, color: "#bbb", width: 36 }}>{i + 1}</td>
                                <td style={{ ...S.td, fontWeight: 600 }}>
                                  <div>{pg.warga?.nama || "-"}</div>
                                  {items.length > 0 && (
                                    <div style={{ fontSize: 11, color: "#888", fontWeight: 400, marginTop: 4 }}>
                                      {items.map((item, idx) => {
                                        const info = parseJenisAndCatatan(item.jenis);
                                        return (
                                          <span key={item.id}>
                                            {idx > 0 && ", "}{info.jenis} ({item.berat}kg)
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                                <td style={{ ...S.td, color: "#666", maxWidth: 200 }}>{pg.warga?.alamat || "-"}</td>
                                <td style={S.td}><Badge status={pg.status} /></td>
                                <td style={{ ...S.td, fontSize: 12, color: "#666" }}>{items[0] ? fmtDate(items[0].created_at) : "-"}</td>
                                <td style={S.td}>
                                  <button style={{ ...S.outlineBtn, fontSize: 11, padding: "4px 10px" }} className="t-btn"
                                    onClick={() => openRoute(pg.warga?.location)}>
                                    🗺️ Rute
                                  </button>
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

              {/* ═══ PENDAPATAN ═══ */}
              {activeTab === "pendapatan" && (
                <div className="fadeUp">
                  <h2 style={S.sectionTitle}>Pendapatan & Komisi</h2>
                  <p style={{ color: "#888", fontSize: 13, marginTop: -6, marginBottom: 22 }}>
                    Kamu mendapatkan Rp 10.000 untuk setiap pengangkutan sampah yang berhasil diselesaikan.
                  </p>
                  
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
                    <StatCard icon="💰" label="Total Pendapatan" value={`Rp ${(totalSelesai * 10000).toLocaleString('id-ID')}`} accent="#10B981" sub="Dari tugas selesai" />
                    <StatCard icon="✅" label="Tugas Diselesaikan" value={totalSelesai} accent="#6366F1" sub="Total pengangkutan" />
                  </div>

                  <div style={S.card}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
                      <h3 style={{ margin: 0, fontSize: 15, color: "#1f2937" }}>Riwayat Komisi</h3>
                    </div>
                    <div style={S.tableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>No</th>
                            <th style={S.th}>Tanggal Selesai</th>
                            <th style={S.th}>Warga</th>
                            <th style={S.th}>Pendapatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riwayat.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: "center", padding: "40px", color: "#888" }}>Belum ada pendapatan.</td></tr>
                          ) : (
                            riwayat.map((pg, i) => (
                              <tr key={pg.id} className="t-row">
                                <td style={{ ...S.td, color: "#bbb", width: 36 }}>{i + 1}</td>
                                <td style={S.td}>{fmtDate(pg.created_at)}</td>
                                <td style={{ ...S.td, fontWeight: 600 }}>{pg.warga?.nama || "Unknown"}</td>
                                <td style={{ ...S.td, color: "#10B981", fontWeight: 700 }}>+ Rp 10.000</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ PETA ═══ */}
              {activeTab === "peta" && (
                <div className="fadeUp">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h2 style={S.sectionTitle}>Peta Sebaran Warga</h2>
                      <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Semua warga terdaftar. Klik marker untuk melihat detail.</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} /> Sudah Bayar
                      </div>
                      <div style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} /> Belum Bayar
                      </div>
                    </div>
                  </div>
                  <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                    <Map data={mapData} height="460px" />
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
  outlineBtn: { background: "#fff", border: "1px solid #d1d5db", padding: "10px 20px", borderRadius: 8, color: "#374151", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
};