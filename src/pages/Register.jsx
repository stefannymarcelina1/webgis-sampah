import Swal from 'sweetalert2';
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

  const strengthColor = ["#e2e8f0", "#E24B4A", "#EF9F27", "#35b09e"];
  const strengthLabel = ["", "Lemah", "Sedang", "Kuat"];
  const strength = getPasswordStrength(form.password);

  const handleRegister = async () => {
    if (!form.nama || !form.email || !form.password || !form.alamat) {
      return Swal.fire({
        icon: 'warning',
        title: 'Input Tidak Lengkap',
        text: 'Harap isi semua kolom data diri Anda.',
        confirmButtonColor: '#35b09e'
      });
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setLoading(false);
      return Swal.fire({
        icon: 'error',
        title: 'Registrasi Gagal',
        text: error.message,
        confirmButtonColor: '#35b09e'
      });
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
      return Swal.fire({
        icon: 'error',
        title: 'Registrasi Gagal',
        text: "Gagal simpan profil: " + pError.message,
        confirmButtonColor: '#35b09e'
      });
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
        return Swal.fire({
          icon: 'error',
          title: 'Registrasi Gagal',
          text: "Gagal simpan data warga: " + wargaError.message,
          confirmButtonColor: '#35b09e'
        });
      }
    }

    setLoading(false);
    Swal.fire({
      icon: 'success',
      title: 'Pendaftaran Berhasil!',
      text: 'Akun Anda berhasil dibuat. Silakan login.',
      confirmButtonColor: '#35b09e'
    });
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      {/* Decorative Yellow Circle */}
      <div style={styles.yellowCircle} />
      
      {/* Decorative Red/Coral Triangle */}
      <div style={styles.redTriangle} />

      <div style={styles.card} className="auth-card">
        {/* Left Panel (Teal Accent Panel) */}
        <div style={styles.leftPanel}>
          <div style={styles.logoContainer}>
            <span style={styles.logoIcon}>♻️</span>
            <span style={styles.logoText}>WebGIS Sampah</span>
          </div>
          
          <div style={styles.leftContent}>
            <h1 style={styles.leftTitle}>Welcome Back!</h1>
            <p style={styles.leftSubtext}>
              Tetap terhubung dengan kami, silakan masuk dengan informasi pribadi Anda.
            </p>
            <Link to="/login" style={styles.outlineBtn}>
              MASUK
            </Link>
          </div>
          
          {/* Subtle background graphics in the left panel */}
          <div style={styles.leftBgCircle1} />
          <div style={styles.leftBgCircle2} />
        </div>

        {/* Right Panel (Form Panel) - scrollable on smaller heights */}
        <div style={styles.rightPanel}>
          <h2 style={styles.formTitle}>Create Account</h2>
          
          {/* Social Logins */}
          <div style={styles.socialRow}>
            <button type="button" style={styles.socialIcon} onClick={() => Swal.fire({ text: 'Pendaftaran Facebook belum tersedia', confirmButtonColor: '#35b09e' })}>f</button>
            <button type="button" style={styles.socialIcon} onClick={() => Swal.fire({ text: 'Pendaftaran Google belum tersedia', confirmButtonColor: '#35b09e' })}>G+</button>
            <button type="button" style={styles.socialIcon} onClick={() => Swal.fire({ text: 'Pendaftaran LinkedIn belum tersedia', confirmButtonColor: '#35b09e' })}>in</button>
          </div>
          
          <p style={styles.formSubtext}>atau gunakan email Anda untuk pendaftaran:</p>

          <div style={styles.form}>
            {/* Nama Field */}
            <div style={styles.inputGroup}>
              <span style={styles.fieldIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="text"
                required
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama Lengkap"
                style={styles.input}
              />
            </div>

            {/* Email Field */}
            <div style={styles.inputGroup}>
              <span style={styles.fieldIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                style={styles.input}
              />
            </div>

            {/* Password Field */}
            <div style={styles.inputGroup}>
              <span style={styles.fieldIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                aria-label="Toggle password"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {form.password.length > 0 && (
              <div style={{ padding: "0 4px 10px 4px", marginTop: -6 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 2 }}>
                  {[1, 2, 3].map((seg) => (
                    <div
                      key={seg}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background: strength >= seg ? strengthColor[strength] : "#e2e8f0",
                        transition: "background 0.3s",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 10, color: strengthColor[strength], fontWeight: 600 }}>
                  Kekuatan Kata Sandi: {strengthLabel[strength]}
                </span>
              </div>
            )}

            {/* Alamat Field */}
            <div style={styles.inputGroup}>
              <span style={styles.fieldIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <input
                type="text"
                required
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                placeholder="Alamat Lengkap"
                style={styles.input}
              />
            </div>

            {/* Role Select Field */}
            <div style={styles.inputGroup}>
              <span style={styles.fieldIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={styles.select}
              >
                <option value="warga">Warga</option>
                <option value="transporter">Courier</option>
                <option value="admin">Admin</option>
              </select>
              <span style={styles.selectArrow}>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>

            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              style={{ ...styles.btnPrimary, opacity: loading ? 0.8 : 1, marginTop: 12 }}
              onMouseEnter={(e) => !loading && (e.target.style.background = "#2d9989")}
              onMouseLeave={(e) => !loading && (e.target.style.background = "#35b09e")}
            >
              {loading ? "MEMPROSES..." : "DAFTAR"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        body { margin: 0; font-family: 'Outfit', sans-serif; background: #f0f3f2; }
        .auth-card { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
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
    background: "#f0f3f2",
    padding: "24px 16px",
    fontFamily: "'Outfit', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  yellowCircle: {
    position: "absolute",
    bottom: "-10%",
    left: "-5%",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "#f9d342",
    opacity: 0.8,
    zIndex: 0,
  },
  redTriangle: {
    position: "absolute",
    top: "-5%",
    right: "-5%",
    width: "0",
    height: "0",
    borderStyle: "solid",
    borderWidth: "0 280px 280px 0",
    borderColor: "transparent #e85a71 transparent transparent",
    opacity: 0.9,
    zIndex: 0,
  },
  card: {
    display: "flex",
    width: "100%",
    maxWidth: 850,
    minHeight: 560,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
    backgroundColor: "#ffffff",
    zIndex: 2,
  },
  leftPanel: {
    width: "38%",
    background: "#35b09e",
    color: "#ffffff",
    padding: "40px 30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    zIndex: 2,
  },
  logoIcon: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  leftContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    margin: "auto 0",
    zIndex: 2,
  },
  leftTitle: {
    fontSize: 32,
    fontWeight: 700,
    margin: "0 0 16px 0",
    color: "#ffffff",
  },
  leftSubtext: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 30,
    maxWidth: "240px",
  },
  outlineBtn: {
    background: "transparent",
    border: "2px solid #ffffff",
    borderRadius: 30,
    color: "#ffffff",
    padding: "10px 32px",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "none",
    letterSpacing: "1px",
    transition: "all 0.2s",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
  },
  leftBgCircle1: {
    position: "absolute",
    top: "10%",
    right: "-10%",
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.08)",
    transform: "rotate(45deg)",
  },
  leftBgCircle2: {
    position: "absolute",
    bottom: "10%",
    left: "-10%",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.05)",
  },
  rightPanel: {
    width: "62%",
    background: "#ffffff",
    padding: "40px 60px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  formTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: "#35b09e",
    margin: "0 0 16px 0",
  },
  socialRow: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  socialIcon: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#333",
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  },
  formSubtext: {
    fontSize: 12,
    color: "#718096",
    marginBottom: 16,
  },
  form: {
    width: "100%",
    maxWidth: 320,
    display: "flex",
    flexDirection: "column",
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    background: "#f4f8f7",
    borderRadius: 8,
    marginBottom: 12,
    padding: "4px 14px",
    position: "relative",
  },
  fieldIcon: {
    display: "flex",
    alignItems: "center",
    marginRight: 10,
    color: "#a0aec0",
  },
  input: {
    width: "100%",
    padding: "10px 0",
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 13,
    color: "#2d3748",
    fontFamily: "'Outfit', sans-serif",
  },
  select: {
    width: "100%",
    padding: "10px 0",
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 13,
    color: "#2d3748",
    fontFamily: "'Outfit', sans-serif",
    cursor: "pointer",
    paddingRight: 24,
  },
  selectArrow: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
  },
  eyeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    color: "#a0aec0",
    marginLeft: 6,
  },
  btnPrimary: {
    background: "#35b09e",
    border: "none",
    borderRadius: 30,
    color: "#ffffff",
    padding: "12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
    boxShadow: "0 4px 15px rgba(53, 176, 158, 0.3)",
    letterSpacing: "1px",
    width: "100%",
    outline: "none",
  },
};