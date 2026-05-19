import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Checkout.css";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const carrito = location.state?.carrito || [];

  const [direccion, setDireccion] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");

  const total = carrito.reduce((s, p) => s + p.precio, 0);

  function confirmarCompra() {
    if (metodoPago === "transferencia") {
      // 1. Armamos el mensaje para WhatsApp
      let mensaje = "💈 *Hola, quiero confirmar mi pedido de la tienda:*\n\n";
      
      carrito.forEach(p => {
        // Usamos toLocaleString("es-CO") para que los precios se vean bien formateados
        mensaje += `▪️ ${p.nombre} - $${p.precio.toLocaleString("es-CO")}\n`;
      });

      mensaje += `\n *Total a transferir: $${total.toLocaleString("es-CO")}*`;
      mensaje += "\n\nQuedo atento a los datos para realizar la transferencia.";

      // 2. Número de la barbería (Asegúrate de dejar el 57 al inicio)
      const numeroWhatsApp = "573005782087"; // Tu número real
      
      // 3. Creamos el enlace oficial de WhatsApp
      const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
      
      // 4. Abrimos WhatsApp en una pestaña nueva
      window.open(url, "_blank");

      // 5. Redirigir al usuario al inicio después de enviarlo a WhatsApp
      navigate("/");

    } else {
      // Lógica para cuando eligen efectivo en el local
      alert("¡Pedido reservado! Págalo en efectivo al reclamarlo en la barbería.");
      navigate("/");
    }
  }

  function cancelarCompra() {
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
        <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>

        <h2 style="margin-bottom: 10px;">¿Cancelar compra?</h2>

        <p style="
          font-size: 14px;
          color: #9ca3af;
          margin-bottom: 24px;
        ">
          Si sales ahora, perderás los productos seleccionados.
        </p>

        <div style="display:flex; gap:12px; justify-content:center;">
          <button id="confirmar-cancelar"
            style="
              background: #00d655;
              color: #000;
              border: none;
              border-radius: 8px;
              padding: 10px 18px;
              font-weight: 600;
              cursor: pointer;
            ">
            Sí, cancelar
          </button>

          <button id="seguir-compra"
            style="
              background: transparent;
              color: #9ca3af;
              border: 1px solid rgba(255,255,255,0.25);
              border-radius: 8px;
              padding: 10px 18px;
              cursor: pointer;
            ">
            Seguir comprando
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cerrar = () => document.body.removeChild(overlay);

    overlay.querySelector("#confirmar-cancelar").onclick = () => {
      cerrar();
      navigate("/tienda");
    };

    overlay.querySelector("#seguir-compra").onclick = cerrar;
  }

  return (
    <div className="checkout-container">
      <h1>Finalizar compra</h1>

      {/* PRODUCTOS */}
      <section className="checkout-card">
        <h2>Productos</h2>

        {carrito.length === 0 ? (
          <p>No hay productos en el carrito.</p>
        ) : (
          carrito.map(p => (
            <div key={p.idCarrito} className="checkout-item">
              
              <div className="checkout-item-left">
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  className="checkout-item-image"
                />
                <span className="checkout-item-name">
                  {p.nombre}
                </span>
              </div>

              <span className="checkout-item-price">
                ${p.precio}
              </span>

            </div>
          ))
        )}

        <div className="checkout-total">
          Total: <strong>${total.toFixed(2)}</strong>
        </div>
      </section>

      {/* MÉTODO DE PAGO */}
      <section className="checkout-card">
        <h2>Método de pago</h2>
        <select
          value={metodoPago}
          onChange={e => setMetodoPago(e.target.value)}
        >
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </section>

      {/* CONFIRMAR */}
      <button
        className="checkout-confirm-button"
        onClick={confirmarCompra}
        disabled={carrito.length === 0}
      >
        Confirmar compra
      </button>

      <button
        onClick={cancelarCompra}
        style={{
          marginTop: "12px",
          width: "100%",
          padding: "14px",
          borderRadius: "14px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#9ca3af",
          cursor: "pointer"
        }}
      >
        Cancelar compra
      </button>
    </div>
  );
}