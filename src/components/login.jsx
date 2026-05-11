import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setError("");
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/catalogo");
    } catch (e) {
      if (
        e.code === "auth/user-not-found" ||
        e.code === "auth/wrong-password" ||
        e.code === "auth/invalid-credential"
      ) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 400 }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
            Cut<span style={{ color: "var(--accent)" }}>Now</span>
          </span>
          <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 14 }}>
            Bienvenido de vuelta
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 14
          }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: "left", marginBottom: 6 }}>
          <label style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Correo electrónico</label>
        </div>
        <input
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />

        <div style={{ textAlign: "left", marginBottom: 6, marginTop: 4 }}>
          <label style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Contraseña</label>
        </div>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />

        <div style={{ textAlign: "right", marginTop: -4, marginBottom: 12 }}>
          <Link to="/recuperar-contrasena" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button onClick={handleLogin} className="btn-primary" disabled={cargando}>
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>

        <p style={{ marginTop: 20, fontSize: 14, color: "#9ca3af", textAlign: "center" }}>
          ¿No tienes cuenta?{" "}
          <Link to="/registro" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Regístrate gratis
          </Link>
        </p>

        <p style={{ marginTop: 10, fontSize: 13, color: "#6b7280", textAlign: "center" }}>
          ¿Solo quieres explorar?{" "}
          <Link to="/tienda" style={{ color: "#9ca3af", textDecoration: "underline" }}>
            Ver tienda
          </Link>
        </p>
      </div>
    </div>
  );
}
