import Swal from 'sweetalert2';
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
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: error.message,
        confirmButtonColor: '#35b09e'
      });
      console.error(error);
    } else {
      console.log("Login berhasil", data);
      navigate("/");
    }
    setLoading(false);
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
            <h1 style={styles.leftTitle}>Hello, Friend!</h1>
            <p style={styles.leftSubtext}>
              Masukkan detail pribadi Anda dan mulailah perjalanan bersama kami untuk lingkungan yang lebih bersih.
            </p>
            <Link to="/register" style={styles.outlineBtn}>
              DAFTAR
            </Link>
          </div>
          
          {/* Subtle background graphics in the left panel */}
          <div style={styles.leftBgCircle1} />
          <div style={styles.leftBgCircle2} />
        </div>

        {/* Right Panel (Form Panel) */}
        <div style={styles.rightPanel}>
          <h2 style={styles.formTitle}>Masuk Akun</h2>
          
          {/* Social Logins */}
          <div style={styles.socialRow}>
            <button type="button" style={styles.socialIcon} onClick={() => Swal.fire({ text: 'Login Facebook belum tersedia', confirmButtonColor: '#35b09e' })}>f</button>
            <button type="button" style={styles.socialIcon} onClick={() => Swal.fire({ text: 'Login Google belum tersedia', confirmButtonColor: '#35b09e' })}>G+</button>
            <button type="button" style={styles.socialIcon} onClick={() => Swal.fire({ text: 'Login LinkedIn belum tersedia', confirmButtonColor: '#35b09e' })}>in</button>
          </div>
          
          <p style={styles.formSubtext}>atau gunakan email akun Anda:</p>

          <form onSubmit={login} style={styles.form}>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Forgot password */}
            <div style={{ textAlign: "center", margin: "8px 0 20px" }}>
              <a href="#" style={styles.forgotLink} onClick={(e) => { e.preventDefault(); Swal.fire({ text: 'Silakan hubungi administrator untuk mereset kata sandi Anda.', confirmButtonColor: '#35b09e' }); }}>Lupa kata sandi Anda?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.btnPrimary, opacity: loading ? 0.8 : 1 }}
              onMouseEnter={(e) => !loading && (e.target.style.background = "#2d9989")}
              onMouseLeave={(e) => !loading && (e.target.style.background = "#35b09e")}
            >
              {loading ? "MEMPROSES..." : "MASUK"}
            </button>
          </form>
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
    minHeight: 520,
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
    padding: "50px 60px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 20,
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
    marginBottom: 20,
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
  forgotLink: {
    fontSize: 12,
    color: "#4a5568",
    textDecoration: "none",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 2,
    display: "inline-block",
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
