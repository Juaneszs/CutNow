
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./Styles/Catalogo.css";

export default function Catalogo() {
  const navigate = useNavigate();
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarBarberos() {
      try {
        const snap = await getDocs(collection(db, "Barberos"));
        setBarberos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error al cargar barberos:", error);
      } finally {
        setCargando(false);
      }
    }
    cargarBarberos();
  }, []);

  return (
    <div className="catalog-container">
      
      {/* HEADER */}
      <header className="catalog-header">
        <h1>
          <span className="header-logo">Catálogo de <span className="text-green">Barberos</span></span>
        </h1>
        <p>Selecciona un barbero y agenda tu cita</p>
      </header>

      {/* TARJETAS */}
      <section className="card-grid">
        {cargando && <p className="catalog-loading">Cargando la élite de barberos...</p>}

        {!cargando && barberos.length === 0 && (
          <p className="catalog-empty">No hay barberos registrados por el momento.</p>
        )}

        {barberos.map(barbero => (
          <div key={barbero.id} className="barber-card">
            <div className="avatar-container">
              <img
                src={barbero.foto}
                alt={barbero.Nombre}
                className="barber-avatar-img"
              />
            </div>

            <h3 className="barber-name">{barbero.Nombre}</h3>
            <p className="barber-specialty">{barbero.especialidad || "Barbero profesional"}</p>

            {/* BOTÓN VERDE */}
            <button
              className="btn-primary"
              onClick={() =>
                navigate("/agendar", {
                  state: { barberoSeleccionado: barbero }
                })
              }
            >
              Agendar
            </button>
          </div>
        ))}
      </section>

      {/* ── TARJETAS DE ACCIÓN INFERIORES ── */}
      <section className="action-cards-container">
        
        {/* TARJETA 1: Mis Citas */}
        <div className="action-card">
          <div className="action-card-top">
            <div className="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <div className="action-text">
              <h3>Mis Citas</h3>
              <p>Gestiona tus citas, reprograma o cancela fácilmente desde aquí.</p>
            </div>
          </div>
          <button className="action-btn outline" onClick={() => navigate("/mis-citas")}>
            Ver mis citas <span>→</span>
          </button>
        </div>

        {/* TARJETA 2: Agendar (Destacada) */}
        <div className="action-card highlighted">
          <div className="action-card-top">
            <div className="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>
            </div>
            <div className="action-text">
              <h3>Agendar Cita Rápida</h3>
              <p>Encuentra tu barbero, elige tu servicio y reserva en minutos.</p>
            </div>
          </div>
          <button className="action-btn solid" onClick={() => navigate("/agendar")}>
            Agendar ahora <span>→</span>
          </button>
        </div>

        {/* TARJETA 3: Tienda */}
        <div className="action-card">
          <div className="action-card-top">
            <div className="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            </div>
            <div className="action-text">
              <h3>Visitar Tienda</h3>
              <p>Descubre nuestros productos premium para tu cuidado personal.</p>
            </div>
          </div>
          <button className="action-btn outline" onClick={() => navigate("/tienda")}>
            Ir a la tienda <span>→</span>
          </button>
        </div>

      </section>
    </div>
  );
}