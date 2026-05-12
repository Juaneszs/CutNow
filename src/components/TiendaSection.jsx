import React, { useState, useEffect } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import './TiendaSection.css';

// --- Iconos SVG ---
const CartIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

// --- Componentes Pequeños ---
const ProductCard = ({ producto, agregarSeguro }) => {
  return (
    <div className="product-card">
      <div className="product-card-image-wrapper">
        <img src={producto.imagen} alt={producto.nombre} className="product-card-image" />
        <div className="product-card-image-shadow"></div>
      </div>

      <div className="product-card-details">
        <h3 className="product-card-name">{producto.nombre}</h3>
        <p className="product-card-price">${producto.precio}</p>
        <p className="product-card-shipping" style={{ color: '#00d655', fontWeight: '500' }}>
          📍 Recogida en local
        </p>
      </div>

      <button
        className="product-card-add-button"
        onClick={() => agregarSeguro(producto)}
      >
        <CartIcon />
        Añadir al Carrito
      </button>
    </div>
  );
};


const CartSidebar = ({ productosCarrito, eliminarDelCarrito }) => {
  const navigate = useNavigate();

  const total = productosCarrito.reduce(
    (suma, item) => suma + item.precio,
    0
  );

  return (
    <aside className="cart-sidebar">
      <h2 className="cart-sidebar-title">
        Carrito {productosCarrito.length > 0 && `(${productosCarrito.length})`}
      </h2>

      <div className="cart-sidebar-items">
        {productosCarrito.length === 0 ? (
          <p style={{ color: "#aaa", textAlign: "center" }}>
            Tu carrito está vacío
          </p>
        ) : (
          productosCarrito.map(producto => (
            <div
              key={producto.idCarrito}
              className="cart-sidebar-item"
            >
              <img
                src={producto.imagen}
                alt={producto.nombre}
                className="cart-sidebar-item-image"
              />

              <div className="cart-sidebar-item-details">
                <p className="cart-sidebar-item-name">
                  {producto.nombre}
                </p>
                <p className="cart-sidebar-item-price">
                  ${producto.precio}
                </p>
              </div>

              <button
                onClick={() =>
                  eliminarDelCarrito(producto.idCarrito)
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#ff4444",
                  cursor: "pointer",
                  fontSize: "18px"
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="cart-sidebar-summary">
        <p className="cart-sidebar-total-label">Total</p>
        <p className="cart-sidebar-total-amount">
          ${total.toFixed(2)}
        </p>
      </div>

      {/* AQUÍ ESTÁ EL CAMBIO IMPORTANTE */}
      <button
        className="cart-sidebar-checkout-button"
        disabled={productosCarrito.length === 0}
        style={{
          opacity: productosCarrito.length === 0 ? 0.5 : 1
        }}
        onClick={() => navigate("/checkout", { state: { carrito: productosCarrito } })}
      >
        Continuar compra
      </button>
    </aside>
  );
}

// --- COMPONENTE PRINCIPAL ---
const TiendaSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Herramientas');
  const [carrito, setCarrito] = useState(() => {
  const guardado = localStorage.getItem("carrito");
  return guardado ? JSON.parse(guardado) : [];
  });
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarTienda() {
      const snap = await getDocs(collection(db, "Productos"));
      const datos = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProductos(datos);
      setCargando(false);
    }
    cargarTienda();
  }, []);
  useEffect(() => {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}, [carrito]);


  const agregarAlCarrito = (producto) => {
    const nuevoProducto = { ...producto, idCarrito: Date.now() + Math.random() };
    setCarrito([...carrito, nuevoProducto]);
  };

  // MODIFICACIÓN FUNCIONAL
  const agregarSeguro = (producto) => {
    if (!user) {
      showAuthAlert(navigate);
      return;
    }
    agregarAlCarrito(producto);
  };

  const eliminarDelCarrito = (idCarrito) => {
    setCarrito(carrito.filter(item => item.idCarrito !== idCarrito));
  };

  const tabs = [
    { nombre: 'Herramientas', icono: '✂️' },
    { nombre: 'Productos', icono: '🧴' },
    { nombre: 'Accesorios', icono: '🛍️' }
  ];

  const productosFiltrados = productos.filter(p => p.categoria === activeTab);

  return (
    <div className="store-section-container">
      <div className="store-section-main-content">
        <header className="store-section-header">
          <h1 className="store-section-title">
            Tu Kit de Barbería de <span className="text-green">Élite, al instante.</span>
          </h1>
          <p className="store-section-subtitle">
            Equípate con lo mejor. CutNow presenta su exclusiva tienda profesional.
          </p>
        </header>

        <nav className="store-section-filters">
          {tabs.map(tab => (
            <button
              key={tab.nombre}
              className={`store-section-filter-button ${activeTab === tab.nombre ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.nombre)}
            >
              <span style={{ fontSize: '18px' }}>{tab.icono}</span>
              {tab.nombre}
            </button>
          ))}
        </nav>

        {cargando ? (
          <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
            Cargando inventario premium...
          </p>
        ) : (
          <div className="product-grid">
            {productosFiltrados.map(producto => (
              <ProductCard
                key={producto.id}
                producto={producto}
                agregarSeguro={agregarSeguro}
              />
            ))}
          </div>
        )}
      </div>

      <CartSidebar
        productosCarrito={carrito}
        eliminarDelCarrito={eliminarDelCarrito}
      />
    </div>
  );
};

export default TiendaSection;

// --- MISMO MENSAJE QUE MIS CITAS / PROTECTED ROUTE ---
function showAuthAlert(navigate) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  overlay.innerHTML = `
    <div style="
      background: #101010;
      color: #fff;
      border-radius: 18px;
      padding: 36px 32px;
      width: 100%;
      max-width: 380px;
      text-align: center;
      border: 1px solid rgba(0,214,85,0.35);
      box-shadow: 0 0 40px rgba(0,0,0,0.7);
    ">
      <div style="font-size: 40px; margin-bottom: 12px;">✂️</div>

      <h2 style="
        margin: 0 0 10px;
        font-size: 20px;
        font-weight: 700;
      ">
        Acceso Restringido
      </h2>

      <p style="
        font-size: 14px;
        color: #9ca3af;
        margin-bottom: 24px;
        line-height: 1.4;
      ">
        Debes iniciar sesión o registrarte para gestionar tu perfil.
      </p>

      <div style="
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-bottom: 16px;
      ">
        <button id="al-login"
          style="
            background: #00d655;
            color: #000;
            border: none;
            border-radius: 8px;
            padding: 10px 18px;
            font-weight: 600;
            cursor: pointer;
          ">
          Iniciar sesión
        </button>

        <button id="al-reg"
          style="
            background: transparent;
            color: #00d655;
            border: 1px solid #00d655;
            border-radius: 8px;
            padding: 10px 18px;
            font-weight: 600;
            cursor: pointer;
          ">
          Registrarse
        </button>
      </div>

      <button id="al-cancel"
        style="
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
        ">
        Cancelar
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  const remove = () => document.body.removeChild(overlay);

  overlay.querySelector("#al-login").onclick = () => {
    remove();
    navigate("/");
  };

  overlay.querySelector("#al-reg").onclick = () => {
    remove();
    navigate("/registro");
  };

  overlay.querySelector("#al-cancel").onclick = remove;
}