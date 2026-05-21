import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Styles/AdminDashboard.css";

// --- Componentes Pequeños (Gráficas y Estrellas) ---

function BarChart({ data }) {
  if (!data || data.length === 0) return <p className="admin-empty-text">Sin datos</p>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 360, H = 180, PAD = 40, barW = Math.min(48, (W - PAD * 2) / data.length - 8);

  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} className="admin-chart-svg">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = PAD + (1 - t) * H;
        return (
          <g key={i}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD - 6} y={y + 4} fill="#6b7280" fontSize="10" textAnchor="end">
              {Math.round(maxVal * t)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const totalW = W - PAD * 2;
        const slot = totalW / data.length;
        const x = PAD + slot * i + slot / 2 - barW / 2;
        const barH = (d.value / maxVal) * H;
        const y = PAD + H - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="url(#greenGrad)" rx="4" />
            <text x={x + barW / 2} y={PAD + H + 16} fill="#9ca3af" fontSize="11" textAnchor="middle">
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 6} fill="#00d655" fontSize="11" textAnchor="middle" fontWeight="600">
              {d.value}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d655" />
          <stop offset="100%" stopColor="#00993d" stopOpacity="0.7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LineChart({ data }) {
  if (!data || data.length === 0) return <p className="admin-empty-text">Sin datos</p>;
  const W = 360, H = 160, PAD = 44;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const xs = data.map((_, i) => PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2));
  const ys = data.map(d => PAD + (1 - d.value / maxVal) * H);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${path} L${xs[xs.length - 1]},${PAD + H} L${xs[0]},${PAD + H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H + 50}`} className="admin-chart-svg">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d655" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00d655" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => {
        const y = PAD + (1 - t) * H;
        return (
          <g key={i}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD - 6} y={y + 4} fill="#6b7280" fontSize="10" textAnchor="end">
              ${Math.round(maxVal * t)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke="#00d655" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="4" fill="#00d655" stroke="#000" strokeWidth="2" />
          <text x={x} y={PAD + H + 16} fill="#9ca3af" fontSize="10" textAnchor="middle">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Stars({ value }) {
  return (
    <span className="star-rating-container">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className="star-icon" style={{ color: n <= Math.round(value) ? "#facc15" : "#374151" }}>
          ★
        </span>
      ))}
      <span className="star-text">{value.toFixed(1)}</span>
    </span>
  );
}

// --- COMPONENTE PRINCIPAL ---

export default function AdminDashboard() {
  const { user, isAdmin, cargando: authCargando } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (authCargando) return;
    if (!user || !isAdmin) {
      navigate("/");
      return;
    }
    cargarDatos();
  }, [user, isAdmin, authCargando]);

  async function cargarDatos() {
    try {
      const snapCitas = await getDocs(collection(db, "citas"));
      const snapBarberos = await getDocs(collection(db, "Barberos"));

      const citas = snapCitas.docs.map(d => ({ id: d.id, ...d.data() }));
      const barberos = snapBarberos.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalCitas = citas.length;
      const citasCompletadas = citas.filter(c => c.estado === "finalizada").length;
      const ingresoTotal = citas
        .filter(c => c.estado === "finalizada")
        .reduce((s, c) => s + (Number(c.precio) || 0), 0);

      const gananciasPorBarbero = {};
      const calificacionesPorBarbero = {};

      citas.forEach(c => {
        const id = c.barbero_id;
        if (!id) return;
        if (!gananciasPorBarbero[id]) gananciasPorBarbero[id] = 0;
        if (c.estado === "finalizada") {
          gananciasPorBarbero[id] += Number(c.precio) || 0;
        }
        if (c.calificacion) {
          if (!calificacionesPorBarbero[id]) calificacionesPorBarbero[id] = [];
          calificacionesPorBarbero[id].push(Number(c.calificacion));
        }
      });

      const datosBarberos = barberos.map(b => ({
        id: b.id,
        nombre: b.Nombre || b.nombre || "Barbero",
        ganancias: gananciasPorBarbero[b.id] || 0,
        calificacionPromedio: calificacionesPorBarbero[b.id]?.length
          ? calificacionesPorBarbero[b.id].reduce((a, v) => a + v, 0) / calificacionesPorBarbero[b.id].length
          : 0,
        totalCitas: citas.filter(c => c.barbero_id === b.id).length,
      }));

      const ahora = new Date();
      const meses = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        meses.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          label: d.toLocaleString("es", { month: "short" }),
          value: 0,
        });
      }
      
      citas.filter(c => c.estado === "finalizada").forEach(c => {
        if (!c.fecha) return;
        const mes = c.fecha.slice(0, 7);
        const entry = meses.find(m => m.key === mes);
        if (entry) entry.value += Number(c.precio) || 0;
      });

      setStats({
        totalCitas,
        citasCompletadas,
        ingresoTotal,
        datosBarberos,
        ingresosMensuales: meses,
        totalClientes: [...new Set(citas.map(c => c.usuario_id))].length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  if (authCargando || cargando) {
    return (
      <div className="admin-loading-container">
        <p className="admin-loading-text">Cargando panel...</p>
      </div>
    );
  }

  if (!stats) return null;

  // Tarjeta de estadística reutilizable (Mantiene solo los colores dinámicos inline)
  const statCard = (icon, label, value, sub, color = "#00d655") => (
    <div className="admin-card admin-stat-card">
      <div className="admin-stat-icon" style={{ background: `${color}22` }}>
        {icon}
      </div>
      <div className="admin-stat-content">
        <p className="admin-stat-label">{label}</p>
        <p className="admin-stat-value">{value}</p>
        {sub && <p className="admin-stat-sub" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-container">
      
      {/* Header */}
      <div className="admin-header">
        <h1 className="admin-title">
          Panel de Control <span className="text-green">Administrativo</span>
        </h1>
        <p className="admin-subtitle">
          Gestiona tu negocio: monitorea estadísticas en tiempo real, evalúa el rendimiento de tus barberos y verifica las ganancias generadas.
        </p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="admin-stats-grid">
        {statCard("👥", "Clientes activos", stats.totalClientes.toLocaleString(), "+activos en el sistema", "#fff")}
        {statCard("$", "Ingresos totales", `$${stats.ingresoTotal.toLocaleString()}`, "Citas completadas", "#00d655")}
        {statCard("📅", "Total citas", stats.totalCitas, `${stats.citasCompletadas} completadas`, "#818cf8")}
        {statCard("✂️", "Barberos", stats.datosBarberos.length, "En el sistema", "#facc15")}
      </div>

      {/* Gráficos */}
      <div className="admin-charts-row">
        {/* Ingresos mensuales */}
        <div className="admin-card">
          <h3 className="admin-card-title">
            <span className="text-green">$</span> Ingresos mensuales
          </h3>
          <LineChart data={stats.ingresosMensuales} />
        </div>

        {/* Ganancias por barbero */}
        <div className="admin-card">
          <h3 className="admin-card-title">
            <span className="text-green">✂️</span> Ganancias por barbero
          </h3>
          <BarChart
            data={stats.datosBarberos.map(b => ({ label: b.nombre.split(" ")[0], value: b.ganancias }))}
          />
        </div>
      </div>

      {/* Tabla de barberos */}
      <div className="admin-card">
        <h3 className="admin-card-title">
          <span className="text-green">🏆</span> Rendimiento de barberos
        </h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                {["Barbero", "Total citas", "Ganancias", "Calificación promedio"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.datosBarberos.sort((a, b) => b.ganancias - a.ganancias).map((b, i) => (
                <tr key={b.id}>
                  <td className="td-barber">
                    {i === 0 && <span className="medal">🥇</span>}
                    {i === 1 && <span className="medal">🥈</span>}
                    {i === 2 && <span className="medal">🥉</span>}
                    {b.nombre}
                  </td>
                  <td className="td-citas">{b.totalCitas}</td>
                  <td className="td-ganancias">${b.ganancias.toLocaleString()}</td>
                  <td>
                    {b.calificacionPromedio > 0
                      ? <Stars value={b.calificacionPromedio} />
                      : <span className="star-empty">Sin calificaciones</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}