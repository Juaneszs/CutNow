import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  doc, runTransaction, arrayRemove, updateDoc, getDocs
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Styles/MisCitas.module.css";


// Sistema de valoración con estrellas
function ValoracionModal({ cita, onCerrar }) {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function recalcularPromedioBarbero(barberoId) {
    try {
      const snapCitas = await getDocs(query(
        collection(db, "citas"),
        where("barbero_id", "==", barberoId),
        where("estado", "==", "finalizada")
      ));
      const calificaciones = snapCitas.docs
        .map(d => d.data().calificacion)
        .filter(c => c != null && c > 0);
      if (calificaciones.length > 0) {
        const promedio = calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;
        await updateDoc(doc(db, "Barberos", barberoId), {
          calificacion_promedio: Math.round(promedio * 10) / 10,
          total_calificaciones: calificaciones.length,
        });
      }
    } catch (e) {
      console.error("Error recalculando promedio:", e);
    }
  }

  async function handleEnviar() {
    if (estrellas === 0) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, "citas", cita.id), {
        calificacion: estrellas,
        comentario: comentario.trim(),
        calificado: true,
      });
      // Recalcular promedio del barbero tras nueva calificación
      if (cita.barbero_id) {
        await recalcularPromedioBarbero(cita.barbero_id);
      }
      setEnviado(true);
      setTimeout(onCerrar, 1500);
    } catch (e) {
      alert("Error al guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "rgba(20,20,20,0.98)", border: "1px solid rgba(0,200,83,0.25)",
        borderRadius: 16, padding: "36px 32px", maxWidth: 380, width: "90%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        {enviado ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3 style={{ color: "#fff", margin: 0 }}>¡Gracias por tu valoración!</h3>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⭐</div>
            <h3 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Valorar servicio</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 24px" }}>
              ¿Cómo fue tu experiencia con <strong style={{ color: "#fff" }}>{cita.barbero_nombre}</strong>?
            </p>

            {/* Estrellas */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span
                  key={n}
                  onClick={() => setEstrellas(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  style={{
                    fontSize: 36, cursor: "pointer",
                    color: n <= (hover || estrellas) ? "#facc15" : "#374151",
                    transition: ".1s",
                  }}
                >★</span>
              ))}
            </div>

            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe un comentario (opcional)..."
              rows={3}
              style={{
                width: "100%", background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, color: "#fff", padding: "12px", fontSize: 14,
                resize: "none", outline: "none", marginBottom: 16, boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleEnviar}
                disabled={estrellas === 0 || guardando}
                style={{
                  flex: 1, padding: "12px", background: "linear-gradient(135deg,#00c853,#00b34a)",
                  color: "#fff", border: "none", borderRadius: 8, fontWeight: 600,
                  cursor: estrellas > 0 ? "pointer" : "not-allowed", opacity: estrellas === 0 ? 0.5 : 1,
                }}
              >
                {guardando ? "Guardando..." : "Enviar valoración"}
              </button>
              <button
                onClick={onCerrar}
                style={{
                  padding: "12px 20px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af",
                  borderRadius: 8, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MisCitas() {
  const navigate = useNavigate();
  const { user, cargando: authCargando } = useAuth();
  const [tabActivo, setTabActivo] = useState("pendiente");
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [citaAValorar, setCitaAValorar] = useState(null);

  useEffect(() => {
    if (authCargando) return;
    if (!user) {
      navigate("/");
      return;
    }

    setCargando(true);
    setCitas([]);

    const q = query(
      collection(db, "citas"),
      where("usuario_id", "==", user.uid),
      where("estado", "==", tabActivo),
      orderBy("fecha", "asc")
    );

    const cancelar = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCitas(data);
      setCargando(false);
    });

    return () => cancelar();
  }, [tabActivo, navigate, user, authCargando]);

  async function cancelarCita(cita) {
    const confirmar = window.confirm(
      `¿Cancelar tu cita del ${cita.fecha} a las ${cita.hora} con ${cita.barbero_nombre}?`
    );
    if (!confirmar) return;

    try {
      const citaRef = doc(db, "citas", cita.id);
      const disponRef = doc(db, "Barberos", cita.barbero_id, "disponibilidad", cita.fecha);

      await runTransaction(db, async (tx) => {
        tx.update(citaRef, { estado: "cancelada" });
        tx.update(disponRef, { slots_ocupados: arrayRemove(cita.hora) });
      });
    } catch (e) {
      alert("No se pudo cancelar la cita. Intenta de nuevo.");
    }
  }

  function formatearFecha(fechaStr) {
    const [y, m, d] = fechaStr.split("-");
    return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
      weekday: "long", day: "numeric", month: "long",
    });
  }

  const tabs = [
    { valor: "pendiente",  etiqueta: "📅 Próximas" },
    { valor: "confirmada", etiqueta: "✓ Confirmadas" },
    { valor: "finalizada", etiqueta: "✅ Completadas" },
    { valor: "cancelada",  etiqueta: "❌ Canceladas" },
  ];

  return (
    <div className="catalog-container">
      {citaAValorar && (
        <ValoracionModal cita={citaAValorar} onCerrar={() => setCitaAValorar(null)} />
      )}

      <header className="catalog-header">
        <h1><span className="header-logo">Mis Citas</span></h1>
        <p>Administra tus citas y revisa tu historial</p>
      </header>

      {/* TABS */}
      <div className={styles.tabsRow}>
        {tabs.map(tab => (
          <button
            key={tab.valor}
            className={`${styles.tabBtn} ${tabActivo === tab.valor ? styles.active : ""}`}
            onClick={() => setTabActivo(tab.valor)}
          >
            {tab.etiqueta}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      {cargando ? (
        <div className={styles.containerCentrado}>
          <p style={{ color: "var(--accent)", fontSize: 18 }}>Cargando...</p>
        </div>
      ) : citas.length === 0 ? (
        <div className={styles.containerCentrado}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>
            {tabActivo === "pendiente" ? "📅" : tabActivo === "confirmada" ? "✓" : tabActivo === "finalizada" ? "✅" : "❌"}
          </div>
          <p className="empty-text">
            {tabActivo === "pendiente"
              ? "No tienes citas próximas."
              : tabActivo === "confirmada"
              ? "No tienes citas confirmadas."
              : tabActivo === "finalizada"
              ? "Aún no tienes citas completadas."
              : "No tienes citas canceladas."}
          </p>
          {tabActivo === "pendiente" && (
            <button
              className="btn-primary"
              style={{ marginTop: 24, width: "auto", padding: "12px 28px" }}
              onClick={() => navigate("/agendar")}
            >
              Agendar una cita
            </button>
          )}
        </div>
      ) : (
        <div className={styles.citasGrid}>
          {citas.map(cita => (
            <div key={cita.id} className="barber-card" style={{ textAlign: "left" }}>

              <div className={styles.cardHeader}>
                <div>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💈</div>
                  <h3 style={{ color: "#fff", margin: 0, fontSize: 18 }}>{cita.barbero_nombre}</h3>
                </div>
                <span className={`badge ${
                  cita.estado === "pendiente"  ? "pending"
                  : cita.estado === "confirmada" ? styles.badgeConfirmada
                  : cita.estado === "finalizada" ? "done"
                  : styles.badgeCancelada
                }`}>
                  {cita.estado === "pendiente"  ? "Próxima"
                    : cita.estado === "confirmada" ? "Confirmada"
                    : cita.estado === "finalizada" ? "Completada"
                    : "Cancelada"}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Servicio</span>
                <span className={styles.infoValor}>{cita.servicio_nombre}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Fecha</span>
                <span className={styles.infoValor}>{formatearFecha(cita.fecha)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Hora</span>
                <span className={styles.infoValor}>{cita.hora}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sede</span>
                <span className={styles.infoValor}>{cita.sede_nombre || "—"}</span>
              </div>
              <div className={`${styles.infoRow} ${styles.noBorder}`}>
                <span className={styles.infoLabel}>Total</span>
                <span className={styles.infoTotal}>
                  ${(cita.servicio_precio || cita.precio || 0).toLocaleString("es-CO")}
                </span>
              </div>

              {/* Calificación existente */}
              {cita.calificacion && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 4px" }}>Tu valoración:</p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} style={{ color: n <= cita.calificacion ? "#facc15" : "#374151", fontSize: 18 }}>★</span>
                    ))}
                  </div>
                  {cita.comentario && (
                    <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4, fontStyle: "italic" }}>
                      "{cita.comentario}"
                    </p>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexDirection: "column" }}>
                
                {/*incluye pendiente o confirmada */}
                {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
                  <button
                    className={styles.btnCancelarCita}
                    onClick={() => cancelarCita(cita)}
                  >
                    Cancelar cita
                  </button>
                )}

                {cita.estado === "finalizada" && !cita.calificado && (
                  <button
                    onClick={() => setCitaAValorar(cita)}
                    style={{
                      padding: "10px", background: "rgba(250,204,21,0.1)",
                      border: "1px solid rgba(250,204,21,0.3)", color: "#facc15",
                      borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
                    }}
                  >
                    ⭐ Valorar servicio
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footerActions}>
        <button
          className="btn-primary"
          style={{ width: "auto", padding: "14px 36px" }}
          onClick={() => navigate("/agendar")}
        >
          + Agendar nueva cita
        </button>
      </div>
    </div>
  );
}
