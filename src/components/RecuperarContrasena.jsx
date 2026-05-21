import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";

export default function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("idle");
  const [error, setError] = useState("");

  const handleEnviar = async () => {
    if (!email) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      setError("El correo no tiene un formato válido.");
      return;
    }
    setError("");
    setEstado("enviando");
    try {
      await sendPasswordResetEmail(auth, email);
      setEstado("enviado");
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        setError("No encontramos una cuenta con ese correo.");
      } else {
        setError("Ocurrió un error. Intenta de nuevo.");
      }
      setEstado("error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔑</div>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
            Cut<span style={{ color: "var(--accent)" }}>Now</span>
          </span>
          <h2 style={{ marginTop: 16, marginBottom: 6, fontSize: 20, color: "#fff", fontWeight: 600 }}>
            Recuperar contraseña
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.5 }}>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {/* Estado enviado */}
        {estado === "enviado" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              background: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.3)",
              borderRadius: 12, padding: "20px 16px", marginBottom: 24
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <p style={{ color: "#4ade80", fontWeight: 600, margin: 0 }}>
                ¡Correo enviado!
              </p>
              <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>
                Revisa tu bandeja de entrada (y la carpeta de spam) en <strong style={{ color: "#fff" }}>{email}</strong>
              </p>
            </div>
            <Link to="/" className="btn-primary" style={{ textDecoration: "none", display: "block", textAlign: "center" }}>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 14
              }}>
                {error}
              </div>
            )}

            {/* Input */}
            <div style={{ textAlign: "left", marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Correo electrónico</label>
            </div>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnviar()}
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            />

            <button
              onClick={handleEnviar}
              className="btn-primary"
              disabled={estado === "enviando"}
              style={{ marginTop: 16 }}
            >
              {estado === "enviando" ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "#9ca3af" }}>
              ¿Recuerdas tu contraseña?{" "}
              <Link to="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
