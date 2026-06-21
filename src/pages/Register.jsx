import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    nama: "",
    email: "",
    password: "",
    alamat: "",
    role: "warga",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthColor = ["#e5e5e3", "#E24B4A", "#EF9F27", "#1D9E75"];
  const strengthLabel = ["", "Lemah", "Sedang", "Kuat"];
  const strength = getPasswordStrength(form.password);

  const handleRegister = async () => {
    if (!form.nama || !form.email || !form.password || !form.alamat) {
      return alert("Harap isi semua kolom.");
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    // Simpan ke tabel profiles
    const { error: pError } = await supabase.from("profiles").insert([
      {
        id: data.user.id,
        nama: form.nama,
        role: form.role,
      },
    ]);

    if (pError) {
      setLoading(false);
      return alert("Gagal simpan profil: " + pError.message);
    }

    // Jika role warga → simpan ke tabel warga
    if (form.role === "warga") {
      const { error: wargaError } = await supabase.from("warga").insert([
        {
          user_id: data.user.id,
          nama: form.nama,
          alamat: form.alamat,
        },
      ]);

      if (wargaError) {
        setLoading(false);
        return alert("Gagal simpan data warga: " + wargaError.message);
      }
    }

    setLoading(false);
    alert("Berhasil! Silakan login.");
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Left Panel */}
        <div style={styles.leftPanel}>
          <div style={styles.leftTop}>
            <div style={styles.logoMark}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="rgba(255,255,255,0.12)" />
                <path d="M7 14C7 10.134 10.134 7 14 7C17.866 7 21 10.134 21 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="18" r="3" fill="white" />
              </svg>
            </div>
            <h1 style={styles.leftTitle}>Sistem Informasi<br />Pengolahan Sampah</h1>
            <div style={styles.accentLine} />
          </div>
          <div style={styles.leftBottom}>
            <p style={styles.leftTagline}>
              Bergabunglah dengan ribuan warga yang telah menggunakan layanan digital kami.
            </p>
            <div style={styles.dotsRow}>
              <div style={styles.dot} />
              <div style={styles.dot} />
              <div style={{ ...styles.dot, ...styles.dotActive }} />
            </div>
          </div>
          <div style={styles.circle1} />
          <div style={styles.circle2} />
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.tabRow}>
            <Link to="/login" style={{ ...styles.tab, textDecoration: "none" }}>Masuk</Link>
            <button style={{ ...styles.tab, ...styles.tabActive }}>Daftar</button>
          </div>

          <h2 style={styles.formTitle}>Buat akun baru</h2>
          <p style={styles.formSub}>Isi data diri Anda untuk mendaftar sebagai warga.</p>

          {/* Nama */}
          <div style={styles.field}>
            <label style={styles.label}>Nama Lengkap</label>
            <input
              type="text"
              placeholder="Nama sesuai KTP"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, styles.input)}
            />
          </div>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>Alamat Email</label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, styles.input)}
            />
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>Kata Sandi</label>
            <div style={styles.pwdWrap}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 karakter"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ ...styles.input, paddingRight: 42 }}
                onFocus={(e) => Object.assign(e.target.style, { ...styles.inputFocus, paddingRight: "42px" })}
                onBlur={(e) => Object.assign(e.target.style, { ...styles.input, paddingRight: "42px" })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                aria-label="Toggle password"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {/* Strength Bar */}
            {form.password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3].map((seg) => (
                    <div
                      key={seg}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background: strength >= seg ? strengthColor[strength] : "#e5e5e3",
                        transition: "background 0.3s",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strengthColor[strength], fontFamily: "'DM Sans', sans-serif" }}>
                  {strengthLabel[strength]}
                </span>
              </div>
            )}
          </div>

          {/* Alamat */}
          <div style={styles.field}>
            <label style={styles.label}>Alamat</label>
            <input
              type="text"
              placeholder="Masukkan alamat lengkap"
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, styles.input)}
            />
          </div>

          {/* Role */}
          <div style={styles.field}>
            <label style={styles.label}>Peran</label>
            <div style={{ position: "relative" }}>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={styles.select}
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, styles.select)}
              >
                <option value="warga">Warga</option>
                <option value="transporter">Transporter</option>
                <option value="admin">Admin</option>
              </select>
              <svg
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="12" height="8" viewBox="0 0 12 8" fill="none"
              >
                <path d="M1 1l5 5 5-5" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
            onMouseEnter={(e) => !loading && (e.target.style.background = "#1D9E75")}
            onMouseLeave={(e) => !loading && (e.target.style.background = "#0F6E56")}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                </svg>
                Memproses...
              </span>
            ) : "Buat Akun"}
          </button>

          <p style={styles.switchText}>
            Sudah punya akun?{" "}
            <Link to="/login" style={styles.switchLink}>Masuk di sini</Link>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        body { margin: 0; font-family: 'DM Sans', sans-serif; }
        input::placeholder { color: #aaa; }
        input:focus, select:focus { outline: none; }
        select { appearance: none; -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f0ed",
    padding: "24px 16px",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    display: "flex",
    width: "100%",
    maxWidth: 860,
    minHeight: 580,
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
    animation: "fadeUp 0.5s ease both",
  },
  leftPanel: {
    width: 260,
    flexShrink: 0,
    background: "#0d1f2d",
    padding: "44px 32px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  leftTop: { position: "relative", zIndex: 2 },
  logoMark: { marginBottom: 20 },
  leftTitle: {
    fontFamily: "'Playfair Display', serif",
    color: "#fff",
    fontSize: 22,
    lineHeight: 1.4,
    fontWeight: 400,
    margin: 0,
  },
  accentLine: {
    width: 36,
    height: 3,
    background: "#1D9E75",
    borderRadius: 2,
    marginTop: 14,
  },
  leftBottom: { position: "relative", zIndex: 2 },
  leftTagline: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    lineHeight: 1.7,
    margin: "0 0 16px",
  },
  dotsRow: { display: "flex", gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
  },
  dotActive: { background: "#1D9E75" },
  circle1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: "50%",
    background: "rgba(29,158,117,0.15)",
    zIndex: 1,
  },
  circle2: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "rgba(29,158,117,0.08)",
    zIndex: 1,
  },
  rightPanel: {
    flex: 1,
    background: "#fff",
    padding: "44px 48px",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  tabRow: {
    display: "flex",
    gap: 0,
    borderBottom: "0.5px solid #e5e5e3",
    marginBottom: 32,
  },
  tab: {
    background: "none",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    marginBottom: -0.5,
    padding: "0 0 14px",
    marginRight: 28,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: "#888",
    cursor: "pointer",
    fontWeight: 400,
  },
  tabActive: {
    color: "#111",
    fontWeight: 500,
    borderBottomColor: "#1D9E75",
  },
  formTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26,
    fontWeight: 400,
    color: "#111",
    margin: "0 0 6px",
  },
  formSub: {
    fontSize: 13,
    color: "#888",
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  field: { marginBottom: 14 },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    color: "#888",
    marginBottom: 6,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: "0.5px solid #ddd",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: "#111",
    background: "#fafaf8",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
    outline: "none",
  },
  inputFocus: {
    width: "100%",
    padding: "11px 14px",
    border: "0.5px solid #1D9E75",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: "#111",
    background: "#fff",
    boxShadow: "0 0 0 3px rgba(29,158,117,0.12)",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "11px 14px",
    border: "0.5px solid #ddd",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: "#111",
    background: "#fafaf8",
    boxSizing: "border-box",
    outline: "none",
    cursor: "pointer",
    paddingRight: 36,
  },
  pwdWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    padding: 0,
  },
  btnPrimary: {
    width: "100%",
    padding: 13,
    background: "#0F6E56",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    color: "#fff",
    cursor: "pointer",
    transition: "background 0.2s",
    letterSpacing: "0.02em",
    marginTop: 8,
  },
  switchText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#888",
    fontFamily: "'DM Sans', sans-serif",
  },
  switchLink: {
    color: "#1D9E75",
    fontWeight: 500,
    textDecoration: "none",
  },
};