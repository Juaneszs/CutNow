import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cargando) return;
    if (!user) {
      // Disparar alert nativa estilizada y redirigir
      showAlert(navigate);
    } else if (adminOnly && !isAdmin) {
      navigate("/catalogo");
    }
  }, [user, isAdmin, cargando, navigate, adminOnly]);

  if (cargando) return null;
  if (!user) return null;
  if (adminOnly && !isAdmin) return null;

  return children;
}

function showAlert(navigate) {
  // Crear el modal de alerta personalizado
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
  `;

  overlay.innerHTML = `
    <div style="
      background:rgba(20,20,20,0.98);border:1px solid rgba(0,200,83,0.3);
      border-radius:16px;padding:40px 32px;max-width:380px;width:90%;
      text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.8);
    ">
      <div style="font-size:48px;margin-bottom:16px;">✂️</div>
      <h2 style="color:#fff;margin:0 0 12px;font-size:22px;font-weight:600;">Acceso Restringido</h2>
      <p style="color:#9ca3af;margin:0 0 28px;font-size:15px;line-height:1.6;">
        Debes iniciar sesión o registrarte para gestionar tus citas.
      </p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="btn-login-alert" style="
          flex:1;padding:12px 20px;background:linear-gradient(135deg,#00c853,#00b34a);
          color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;
          cursor:pointer;transition:.15s;
        ">Iniciar sesión</button>
        <button id="btn-registro-alert" style="
          flex:1;padding:12px 20px;background:transparent;
          color:#00c853;border:1px solid rgba(0,200,83,0.5);border-radius:8px;
          font-size:15px;font-weight:600;cursor:pointer;
        ">Registrarse</button>
      </div>
      <button id="btn-cancelar-alert" style="
        margin-top:16px;background:none;border:none;color:#6b7280;
        font-size:13px;cursor:pointer;text-decoration:underline;
      ">Cancelar</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const cleanup = () => document.body.removeChild(overlay);

  overlay.querySelector("#btn-login-alert").onclick = () => {
    cleanup();
    navigate("/");
  };
  overlay.querySelector("#btn-registro-alert").onclick = () => {
    cleanup();
    navigate("/registro");
  };
  overlay.querySelector("#btn-cancelar-alert").onclick = () => {
    cleanup();
    navigate(-1);
  };
}
