// frontend/src/pages/Catalogo.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { apiClient } from '../api/cliente';

export default function Catalogo() {
  const { agregarAlCarrito } = useCarrito();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [idAgregado, setIdAgregado] = useState(null);

  useEffect(() => {
    let activo = true;

    const cargarCatalogo = async () => {
      try {
        setCargando(true);
        const data = await apiClient('/catalogo/productos');
        if (activo) {
          setProductos(data);
          setError('');
        }
      } catch (err) {
        if (activo) {
          console.error('Error al cargar catálogo:', err);
          setError('No pudiste conectar con el catálogo de productos.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    cargarCatalogo();

    return () => {
      activo = false;
    };
  }, []);

  const handleAgregarRapido = (e, producto) => {
    // Evita navegar al detalle si se presiona el botón directo
    e.preventDefault();
    agregarAlCarrito(producto, 1);
    setIdAgregado(producto.id);
    setTimeout(() => setIdAgregado(null), 1800);
  };

  if (cargando) {
    return (
      <div style={styles.centro}>
        <p>Cargando vitrina de pasteles... 🍰</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centro}>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.hero}>
        <h1 style={styles.titulo}>Nuestros Pasteles Artesanales</h1>
        <p style={styles.subtitulo}>Elige tu favorito y recíbelo fresco en tu puerta</p>
      </header>

      <div style={styles.grid}>
        {productos.map((prod) => (
          <div key={prod.id} style={styles.card}>
            <Link to={`/producto/${prod.id}`} style={styles.linkImagen}>
              <img
                src={prod.imagen_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500'}
                alt={prod.nombre}
                style={styles.imagen}
              />
            </Link>

            <div style={styles.cardBody}>
              <Link to={`/producto/${prod.id}`} style={styles.nombreLink}>
                <h3 style={styles.nombre}>{prod.nombre}</h3>
              </Link>
              <p style={styles.descripcion}>{prod.descripcion}</p>

              <div style={styles.cardFooter}>
                <span style={styles.precio}>${Number(prod.precio).toFixed(2)}</span>

                <button
                  onClick={(e) => handleAgregarRapido(e, prod)}
                  disabled={prod.stock === 0}
                  style={{
                    ...styles.btnAgregar,
                    backgroundColor: idAgregado === prod.id ? '#059669' : '#d97706',
                    cursor: prod.stock === 0 ? 'not-allowed' : 'pointer',
                    opacity: prod.stock === 0 ? 0.5 : 1
                  }}
                >
                  {idAgregado === prod.id
                    ? '¡Agregado! ✔'
                    : prod.stock === 0
                    ? 'Agotado'
                    : 'Agregar 🛒'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '30px 20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  hero: {
    textAlign: 'center',
    marginBottom: '35px'
  },
  titulo: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#3d2314',
    margin: '0 0 8px 0'
  },
  subtitulo: {
    color: '#6b7280',
    fontSize: '15px',
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '24px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column'
  },
  linkImagen: {
    display: 'block',
    overflow: 'hidden'
  },
  imagen: {
    width: '100%',
    height: '190px',
    objectFit: 'cover'
  },
  cardBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  nombreLink: {
    textDecoration: 'none'
  },
  nombre: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  descripcion: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
    flex: 1,
    margin: '0 0 16px 0'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto'
  },
  precio: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#d97706'
  },
  btnAgregar: {
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '13px',
    transition: 'background-color 0.2s ease'
  },
  centro: {
    textAlign: 'center',
    padding: '70px 20px',
    fontSize: '16px'
  }
};