import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Styles/Layout.css";

export default function Header() {
  const { user, perfil, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleProtected = (path) => (e) => {
    e.preventDefault();
    if (!user) {
      showAuthAlert(navigate, path);
    } else {
      navigate(path);
    }
  };

  return (
    <header className="main-header">
      <div className="header-container">
        <Link to={user ? "/catalogo" : "/"} className="header-logo">
          Cut<span className="text-green">Now</span>
        </Link>

        <nav className="header-nav">
          {user && <Link to="/catalogo" className="nav-link">Inicio</Link>}
          <Link to="/tienda" className="nav-link">Tienda</Link>

          {user ? (
            <>
              <Link to="/mis-citas" className="nav-link">Mis Citas</Link>
              {isAdmin && (
                <Link to="/admin" className="nav-link" style={{ color: "var(--accent)" }}>
                  ⚙ Admin
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin/citas" className="nav-link" style={{ color: "var(--accent)" }}>
                  📋 Citas
                </Link>
              )}
              <div className="nav-user-menu">
                <div className="nav-avatar">
                  {perfil?.nombre?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="nav-username">
                  {perfil?.nombre || user.email?.split("@")[0]}
                </span>
                <button className="nav-logout-btn" onClick={handleLogout}>
                  Salir
                </button>
              </div>
            </>
          ) : (
            <>
              <a href="/mis-citas" onClick={handleProtected("/mis-citas")} className="nav-link">Mis Citas</a>
              <Link to="/" className="nav-link" style={{ color: "var(--accent)", fontWeight: 600 }}>Iniciar sesión</Link>
              <a href="/agendar" onClick={handleProtected("/agendar")} className="nav-btn-agendar">
                Agendar Cita
              </a>
            </>
          )}

          {user && (
            <a href="/agendar" onClick={handleProtected("/agendar")} className="nav-btn-agendar">
              Agendar Cita
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

function showAuthAlert(navigate, destino) {
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
      <div style="font-size:44px;margin-bottom:12px;">✂️</div>
      <h2 style="color:#fff;margin:0 0 10px;font-size:20px;font-weight:600;">Acceso Restringido</h2>
      <p style="color:#9ca3af;margin:0 0 24px;font-size:14px;line-height:1.6;">
        Debes iniciar sesión o registrarte para gestionar tu perfil.
      </p>
      <div style="display:flex;gap:12px;">
        <button id="al-login" style="flex:1;padding:12px;background:linear-gradient(135deg,#00c853,#00b34a);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
          Iniciar sesión
        </button>
        <button id="al-reg" style="flex:1;padding:12px;background:transparent;color:#00c853;border:1px solid rgba(0,200,83,0.5);border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
          Registrarse
        </button>
      </div>
      <button id="al-cancel" style="margin-top:14px;background:none;border:none;color:#6b7280;font-size:13px;cursor:pointer;text-decoration:underline;">
        Cancelar
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  const rm = () => document.body.removeChild(overlay);
  overlay.querySelector("#al-login").onclick = () => { rm(); navigate("/"); };
  overlay.querySelector("#al-reg").onclick = () => { rm(); navigate("/registro"); };
  overlay.querySelector("#al-cancel").onclick = rm;
}
