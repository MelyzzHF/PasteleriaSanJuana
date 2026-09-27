// frontend/src/pages/Carrito.jsx
import { Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';

export default function Carrito() {
  const {
    carrito,
    actualizarCantidad,
    eliminarDelCarrito,
    vaciarCarrito,
    totalItems,
    totalPrecio
  } = useCarrito();

  if (carrito.length === 0) {
    return (
      <div style={styles.vacioContainer}>
        <div style={styles.iconoVacio}>🧁</div>
        <h2 style={styles.tituloVacio}>Tu carrito está vacío</h2>
        <p style={styles.subtituloVacio}>
          Aún no has agregado delicias a tu pedido.
        </p>
        <Link to="/" style={styles.btnExplorar}>
          Ver Catálogo de Pasteles
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.titulo}>🛒 Carrito de Compras</h1>
        <button onClick={vaciarCarrito} style={styles.btnVaciar}>
          Vaciar carrito
        </button>
      </div>

      <div style={styles.layout}>
        {/* Lista de productos agregados */}
        <div style={styles.lista}>
          {carrito.map((item) => (
            <div key={item.id} style={styles.cardItem}>
              {item.imagen_url && (
                <img
                  src={item.imagen_url}
                  alt={item.nombre}
                  style={styles.imagen}
                />
              )}

              <div style={styles.detalles}>
                <h3 style={styles.nombreItem}>{item.nombre}</h3>
                <p style={styles.precioUnitario}>
                  ${Number(item.precio).toFixed(2)} MXN c/u
                </p>

                {/* Controles de cantidad */}
                <div style={styles.controles}>
                  <button
                    onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                    style={styles.btnCantidad}
                  >
                    -
                  </button>
                  <span style={styles.cantidadNumero}>{item.cantidad}</span>
                  <button
                    onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                    style={styles.btnCantidad}
                  >
                    +
                  </button>

                  <button
                    onClick={() => eliminarDelCarrito(item.id)}
                    style={styles.btnEliminar}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div style={styles.subtotalItem}>
                ${(Number(item.precio) * item.cantidad).toFixed(2)} MXN
              </div>
            </div>
          ))}
        </div>

        {/* Resumen del pedido */}
        <div style={styles.resumenCard}>
          <h2 style={styles.resumenTitulo}>Resumen de Compra</h2>

          <div style={styles.filaResumen}>
            <span>Total de productos:</span>
            <span>{totalItems} pzas</span>
          </div>

          <div style={styles.filaResumen}>
            <span>Subtotal:</span>
            <span>${totalPrecio.toFixed(2)} MXN</span>
          </div>

          <div style={styles.filaResumen}>
            <span>Envío:</span>
            <span style={{ color: '#059669', fontWeight: 'bold' }}>
              Calculado en Checkout
            </span>
          </div>

          <hr style={styles.divisor} />

          <div style={styles.filaTotal}>
            <span>Total estimado:</span>
            <span style={styles.montoTotal}>${totalPrecio.toFixed(2)} MXN</span>
          </div>

          <Link to="/checkout" style={styles.btnCheckout}>
            Proceder al Pago 💳
          </Link>

          <Link to="/" style={styles.seguirComprando}>
            ← Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1050px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px'
  },
  titulo: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#3d2314',
    margin: 0
  },
  btnVaciar: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '24px',
    alignItems: 'start'
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  cardItem: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    gap: '16px'
  },
  imagen: {
    width: '85px',
    height: '85px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  detalles: {
    flex: 1
  },
  nombreItem: {
    margin: '0 0 6px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  precioUnitario: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#6b7280'
  },
  controles: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  btnCantidad: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cantidadNumero: {
    fontSize: '15px',
    fontWeight: '600',
    minWidth: '22px',
    textAlign: 'center'
  },
  btnEliminar: {
    marginLeft: '15px',
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '13px',
    cursor: 'pointer'
  },
  subtotalItem: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#3d2314'
  },
  resumenCard: {
    backgroundColor: '#ffffff',
    padding: '22px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
  },
  resumenTitulo: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 18px 0',
    color: '#1f2937'
  },
  filaResumen: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '10px'
  },
  divisor: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '15px 0'
  },
  filaTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  montoTotal: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#d97706'
  },
  btnCheckout: {
    display: 'block',
    textAlign: 'center',
    backgroundColor: '#d97706',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '12px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
  },
  seguirComprando: {
    display: 'block',
    textAlign: 'center',
    marginTop: '12px',
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '13px'
  },
  vacioContainer: {
    textAlign: 'center',
    padding: '70px 20px',
    maxWidth: '500px',
    margin: '40px auto'
  },
  iconoVacio: {
    fontSize: '54px',
    marginBottom: '12px'
  },
  tituloVacio: {
    fontSize: '22px',
    color: '#374151',
    marginBottom: '8px'
  },
  subtituloVacio: {
    color: '#6b7280',
    fontSize: '15px',
    marginBottom: '24px'
  },
  btnExplorar: {
    display: 'inline-block',
    backgroundColor: '#8b4513',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '11px 22px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px'
  }
};