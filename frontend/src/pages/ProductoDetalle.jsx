// frontend/src/pages/ProductoDetalle.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { apiClient } from '../api/cliente';

export default function ProductoDetalle() {
  const { id } = useParams();
  const { agregarAlCarrito } = useCarrito();

  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [agregadoExitoso, setAgregadoExitoso] = useState(false);

  useEffect(() => {
    let activo = true;

    const cargarDetalle = async () => {
      try {
        setCargando(true);
        // Consulta el producto por su ID
        const data = await apiClient(`/catalogo/productos/${id}`);
        if (activo) {
          setProducto(data);
          setError('');
        }
      } catch (err) {
        if (activo) {
          console.error('Error al cargar producto:', err);
          setError('No pudimos cargar los detalles del producto.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    cargarDetalle();

    return () => {
      activo = false;
    };
  }, [id]);

  const handleAgregar = () => {
    if (!producto) return;
    agregarAlCarrito(producto, cantidad);
    setAgregadoExitoso(true);
    setTimeout(() => setAgregadoExitoso(false), 3000);
  };

  if (cargando) {
    return (
      <div style={styles.mensajeEstado}>
        <p>Cargando delicioso pastel... 🍰</p>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div style={styles.mensajeEstado}>
        <p style={{ color: '#dc2626' }}>{error || 'Producto no encontrado'}</p>
        <Link to="/" style={styles.btnVolver}>
          ← Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.linkVolver}>
        ← Volver al catálogo
      </Link>

      <div style={styles.detalleGrid}>
        {/* Imagen del producto */}
        <div style={styles.columnaImagen}>
          <img
            src={producto.imagen_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'}
            alt={producto.nombre}
            style={styles.imagen}
          />
        </div>

        {/* Información y compra */}
        <div style={styles.columnaInfo}>
          {producto.categoria_nombre && (
            <span style={styles.badgeCategoria}>{producto.categoria_nombre}</span>
          )}

          <h1 style={styles.nombre}>{producto.nombre}</h1>
          <p style={styles.precio}>${Number(producto.precio).toFixed(2)} MXN</p>

          <p style={styles.descripcion}>{producto.descripcion}</p>

          <div style={styles.stockInfo}>
            <span>Disponibilidad: </span>
            <strong style={{ color: producto.stock > 0 ? '#059669' : '#dc2626' }}>
              {producto.stock > 0 ? `${producto.stock} disponibles` : 'Agotado'}
            </strong>
          </div>

          <div style={styles.seccionAcciones}>
            {/* Selector de cantidad */}
            <div style={styles.selectorCantidad}>
              <button
                type="button"
                onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                style={styles.btnControl}
              >
                -
              </button>
              <span style={styles.cantidadTexto}>{cantidad}</span>
              <button
                type="button"
                onClick={() =>
                  setCantidad((prev) =>
                    producto.stock ? Math.min(producto.stock, prev + 1) : prev + 1
                  )
                }
                style={styles.btnControl}
              >
                +
              </button>
            </div>

            {/* Botón de añadir */}
            <button
              onClick={handleAgregar}
              disabled={producto.stock === 0}
              style={{
                ...styles.btnAgregar,
                opacity: producto.stock === 0 ? 0.6 : 1,
                cursor: producto.stock === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Agregar al Carrito 🛒
            </button>
          </div>

          {agregadoExitoso && (
            <div style={styles.alertaExito}>
              ¡Agregado al carrito con éxito!{' '}
              <Link to="/carrito" style={styles.linkAlCarrito}>
                Ver carrito
              </Link>
            </div>
          )}
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
  linkVolver: {
    display: 'inline-block',
    marginBottom: '20px',
    color: '#8b4513',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px'
  },
  detalleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '40px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '30px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  columnaImagen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imagen: {
    width: '100%',
    maxHeight: '420px',
    objectFit: 'cover',
    borderRadius: '10px'
  },
  columnaInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  badgeCategoria: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    marginBottom: '10px'
  },
  nombre: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#3d2314',
    margin: '0 0 10px 0'
  },
  precio: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#d97706',
    margin: '0 0 18px 0'
  },
  descripcion: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#4b5563',
    marginBottom: '22px'
  },
  stockInfo: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '22px'
  },
  seccionAcciones: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '18px'
  },
  selectorCantidad: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  btnControl: {
    width: '38px',
    height: '38px',
    backgroundColor: '#f9fafb',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cantidadTexto: {
    minWidth: '40px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '16px'
  },
  btnAgregar: {
    flex: 1,
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
  },
  alertaExito: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    border: '1px solid #a7f3d0',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '10px'
  },
  linkAlCarrito: {
    color: '#047857',
    fontWeight: '700',
    textDecoration: 'underline',
    marginLeft: '6px'
  },
  mensajeEstado: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '16px'
  },
  btnVolver: {
    display: 'inline-block',
    marginTop: '15px',
    backgroundColor: '#8b4513',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px'
  }
};