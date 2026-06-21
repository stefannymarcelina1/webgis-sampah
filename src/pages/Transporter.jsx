import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Map, { parseLocation } from "../components/Map";

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
  Menunggu:  { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  Diproses:  { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  Selesai:   { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  proses:    { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  selesai:   { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
};

function Badge({ status }) {
  const label = status === "proses" ? "Diproses" : status === "selesai" ? "Selesai" : status;
  const s = STATUS_COLOR[status] || { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
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

export default function Transporter() {
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

    const [resBaru, resAktif, resSelesai, resWarga, resSampah] = await Promise.all([
      // Semua request sampah yang menunggu (dari semua warga)
      supabase
        .from("sampah")
        .select("*, warga(id, nama, alamat, no_hp, location)")
        .eq("status_pengangkutan", "Menunggu")
        .order("created_at", { ascending: true }),

      // Tugas aktif saya (pengangkutan yang saya ambil, status proses)
      supabase
        .from("pengangkutan")
        .select("*, warga(id, nama, alamat, no_hp, location)")
        .eq("transporter_id", id)
        .eq("status", "proses")
        .order("id", { ascending: false }),

      // Riwayat selesai saya
      supabase
        .from("pengangkutan")
        .select("*, warga(id, nama, alamat, location)")
        .eq("transporter_id", id)
        .eq("status", "selesai")
        .order("id", { ascending: false }),

      // Semua warga untuk peta
      supabase
        .from("warga")
        .select("*, pembayaran(status_verifikasi)"),

      // Semua sampah yang sedang diproses atau selesai untuk detail
      supabase
        .from("sampah")
        .select("*")
        .in("status_pengangkutan", ["Diproses", "Selesai"]),
    ]);

    setTugasBaru(resBaru.data || []);
    setTugasAktif(resAktif.data || []);
    setRiwayat(resSelesai.data || []);
    setSemuaWarga(resWarga.data || []);
    setSampahDiproses(resSampah.data || []);
    setLoading(false);
  }

  /* Ambil tugas: update sampah status → Diproses + insert pengangkutan */
  async function ambilTugas(sampah) {
    if (!myId) return;
    setActionLoading(sampah.id);
    try {
      // 1. Update status sampah → Diproses
      await supabase
        .from("sampah")
        .update({ status_pengangkutan: "Diproses" })
        .eq("id", sampah.id);

      // 2. Insert record pengangkutan
      await supabase.from("pengangkutan").insert({
        warga_id: sampah.warga_id,
        transporter_id: myId,
        status: "proses",
      });

      await fetchAll(myId);
      setActiveTab("aktif");
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil tugas: " + err.message);
    }
    setActionLoading(null);
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
      await supabase
        .from("sampah")
        .update({ status_pengangkutan: "Selesai" })
        .eq("warga_id", pengangkutan.warga_id)
        .eq("status_pengangkutan", "Diproses");

      await fetchAll(myId);
    } catch (err) {
      console.error(err);
      alert("Gagal menyelesaikan tugas: " + err.message);
    }
    setActionLoading(null);
  }

  const openRoute = (loc) => {
    const p = parseLocation(loc);
    if (p) window.open(`https://www.google.com/maps?q=${p.lat},${p.lng}`, "_blank");
    else alert("Lokasi warga belum diatur");
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

      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={S.logoBox}>🚛</div>
            <div>
              <h1 style={S.headerTitle}>Dashboard Transporter</h1>
              <p style={S.headerSub}>Sistem Pengangkutan Sampah</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {totalTersedia > 0 && (
              <div style={{ background: "rgba(239,68,68,0.2)", border: "1px solid #EF4444", color: "#FCA5A5", padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600 }} className="pulse">
                🔔 {totalTersedia} tugas menunggu
              </div>
            )}
            <button style={S.logoutBtn} className="t-btn" onClick={logout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Keluar
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t.key} className="t-tab"
              onClick={() => setActiveTab(t.key)}
              style={{ ...S.tabBtn, ...(activeTab === t.key ? S.tabActive : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
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
                  <h2 style={S.sectionTitle}>Selamat Datang, Transporter! 👋</h2>
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
                      <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Request sampah dari warga yang belum diambil transporter manapun.</p>
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
                                <Badge status={s.status_pengangkutan} />
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
                        const items = sampahDiproses.filter(s => s.warga_id === pg.warga_id && s.status_pengangkutan === "Diproses");
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
                            const items = sampahDiproses.filter(s => s.warga_id === pg.warga_id && s.status_pengangkutan === "Selesai");
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
  );
}

/* ─── Styles ─── */
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f0ed 0%, #e8edf5 100%)",
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
    background: "linear-gradient(135deg, #0d1f2d 0%, #1e3a5f 100%)",
  },
  logoBox: {
    width: 44, height: 44, borderRadius: 12,
    background: "rgba(59,130,246,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
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
  tabActive: { color: "#60A5FA", borderBottomColor: "#60A5FA", background: "rgba(96,165,250,0.08)", fontWeight: 600 },
  content: { padding: "24px 28px 36px" },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "#0d1f2d", margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" },
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
    color: "#555", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  },
};