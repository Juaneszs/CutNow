import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, serverTimestamp, runTransaction, arrayRemove
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./AdminCitas.css";

/* Badge de estado */
function EstadoBadge({ estado }) {
  const labels = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    finalizada: "Finalizada",
    cancelada: "Cancelada"
  };
  
  // Usamos clases dinámicas en lugar de estilos en línea
  return (
    <span className={`badge badge-${estado}`}>
      {labels[estado] || "Pendiente"}
    </span>
  );
}

/* Modal confirmación antes de "Completar" */
function ModalCompletar({ cita, onConfirmar, onCancelar }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon">✅</div>
        <h3 className="modal-title">¿Completar cita?</h3>
        <p className="modal-subtitle">
          <strong>{cita.usuario_nombre}</strong> — {cita.servicio_nombre}
        </p>
        <p className="modal-detail">
          {cita.barbero_nombre} · {cita.fecha} {cita.hora}
        </p>
        <p className="modal-warning">
          La cita pasará a <strong className="text-green">Finalizada</strong> y el cliente
          podrá calificar el servicio.
        </p>
        <div className="modal-actions">
          <button className="btn-action btn-complete" onClick={onConfirmar}>Sí, completar</button>
          <button className="btn-action btn-back" onClick={onCancelar}>Atrás</button>
        </div>
      </div>
    </div>
  );
}

/* Tarjeta de cita (Admin) */
function CitaAdminCard({ cita, onAceptar, onCompletar, onCancelar, cargandoId }) {
  const ocupado = cargandoId === cita.id;

  const fila = (label, valor, isHighlight = false) => (
    <div className="admin-card-row">
      <span className="row-label">{label}</span>
      <span className={`row-value ${isHighlight ? "highlight" : ""}`}>
        {valor}
      </span>
    </div>
  );

  return (
    <div className="admin-card">
      {/* Header */}
      <div className="card-header">
        <div>
          <p className="client-name">{cita.usuario_nombre || "Cliente"}</p>
          <p className="service-name">{cita.servicio_nombre}</p>
        </div>
        <EstadoBadge estado={cita.estado} />
      </div>

      {/* Info */}
      {fila("💈 Barbero", cita.barbero_nombre)}
      {fila("📅 Fecha", cita.fecha)}
      {fila("⏰ Hora", cita.hora)}
      {fila("🏠 Sede", cita.sede_nombre || "—")}
      {fila("💵 Total", `$${(cita.precio || 0).toLocaleString("es-CO")}`, true)}

      {/* Calificación (Si la hay en historial) */}
      {cita.calificacion && (
        <div className="rating-container">
          <p className="rating-title">Calificación del cliente:</p>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} className={`star ${n <= cita.calificacion ? "filled" : "empty"}`}>★</span>
            ))}
            <span className="rating-score">({cita.calificacion}/5)</span>
          </div>
          {cita.comentario && (
            <p className="rating-comment">"{cita.comentario}"</p>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="card-actions">
        {cita.estado === "pendiente" && (
          <>
            <button className="btn-action btn-accept" onClick={() => onAceptar(cita)} disabled={ocupado}>
              {ocupado ? "..." : "✓ Aceptar"}
            </button>
            <button className="btn-action btn-cancel" onClick={() => onCancelar(cita, "rechazar")} disabled={ocupado}>
              Rechazar
            </button>
          </>
        )}

        {cita.estado === "confirmada" && (
          <>
            <button className="btn-action btn-complete" onClick={() => onCompletar(cita)} disabled={ocupado}>
              {ocupado ? "Guardando..." : "Completar"}
            </button>
            <button className="btn-action btn-cancel" onClick={() => onCancelar(cita, "cancelar")} disabled={ocupado}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Componente principal
────────────────────────────────────────────────────────── */
export default function AdminCitas() {
  const { user, isAdmin, cargando: authCargando } = useAuth();
  const navigate = useNavigate();

  const [tabActivo, setTabActivo] = useState("activas");
  const [citasActivas, setCitasActivas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoId, setCargandoId] = useState(null);
  const [citaACompletar, setCitaACompletar] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (authCargando) return;
    if (!user || !isAdmin) navigate("/");
  }, [user, isAdmin, authCargando, navigate]);

  useEffect(() => {
    if (authCargando || !isAdmin) return;
    const qActivas = query(collection(db, "citas"), where("estado", "in", ["pendiente", "confirmada"]), orderBy("fecha", "asc"), orderBy("hora", "asc"));
    const unsubActivas = onSnapshot(qActivas, snap => {
      setCitasActivas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
    return () => unsubActivas();
  }, [isAdmin, authCargando]);

  useEffect(() => {
    if (authCargando || !isAdmin) return;
    const qHist = query(collection(db, "citas"), where("estado", "==", "finalizada"), orderBy("fecha", "desc"));
    const unsubHist = onSnapshot(qHist, snap => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubHist();
  }, [isAdmin, authCargando]);

  async function handleAceptar(cita) {
    if (!isAdmin) return;
    setCargandoId(cita.id);
    try {
      await updateDoc(doc(db, "citas", cita.id), {
        estado: "confirmada", confirmada_at: serverTimestamp(),
      });
      mostrarFeedback("ok", `✓ Cita de ${cita.usuario_nombre} confirmada`);
    } catch (e) {
      mostrarFeedback("err", "Error al aceptar la cita");
    } finally {
      setCargandoId(null);
    }
  }

  async function handleCompletar() {
    if (!isAdmin || !citaACompletar) return;
    const cita = citaACompletar;
    setCitaACompletar(null);
    setCargandoId(cita.id);

    try {
      await updateDoc(doc(db, "citas", cita.id), {
        estado: "finalizada", finalizada_at: serverTimestamp(),
      });
      mostrarFeedback("ok", `✅ Cita completada. Movida al historial.`);
    } catch (e) {
      mostrarFeedback("err", "Error al completar la cita");
    } finally {
      setCargandoId(null);
    }
  }

  async function handleCancelar(cita, accionPalabra) {
    if (!isAdmin) return;
    const confirmar = window.confirm(`¿Estás seguro de que deseas ${accionPalabra} la cita de ${cita.usuario_nombre}?`);
    if (!confirmar) return;

    setCargandoId(cita.id);
    try {
      const citaRef = doc(db, "citas", cita.id);
      const disponRef = doc(db, "Barberos", cita.barbero_id, "disponibilidad", cita.fecha);

      await runTransaction(db, async (tx) => {
        tx.update(citaRef, { estado: "cancelada", cancelada_at: serverTimestamp() });
        tx.update(disponRef, { slots_ocupados: arrayRemove(cita.hora) });
      });

      mostrarFeedback("ok", `La cita fue cancelada y el espacio liberado.`);
    } catch (e) {
      console.error(e);
      mostrarFeedback("err", "Hubo un error al cancelar la cita.");
    } finally {
      setCargandoId(null);
    }
  }

  function mostrarFeedback(type, msg) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  const filtrar = (lista) => {
    if (!busqueda.trim()) return lista;
    const b = busqueda.toLowerCase();
    return lista.filter(c => (c.usuario_nombre || "").toLowerCase().includes(b) || (c.barbero_nombre || "").toLowerCase().includes(b));
  };

  const citasFiltradas = filtrar(citasActivas);
  const historialFiltrado = filtrar(historial);

  const pendientes = citasActivas.filter(c => c.estado === "pendiente").length;
  const confirmadas = citasActivas.filter(c => c.estado === "confirmada").length;
  const finalizadas = historial.length;
  const ingresoHoy = historial.filter(c => c.fecha === new Date().toISOString().split("T")[0]).reduce((s, c) => s + (Number(c.precio) || 0), 0);

  // Colores dinámicos para los iconos del resumen
  const summaryColors = { pendientes: "#fbbf24", confirmadas: "#818cf8", finalizadas: "#00c853", ingresos: "#00c853" };

  if (authCargando || (cargando && isAdmin)) {
    return (
      <div className="loading-state">
        <p className="loading-text">Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="admin-citas-container">
      {citaACompletar && <ModalCompletar cita={citaACompletar} onConfirmar={handleCompletar} onCancelar={() => setCitaACompletar(null)} />}
      
      {feedback && (
        <div className={`toast-feedback toast-${feedback.type}`}>
          {feedback.msg}
        </div>
      )}

      {/* Título */}
      <div className="admin-header">
        <h1 className="admin-title">Gestión de <span className="text-green">Citas</span></h1>
        <p className="admin-subtitle">Acepta, confirma y completa las citas de tus clientes</p>
      </div>

      {/* Cards resumen */}
      <div className="summary-grid">
        {[
          { icon: "⏳", label: "Pendientes", value: pendientes, color: summaryColors.pendientes },
          { icon: "✓", label: "Confirmadas", value: confirmadas, color: summaryColors.confirmadas },
          { icon: "✅", label: "Finalizadas", value: finalizadas, color: summaryColors.finalizadas },
          { icon: "$", label: "Ingresos hoy", value: `$${ingresoHoy.toLocaleString("es-CO")}`, color: summaryColors.ingresos },
        ].map(s => (
          <div key={s.label} className="admin-summary-card">
            {/* El color de fondo del ícono sí debe ser dinámico en línea */}
            <div className="summary-icon" style={{ background: `${s.color}22`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="summary-label">{s.label}</p>
              <p className="summary-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="search-container">
        <input type="text" className="admin-search-input" placeholder="🔍  Buscar por cliente o barbero..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {[
          { key: "activas", label: `📋 Activas (${citasActivas.length})` },
          { key: "historial", label: `📁 Historial (${historial.length})` },
        ].map(t => (
          <button 
            key={t.key} 
            className={`admin-tab ${tabActivo === t.key ? "active" : ""}`} 
            onClick={() => setTabActivo(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CITAS ACTIVAS ── */}
      {tabActivo === "activas" && (
        <>
          {["pendiente", "confirmada"].map(estado => {
            const grupo = citasFiltradas.filter(c => c.estado === estado);
            if (grupo.length === 0) return null;
            
            // Colores para las líneas separadoras
            const sectionColor = estado === "pendiente" ? "#ffffff" : "#ffffff";

            return (
              <div key={estado} style={{ marginBottom: 32 }}>
                <div className="section-header">
                  <div className="section-line" style={{ background: sectionColor }} />
                  <h2 className="section-title" style={{ color: sectionColor }}>
                    {estado === "pendiente" ? "⏳ Por confirmar" : "✓ Confirmadas"}
                    <span className="section-count">({grupo.length})</span>
                  </h2>
                  <div className="section-line" style={{ background: sectionColor }} />
                </div>
                <div className="citas-grid">
                  {grupo.map(cita => (
                    <CitaAdminCard
                      key={cita.id}
                      cita={cita}
                      onAceptar={handleAceptar}
                      onCompletar={c => setCitaACompletar(c)}
                      onCancelar={handleCancelar}
                      cargandoId={cargandoId}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {citasFiltradas.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-text">
                {busqueda ? "No hay resultados para tu búsqueda." : "No hay citas activas en este momento."}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── HISTORIAL ── */}
      {tabActivo === "historial" && (
        <>
          {historialFiltrado.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p className="empty-text">
                {busqueda ? "No hay resultados para tu búsqueda." : "Aún no hay citas finalizadas."}
              </p>
            </div>
          ) : (
            <div className="citas-grid">
              {historialFiltrado.map(cita => (
                <CitaAdminCard key={cita.id} cita={cita} onAceptar={()=>{}} onCompletar={()=>{}} onCancelar={()=>{}} cargandoId={null} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}