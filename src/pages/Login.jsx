import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

const login = async (e) => {
  e.preventDefault();
  setLoading(true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert(`Login gagal: ${error.message}`);
    console.error(error);
  } else {
    console.log("Login berhasil", data);
    navigate("/");
  }
  setLoading(false);
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
              Kelola laporan, pelayanan, dan informasi pengolahan sampah npmwarga dalam satu platform terpadu.
            </p>
            <div style={styles.dotsRow}>
              <div style={{ ...styles.dot, ...styles.dotActive }} />
              <div style={styles.dot} />
              <div style={styles.dot} />
            </div>
          </div>
          {/* decorative circles */}
          <div style={styles.circle1} />
          <div style={styles.circle2} />
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.tabRow}>
            <button style={{ ...styles.tab, ...styles.tabActive }}>Masuk</button>
            <Link to="/register" style={{ ...styles.tab, textDecoration: "none" }}>Daftar</Link>
          </div>

          <h2 style={styles.formTitle}>Selamat datang</h2>
          <p style={styles.formSub}>Masuk untuk melanjutkan ke akun Anda.</p>

          <form onSubmit={login} style={styles.form}>
            {/* Email */}
            <div style={styles.field}>
              <label style={styles.label}>Alamat Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
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
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginTop: -8, marginBottom: 20 }}>
              <a href="#" style={styles.forgotLink}>Lupa kata sandi?</a>
            </div>

            <button
              type="submit"
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
              ) : "Masuk"}
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>atau</span>
              <span style={styles.dividerLine} />
            </div>

            <button
              type="button"
              style={styles.btnAlt}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f3")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <GoogleIcon />
              Masuk dengan Google
            </button>
          </form>

          <p style={styles.switchText}>
            Belum punya akun?{" "}
            <Link to="/register" style={styles.switchLink}>Daftar sekarang</Link>
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
        input:focus { outline: none; }
        .auth-card { animation: fadeUp 0.5s ease both; }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.253 17.64 11.945 17.64 9.2z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
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
    minHeight: 560,
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
    margin: "0 0 28px",
    lineHeight: 1.5,
  },
  form: { display: "flex", flexDirection: "column" },
  field: { marginBottom: 16 },
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
  forgotLink: {
    fontSize: 12,
    color: "#1D9E75",
    textDecoration: "none",
    fontFamily: "'DM Sans', sans-serif",
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
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    background: "#e5e5e3",
    display: "block",
  },
  dividerText: {
    fontSize: 12,
    color: "#bbb",
    fontFamily: "'DM Sans', sans-serif",
  },
  btnAlt: {
    width: "100%",
    padding: 11,
    background: "transparent",
    border: "0.5px solid #ddd",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: "#333",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.2s",
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
