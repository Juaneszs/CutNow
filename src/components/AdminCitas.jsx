// src/components/AdminCitas.jsx
import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, serverTimestamp, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

/* ──────────────────────────────────────────────────────────
   Badge de estado
────────────────────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const map = {
    pendiente:  { label: "Pendiente",   bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
    confirmada: { label: "Confirmada",  bg: "rgba(99,102,241,0.15)",  color: "#818cf8" },
    finalizada: { label: "Finalizada",  bg: "rgba(0,200,83,0.15)",    color: "#00c853" },
    cancelada:  { label: "Cancelada",   bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  };
  const s = map[estado] || map.pendiente;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    }}>
      {s.label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────
   Modal de confirmación antes de "Completar"
────────────────────────────────────────────────────────── */
function ModalCompletar({ cita, onConfirmar, onCancelar }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "rgba(18,18,18,0.98)", border: "1px solid rgba(0,200,83,0.25)",
        borderRadius: 16, padding: "36px 32px", maxWidth: 380, width: "90%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 20 }}>¿Completar cita?</h3>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 6px" }}>
          <strong style={{ color: "#fff" }}>{cita.usuario_nombre}</strong> — {cita.servicio_nombre}
        </p>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 28px" }}>
          {cita.barbero_nombre} · {cita.fecha} {cita.hora}
        </p>
        <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
          La cita pasará a <strong style={{ color: "#00c853" }}>Finalizada</strong> y el cliente
          podrá calificar el servicio.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1, padding: "12px", background: "linear-gradient(135deg,#00c853,#00b34a)",
              color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer",
            }}
          >
            Sí, completar
          </button>
          <button
            onClick={onCancelar}
            style={{
              padding: "12px 20px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af",
              borderRadius: 8, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Tarjeta de cita (Admin)
────────────────────────────────────────────────────────── */
function CitaAdminCard({ cita, onAceptar, onCompletar, cargandoId }) {
  const ocupado = cargandoId === cita.id;

  const fila = (label, valor, highlight = false) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13,
    }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ color: highlight ? "#00c853" : "#d1d5db", fontWeight: highlight ? 700 : 400 }}>
        {valor}
      </span>
    </div>
  );

  return (
    <div style={{
      background: "rgba(18,18,18,0.9)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "20px", backdropFilter: "blur(10px)",
      transition: "border-color .2s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,200,83,0.2)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15, margin: 0 }}>
            {cita.usuario_nombre || "Cliente"}
          </p>
          <p style={{ color: "#9ca3af", fontSize: 12, margin: "2px 0 0" }}>
            {cita.servicio_nombre}
          </p>
        </div>
        <EstadoBadge estado={cita.estado} />
      </div>

      {/* Info */}
      {fila("💈 Barbero", cita.barbero_nombre)}
      {fila("📅 Fecha", cita.fecha)}
      {fila("⏰ Hora", cita.hora)}
      {fila("🏠 Sede", cita.sede_nombre || "—")}
      {fila("💵 Total", `$${(cita.precio || 0).toLocaleString("es-CO")}`, true)}

      {/* Calificación si existe */}
      {cita.calificacion && (
        <div style={{ marginTop: 12, padding: "10px 0 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 4px" }}>Calificación del cliente:</p>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ color: n <= cita.calificacion ? "#facc15" : "#374151", fontSize: 16 }}>★</span>
            ))}
            <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 6 }}>({cita.calificacion}/5)</span>
          </div>
          {cita.comentario && (
            <p style={{ color: "#6b7280", fontSize: 12, margin: "6px 0 0", fontStyle: "italic" }}>
              "{cita.comentario}"
            </p>
          )}
        </div>
      )}

      {/* Acciones — solo para admin */}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {cita.estado === "pendiente" && (
          <button
            onClick={() => onAceptar(cita)}
            disabled={ocupado}
            style={{
              flex: 1, padding: "9px", fontSize: 13, fontWeight: 600,
              background: "rgba(99,102,241,0.15)", color: "#818cf8",
              border: "1px solid rgba(99,102,241,0.35)", borderRadius: 8,
              cursor: ocupado ? "not-allowed" : "pointer", opacity: ocupado ? 0.6 : 1,
              transition: "all .2s",
            }}
          >
            {ocupado ? "..." : "✓ Aceptar"}
          </button>
        )}
        {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
          <button
            onClick={() => onCompletar(cita)}
            disabled={ocupado}
            style={{
              flex: 1, padding: "9px", fontSize: 13, fontWeight: 600,
              background: "linear-gradient(135deg,#00c853,#00b34a)",
              color: "#fff", border: "none", borderRadius: 8,
              cursor: ocupado ? "not-allowed" : "pointer", opacity: ocupado ? 0.6 : 1,
              transition: "all .2s",
            }}
          >
            {ocupado ? "Guardando..." : "✅ Completar"}
          </button>
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

  const [tabActivo, setTabActivo] = useState("activas"); // "activas" | "historial"
  const [citasActivas, setCitasActivas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoId, setCargandoId] = useState(null);
  const [citaACompletar, setCitaACompletar] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [feedback, setFeedback] = useState(null); // { type: "ok"|"err", msg }

  /* ── Guard: solo admins ── */
  useEffect(() => {
    if (authCargando) return;
    if (!user || !isAdmin) navigate("/");
  }, [user, isAdmin, authCargando, navigate]);

  /* ── Suscripción en tiempo real: citas activas (pendiente + confirmada) ── */
  useEffect(() => {
    if (authCargando || !isAdmin) return;

    const qActivas = query(
      collection(db, "citas"),
      where("estado", "in", ["pendiente", "confirmada"]),
      orderBy("fecha", "asc"),
      orderBy("hora", "asc")
    );

    const unsubActivas = onSnapshot(qActivas, snap => {
      setCitasActivas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });

    return () => unsubActivas();
  }, [isAdmin, authCargando]);

  /* ── Suscripción: historial finalizado ── */
  useEffect(() => {
    if (authCargando || !isAdmin) return;

    const qHist = query(
      collection(db, "citas"),
      where("estado", "==", "finalizada"),
      orderBy("fecha", "desc")
    );

    const unsubHist = onSnapshot(qHist, snap => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubHist();
  }, [isAdmin, authCargando]);

  /* ── Acción: Aceptar → confirmada ── */
  async function handleAceptar(cita) {
    if (!isAdmin) return;
    setCargandoId(cita.id);
    try {
      await updateDoc(doc(db, "citas", cita.id), {
        estado: "confirmada",
        confirmada_at: serverTimestamp(),
      });
      mostrarFeedback("ok", `✓ Cita de ${cita.usuario_nombre} confirmada`);
    } catch (e) {
      mostrarFeedback("err", "Error al aceptar la cita");
    } finally {
      setCargandoId(null);
    }
  }

  /* ── Acción: Completar → finalizada + recalcular promedio barbero ── */
  async function handleCompletar() {
    if (!isAdmin || !citaACompletar) return;
    const cita = citaACompletar;
    setCitaACompletar(null);
    setCargandoId(cita.id);

    try {
      // 1. Marcar la cita como finalizada
      await updateDoc(doc(db, "citas", cita.id), {
        estado: "finalizada",
        finalizada_at: serverTimestamp(),
      });

      // 2. Recalcular calificación promedio del barbero en tiempo real
      // (se hace leyendo todas las citas finalizadas de ese barbero)
      await recalcularPromedioBarbero(cita.barbero_id);

      mostrarFeedback("ok", `✅ Cita completada. Movida al historial.`);
    } catch (e) {
      mostrarFeedback("err", "Error al completar la cita");
    } finally {
      setCargandoId(null);
    }
  }

  /* ── Recalcular promedio del barbero (se llama también desde MisCitas al calificar) ── */
  async function recalcularPromedioBarbero(barberoId) {
    try {
      const snapCitas = await import("firebase/firestore").then(({ getDocs, query, collection, where }) =>
        getDocs(query(
          collection(db, "citas"),
          where("barbero_id", "==", barberoId),
          where("estado", "==", "finalizada")
        ))
      );
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

  function mostrarFeedback(type, msg) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  }

  /* ── Filtro por búsqueda ── */
  const filtrar = (lista) => {
    if (!busqueda.trim()) return lista;
    const b = busqueda.toLowerCase();
    return lista.filter(c =>
      (c.usuario_nombre || "").toLowerCase().includes(b) ||
      (c.barbero_nombre || "").toLowerCase().includes(b) ||
      (c.servicio_nombre || "").toLowerCase().includes(b) ||
      (c.fecha || "").includes(b)
    );
  };

  const citasFiltradas   = filtrar(citasActivas);
  const historialFiltrado = filtrar(historial);

  /* ── Resumen rápido ── */
  const pendientes   = citasActivas.filter(c => c.estado === "pendiente").length;
  const confirmadas  = citasActivas.filter(c => c.estado === "confirmada").length;
  const finalizadas  = historial.length;
  const ingresoHoy   = historial
    .filter(c => c.fecha === new Date().toISOString().split("T")[0])
    .reduce((s, c) => s + (Number(c.precio) || 0), 0);

  /* ────────────────────────────────────────────────────── */
  if (authCargando || (cargando && isAdmin)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ color: "#9ca3af" }}>Cargando citas...</p>
      </div>
    );
  }

  const card = {
    background: "rgba(18,18,18,0.9)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14, padding: "20px 24px", backdropFilter: "blur(10px)",
  };

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Modal completar */}
      {citaACompletar && (
        <ModalCompletar
          cita={citaACompletar}
          onConfirmar={handleCompletar}
          onCancelar={() => setCitaACompletar(null)}
        />
      )}

      {/* Toast feedback */}
      {feedback && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 8888,
          background: feedback.type === "ok" ? "rgba(0,200,83,0.95)" : "rgba(239,68,68,0.95)",
          color: "#fff", padding: "14px 22px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "fadeIn .3s ease",
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Título */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>
          Gestión de <span style={{ color: "var(--accent)" }}>Citas</span>
        </h1>
        <p style={{ color: "#9ca3af", marginTop: 8, fontSize: 15 }}>
          Acepta, confirma y completa las citas de tus clientes
        </p>
      </div>

      {/* Cards resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { icon: "⏳", label: "Pendientes",  value: pendientes,  color: "#fbbf24" },
          { icon: "✓",  label: "Confirmadas", value: confirmadas,  color: "#818cf8" },
          { icon: "✅", label: "Finalizadas", value: finalizadas,  color: "#00c853" },
          { icon: "$",  label: "Ingresos hoy",value: `$${ingresoHoy.toLocaleString("es-CO")}`, color: "#00c853" },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: `${s.color}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: s.color, flexShrink: 0,
            }}>{s.icon}</div>
            <div>
              <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>{s.label}</p>
              <p style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "2px 0 0" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="🔍  Buscar por cliente, barbero, servicio o fecha..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {[
          { key: "activas",   label: `📋 Activas (${citasActivas.length})` },
          { key: "historial", label: `📁 Historial (${historial.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTabActivo(t.key)}
            style={{
              padding: "10px 24px", borderRadius: 24, fontSize: 14, fontWeight: 600,
              cursor: "pointer", border: "1px solid",
              background:     tabActivo === t.key ? "var(--accent)" : "transparent",
              color:          tabActivo === t.key ? "#000" : "#9ca3af",
              borderColor:    tabActivo === t.key ? "var(--accent)" : "#333",
              boxShadow:      tabActivo === t.key ? "0 0 16px rgba(0,200,83,0.35)" : "none",
              transition: "all .2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CITAS ACTIVAS ── */}
      {tabActivo === "activas" && (
        <>
          {/* Sub-secciones: Pendiente / Confirmada */}
          {["pendiente", "confirmada"].map(estado => {
            const grupo = citasFiltradas.filter(c => c.estado === estado);
            if (grupo.length === 0) return null;
            return (
              <div key={estado} style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{
                    height: 2, flex: 1,
                    background: estado === "pendiente" ? "#fbbf24" : "#818cf8",
                    opacity: 0.4, borderRadius: 1,
                  }} />
                  <h2 style={{
                    color: estado === "pendiente" ? "#fbbf24" : "#818cf8",
                    fontSize: 15, fontWeight: 600, margin: 0, whiteSpace: "nowrap",
                  }}>
                    {estado === "pendiente" ? "⏳ Por confirmar" : "✓ Confirmadas"}
                    <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                      ({grupo.length})
                    </span>
                  </h2>
                  <div style={{
                    height: 2, flex: 1,
                    background: estado === "pendiente" ? "#fbbf24" : "#818cf8",
                    opacity: 0.4, borderRadius: 1,
                  }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
                  {grupo.map(cita => (
                    <CitaAdminCard
                      key={cita.id}
                      cita={cita}
                      onAceptar={handleAceptar}
                      onCompletar={c => setCitaACompletar(c)}
                      cargandoId={cargandoId}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {citasFiltradas.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
              <p style={{ color: "#9ca3af", fontSize: 16 }}>
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
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📂</div>
              <p style={{ color: "#9ca3af", fontSize: 16 }}>
                {busqueda ? "No hay resultados para tu búsqueda." : "Aún no hay citas finalizadas."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
              {historialFiltrado.map(cita => (
                <CitaAdminCard
                  key={cita.id}
                  cita={cita}
                  onAceptar={() => {}}
                  onCompletar={() => {}}
                  cargandoId={null}
                />
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
