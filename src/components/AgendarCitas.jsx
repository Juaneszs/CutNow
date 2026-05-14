// src/components/AgendarCitas.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection, getDocs, doc, getDoc,
  runTransaction, arrayUnion, query,
  where, serverTimestamp, updateDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import "./AgendarCitas.css";

export default function AgendarCitas() {
  const navigate = useNavigate();
  const location = useLocation();
  const barberoDesdeCatalogo = location.state?.barberoElegido || null;

  // ── Datos de Firestore ────────────────────────────────────
  const [sedes, setSedes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);

  // ── Elecciones del usuario ────────────────────────────────
  const [sedeElegida, setSedeElegida] = useState(null);
  const [servicioElegido, setServicioElegido] = useState(null);
  const [barberoElegido, setBarberoElegido] = useState(null);
  const [fechaElegida, setFechaElegida] = useState("");
  const [horaElegida, setHoraElegida] = useState("");

  // ── UI ────────────────────────────────────────────────────
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      try {
        const [snapSedes, snapServicios] = await Promise.all([
          getDocs(query(collection(db, "Sedes"), where("activa", "==", true))),
          getDocs(query(collection(db, "Servicios"), where("activo", "==", true))),
        ]);
        setSedes(snapSedes.docs.map(d => ({ id: d.id, ...d.data() })));
        setServicios(snapServicios.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        setError("No se pudieron cargar los datos. Recarga la página.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // ── Preseleccionar barbero si viene del catálogo ──────────
  useEffect(() => {
    if (barberoDesdeCatalogo) {
      setBarberoElegido(barberoDesdeCatalogo);
    }
  }, [barberoDesdeCatalogo]);

  // ── Carga barberos cuando cambia la sede ─────────────────
  useEffect(() => {
    if (!sedeElegida) return;

    if (!barberoDesdeCatalogo) {
      setBarberoElegido(null);
    }

    setHoraElegida("");
    setHorasDisponibles([]);

    async function cargarBarberos() {
      const snap = await getDocs(
        query(
          collection(db, "Barberos"),
          where("sede_id", "==", sedeElegida.id),
          where("estado", "==", "activo")
        )
      );
      setBarberos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    cargarBarberos();
  }, [sedeElegida, barberoDesdeCatalogo]);

  // ── Carga horas cuando cambia barbero, fecha o servicio ──
  useEffect(() => {
    if (!barberoElegido || !fechaElegida || !servicioElegido) return;
    setHoraElegida("");

    async function cargarHoras() {
      const disponRef = doc(db, "Barberos", barberoElegido.id, "disponibilidad", fechaElegida);
      const disponSnap = await getDoc(disponRef);
      const ocupados = disponSnap.exists() ? disponSnap.data().slots_ocupados || [] : [];

      const duracion = servicioElegido.duracion_min || 30;
      const slots = [];
      for (let h = 8; h < 18; h++) {
        for (let m = 0; m < 60; m += duracion) {
          const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          if (!ocupados.includes(hora)) slots.push(hora);
        }
      }
      setHorasDisponibles(slots);
    }
    cargarHoras();
  }, [barberoElegido, fechaElegida, servicioElegido]);

  // ── Fecha mínima: mañana ──────────────────────────────────
  function fechaMinima() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().split("T")[0];
  }

  // ── Confirmar y guardar la cita en Firestore ─────────────
  async function confirmarCita() {
    if (!sedeElegida || !servicioElegido || !barberoElegido || !fechaElegida || !horaElegida) {
      setError("Por favor completa todos los pasos antes de confirmar.");
      return;
    }
    setError("");
    setGuardando(true);

    try {
      const usuario = auth.currentUser;
      const citaRef = doc(collection(db, "citas"));
      const disponRef = doc(db, "Barberos", barberoElegido.id, "disponibilidad", fechaElegida);

      await runTransaction(db, async (transaction) => {
        const disponSnap = await transaction.get(disponRef);
        const ocupados = disponSnap.exists() ? disponSnap.data().slots_ocupados || [] : [];

        if (ocupados.includes(horaElegida)) {
          throw new Error("Este horario ya fue tomado. Elige otro.");
        }

        transaction.set(citaRef, {
          usuario_id: usuario.uid,
          usuario_nombre: usuario.displayName || usuario.email,
          barbero_id: barberoElegido.id,
          barbero_nombre: barberoElegido.Nombre,
          servicio_id: servicioElegido.id,
          servicio_nombre: servicioElegido.NomCorte,
          servicio_precio: servicioElegido.Precio,
          sede_id: sedeElegida.id,
          sede_nombre: sedeElegida.NomSede,
          fecha: fechaElegida,
          hora: horaElegida,
          estado: "pendiente",
          precio: servicioElegido.Precio || 0,
          calificacion: null,
          calificado: false,
          fecha_creacion: serverTimestamp(),
        });

        transaction.set(disponRef, { slots_ocupados: arrayUnion(horaElegida) }, { merge: true });
      });

      setExito(true);
    } catch (e) {
      setError(e.message || "No se pudo agendar la cita. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function resetear() {
    setExito(false);
    setSedeElegida(null);
    setServicioElegido(null);
    setBarberoElegido(null);
    setFechaElegida("");
    setHoraElegida("");
    setError("");
  }

  const todoCompleto = sedeElegida && servicioElegido && barberoElegido && fechaElegida && horaElegida;
  const pasos = [sedeElegida, servicioElegido, barberoElegido, fechaElegida, horaElegida];

  // ── Pantalla de éxito
  if (exito) {
    return (
      <div className="exito-wrap">
        <div className="exito-card">
          <div className="exito-icono">✅</div>
          <h2 className="exito-titulo">¡Cita agendada!</h2>
          <p className="exito-detalle">{barberoElegido?.Nombre} · {servicioElegido?.NomCorte}</p>
          <p className="exito-fecha">{fechaElegida} · {horaElegida}</p>
          <p className="exito-precio">${servicioElegido?.Precio?.toLocaleString("es-CO")}</p>
          <div className="exito-btns">
            <button className="btn-ver-citas" onClick={() => navigate("/mis-citas")}>
              Ver mis citas
            </button>
            <button className="btn-agendar-otra" onClick={resetear}>
              Agendar otra
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla de carga
  if (cargando) {
    return <div className="agendar-cargando">Cargando...</div>;
  }

  // ── Pantalla principal
  return (
    <div className="agendar-pagina">
      <div className="agendar-contenedor">

        {/* TÍTULO */}
        <h1 className="agendar-titulo">
          <span className="header-logo">Agendar Cita</span>
        </h1>

        {/*barra de progreso */}
        <div className="agendar-progreso">
          {[1, 2, 3, 4, 5].map((n, i) => (
            <div
              key={n}
              className={`progreso-dot ${pasos[i] ? "completado" : ""}`}
            >
              {pasos[i] ? "✓" : n}
            </div>
          ))}
        </div>

        {/*error*/}
        {error && <div className="agendar-error">{error}</div>}

        {/*paso 1, sede */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">1</span> Elige Sede
          </label>
          <select
            className="agendar-select"
            value={sedeElegida?.id || ""}
            onChange={e => setSedeElegida(sedes.find(x => x.id === e.target.value) || null)}
          >
            <option value="">Selecciona una sede...</option>
            {sedes.map(sede => (
              <option key={sede.id} value={sede.id}>
                {sede.NomSede} — {sede.Ciudad}
              </option>
            ))}
          </select>
        </div>

        {/* PASO 2: SERVICIO */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">2</span> Elige Servicio
          </label>
          <select
            className="agendar-select"
            value={servicioElegido?.id || ""}
            onChange={e => setServicioElegido(servicios.find(x => x.id === e.target.value) || null)}
          >
            <option value="">Selecciona un servicio...</option>
            {servicios.map(serv => (
              <option key={serv.id} value={serv.id}>
                {serv.NomCorte} — ${serv.Precio?.toLocaleString("es-CO")} ({serv.duracion_min} min)
              </option>
            ))}
          </select>
        </div>

        {/* PASO 3: BARBERO */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">3</span> Elige Barbero
          </label>
          <select
            className="agendar-select"
            value={barberoElegido?.id || ""}
            disabled={barberoDesdeCatalogo || !sedeElegida}
            onChange={e => setBarberoElegido(barberos.find(x => x.id === e.target.value) || null)}
          >
            <option value="">
              {barberoDesdeCatalogo
                ? "Barbero seleccionado"
                : !sedeElegida
                ? "Primero elige una sede..."
                : "Selecciona un barbero..."}
            </option>
            {!barberoDesdeCatalogo && barberos.map(barb => (
              <option key={barb.id} value={barb.id}>
                {barb.Nombre} — {barb.especialidad}
              </option>
            ))}
          </select>
        </div>

        {/* PASO 4: FECHA */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">4</span> Fecha
          </label>
          <input
            type="date"
            className="agendar-fecha"
            min={fechaMinima()}
            value={fechaElegida}
            disabled={!barberoElegido}
            onChange={e => setFechaElegida(e.target.value)}
          />
        </div>

        {/* PASO 5: HORA */}
        <div className="agendar-grupo">
          <label className="agendar-label">
            <span className="agendar-numerito">5</span> Hora disponible
          </label>
          <select
            className="agendar-select"
            value={horaElegida}
            disabled={!fechaElegida}
            onChange={e => setHoraElegida(e.target.value)}
          >
            <option value="">
              {!fechaElegida
                ? "Primero elige una fecha..."
                : horasDisponibles.length === 0
                ? "Sin horas disponibles — elige otra fecha"
                : "Selecciona una hora..."}
            </option>
            {horasDisponibles.map(hora => (
              <option key={hora} value={hora}>{hora}</option>
            ))}
          </select>
        </div>

        {/* RESUMEN */}
        {todoCompleto && (
          <div className="agendar-resumen">
            <p className="agendar-resumen-titulo">Resumen de tu cita</p>
            {[
              ["Sede",     sedeElegida.NomSede],
              ["Servicio", servicioElegido.NomCorte],
              ["Barbero",  barberoElegido.Nombre],
              ["Fecha",    fechaElegida],
              ["Hora",     horaElegida],
            ].map(([label, valor]) => (
              <div key={label} className="agendar-resumen-fila">
                <span className="resumen-label">{label}</span>
                <span className="resumen-valor">{valor}</span>
              </div>
            ))}
            <div className="agendar-resumen-fila ultima">
              <span className="resumen-label">Total</span>
              <span className="resumen-precio">
                ${servicioElegido.Precio?.toLocaleString("es-CO")}
              </span>
            </div>
          </div>
        )}

        {/* BOTÓN CONFIRMAR */}
        <button
          className="agendar-btn-confirmar"
          onClick={confirmarCita}
          disabled={!todoCompleto || guardando}
        >
          {guardando ? "Agendando..." : "Confirmar cita"}
        </button>

      </div>
    </div>
  );
}