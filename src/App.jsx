import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Admin from "./pages/Admin";
import Transporter from "./pages/Transporter";
import Warga from "./pages/Warga";
import Login from "./pages/Login";

function App() {
  const [role, setRole] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setRole("guest");
        return;
      }

      console.log("User ID dari auth:", user.id); // 🔍 Cek di console browser

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setError("Gagal memuat profil. Silakan coba lagi.");
        setRole("guest");
        return;
      }

      if (!data) {
        console.warn("Tidak ada profil untuk user ID:", user.id);
        setError("Profil tidak ditemukan. Hubungi admin.");
        setRole("guest");
        return;
      }

      console.log("Role ditemukan:", data.role);
      setRole(data.role);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (role === null) return <h2>Loading...</h2>;
  if (error) return <div style={{ color: 'red', padding: 20 }}>{error} <button onClick={() => window.location.reload()}>Refresh</button></div>;
  if (role === "guest") return <Login />;
  if (role === "admin") return <Admin />;
  if (role === "transporter") return <Transporter />;
  if (role === "warga") return <Warga />;

  return <Login />; // fallback aman
}

export default App;