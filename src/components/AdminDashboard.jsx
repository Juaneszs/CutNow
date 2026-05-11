import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// Mini Bar Chart usando SVG puro (sin dependencias extra)
function BarChart({ data, label }) {
  if (!data || data.length === 0) return <p style={{ color: "#6b7280", textAlign: "center" }}>Sin datos</p>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 360, H = 180, PAD = 40, barW = Math.min(48, (W - PAD * 2) / data.length - 8);

  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} style={{ width: "100%", maxWidth: W }}>
      {/* Grid lines */}
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
            <rect
              x={x} y={y} width={barW} height={barH}
              fill="url(#greenGrad)" rx="4"
            />
            <text x={x + barW / 2} y={PAD + H + 16} fill="#9ca3af" fontSize="11" textAnchor="middle">
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 6} fill="#00c853" fontSize="11" textAnchor="middle" fontWeight="600">
              {d.value}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c853" />
          <stop offset="100%" stopColor="#00b34a" stopOpacity="0.7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Mini Line Chart SVG puro
function LineChart({ data }) {
  if (!data || data.length === 0) return <p style={{ color: "#6b7280", textAlign: "center" }}>Sin datos</p>;
  const W = 360, H = 160, PAD = 44;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const xs = data.map((_, i) => PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2));
  const ys = data.map(d => PAD + (1 - d.value / maxVal) * H);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${path} L${xs[xs.length - 1]},${PAD + H} L${xs[0]},${PAD + H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H + 50}`} style={{ width: "100%", maxWidth: W }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c853" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00c853" stopOpacity="0" />
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
      <path d={path} fill="none" stroke="#00c853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="4" fill="#00c853" stroke="#000" strokeWidth="2" />
          <text x={x} y={PAD + H + 16} fill="#9ca3af" fontSize="10" textAnchor="middle">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Star rating display
function Stars({ value }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= Math.round(value) ? "#facc15" : "#374151", fontSize: 16 }}>★</span>
      ))}
      <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 6 }}>{value.toFixed(1)}</span>
    </span>
  );
}

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

      // --- Métricas globales ---
      const totalCitas = citas.length;
      // "finalizada" es el estado definitivo que marca una cita como completada por el admin
      const citasCompletadas = citas.filter(c => c.estado === "finalizada").length;
      const ingresoTotal = citas
        .filter(c => c.estado === "finalizada")
        .reduce((s, c) => s + (Number(c.precio) || 0), 0);

      // --- Ganancias por barbero ---
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

      // --- Ingresos por mes (últimos 6 meses) ---
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ color: "#9ca3af" }}>Cargando panel...</p>
      </div>
    );
  }

  if (!stats) return null;

  const card = {
    background: "rgba(20,20,20,0.88)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14, padding: "24px", backdropFilter: "blur(12px)",
  };

  const statCard = (icon, label, value, sub, color = "var(--accent)") => (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12, background: `${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>{label}</p>
        <p style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "4px 0 2px" }}>{value}</p>
        {sub && <p style={{ color, fontSize: 13, margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
          Panel de Control <span style={{ color: "var(--accent)" }}>Administrativo</span>
        </h1>
        <p style={{ color: "#9ca3af", marginTop: 8 }}>
          Gestiona tu negocio: monitorea estadísticas en tiempo real, evalúa el rendimiento de tus barberos y verifica las ganancias generadas.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 20, marginBottom: 32 }}>
        {statCard("👥", "Clientes activos", stats.totalClientes.toLocaleString(), "+activos en el sistema")}
        {statCard("$", "Ingresos totales", `$${stats.ingresoTotal.toLocaleString()}`, "Citas completadas", "#00c853")}
        {statCard("📅", "Total citas", stats.totalCitas, `${stats.citasCompletadas} completadas`, "#818cf8")}
        {statCard("✂️", "Barberos", stats.datosBarberos.length, "En el sistema", "#facc15")}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>

        {/* Ingresos mensuales */}
        <div style={card}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--accent)" }}>$</span> Ingresos mensuales
          </h3>
          <LineChart data={stats.ingresosMensuales} />
        </div>

        {/* Ganancias por barbero */}
        <div style={card}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--accent)" }}>✂️</span> Ganancias por barbero
          </h3>
          <BarChart
            data={stats.datosBarberos.map(b => ({ label: b.nombre.split(" ")[0], value: b.ganancias }))}
          />
        </div>
      </div>

      {/* Tabla de barberos */}
      <div style={card}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--accent)" }}>🏆</span> Rendimiento de barberos
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Barbero", "Total citas", "Ganancias", "Calificación promedio"].map(h => (
                  <th key={h} style={{ color: "#9ca3af", fontWeight: 500, padding: "10px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.datosBarberos.sort((a, b) => b.ganancias - a.ganancias).map((b, i) => (
                <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "14px 16px", color: "#fff", fontWeight: 600 }}>
                    {i === 0 && <span style={{ marginRight: 6 }}>🥇</span>}
                    {i === 1 && <span style={{ marginRight: 6 }}>🥈</span>}
                    {i === 2 && <span style={{ marginRight: 6 }}>🥉</span>}
                    {b.nombre}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#d1d5db" }}>{b.totalCitas}</td>
                  <td style={{ padding: "14px 16px", color: "var(--accent)", fontWeight: 600 }}>
                    ${b.ganancias.toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {b.calificacionPromedio > 0
                      ? <Stars value={b.calificacionPromedio} />
                      : <span style={{ color: "#6b7280", fontSize: 13 }}>Sin calificaciones</span>}
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
