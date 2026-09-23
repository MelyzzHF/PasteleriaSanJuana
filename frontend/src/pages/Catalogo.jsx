// frontend/src/pages/Catalogo.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/cliente';
import { useCarrito } from '../context/CarritoContext';
import BotonPersonalizadoWA from '../components/BotonPersonalizadoWA';

// Anuncios para el recuadro superior
const ANUNCIOS = [
  {
    titulo: '🎂 Pastelería Artesanal con Amor',
    subtitulo: 'Sabores caseros, ingredientes frescos y recetas tradicionales para tus fechas especiales.',
    imagen: 'https://scontent.fntr8-1.fna.fbcdn.net/v/t39.30808-6/771802142_1068655232289898_3449690850357781579_n.jpg?stp=dst-jpg_tt6&cstp=mx1872x2023&ctp=s1872x2023&_nc_cat=100&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=833d8c&_nc_ohc=gqRQ6dyOm4QQ7kNvwG3h22M&_nc_oc=AdprdBOlOGacwhW8dKeBN3jtqbwH5B8eqXIvMvLIZrj8vVTrCXYU7kIi_LgnWCBJkWA&_nc_zt=23&_nc_ht=scontent.fntr8-1.fna&_nc_gid=2JYWBz-nWiGG1u1dAW2KwQ&_nc_ss=7b2a8&oh=00_AQIPQjO65YXMzHeIovTYbSUD4ywcEmvRpVYQBfI4tUlbOg&oe=6AB978D7',
    etiqueta: 'Tradición y Frescura'
  },
  {
    titulo: '✨ Personaliza el Pastel de tus Sueños',
    subtitulo: 'Temáticas infantiles, bodas, aniversarios y dedicatorias hechas a la medida.',
    imagen: 'https://scontent.fntr8-1.fna.fbcdn.net/v/t39.30808-6/799829635_1100065965815491_5086204763569139034_n.jpg?stp=cp6_dst-jpegr_tt6&cstp=mx1836x2048&ctp=s1836x2048&_nc_cat=101&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=833d8c&_nc_ohc=QJ6vJUKg3l8Q7kNvwH_5kFB&_nc_oc=AdqSwwPWegS_FrLomAqGget9yfTlgURMIfCCAQHPHGv8CZgHTV20emdgi5rC61QAkXk&_nc_zt=23&se=-1&_nc_ht=scontent.fntr8-1.fna&_nc_gid=_w5DYr6sgKpgwhbBpwc3WA&_nc_ss=7b2a8&oh=00_AQIdO8WRGJ2FyScZYlCbkrzfAZ1KT_3nrkZytnhWoLgvAw&oe=6AB97E9D',
    etiqueta: 'Diseños Exclusivos'
  },
  {
    titulo: '🛵 Envíos Directo a tu Puerta',
    subtitulo: 'Llevamos la dulzura hasta tu hogar o evento cuidando cada detalle en el traslado.',
    imagen: 'https://scontent.fntr8-1.fna.fbcdn.net/v/t39.30808-6/686379669_985787400576682_7441521061721775006_n.jpg?stp=dst-jpg_tt6&cstp=mx1440x1440&ctp=s1440x1440&_nc_cat=111&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=833d8c&_nc_ohc=D2tlA5021n4Q7kNvwHep_fJ&_nc_oc=AdoRn2AtceNnI_TdfK96KyqFj_z_OYx5dsFa18o6Kbuh43bduq3niluz1m_m_HjpqSc&_nc_zt=23&_nc_ht=scontent.fntr8-1.fna&_nc_gid=obtKaQsQm1LquTsuybkw4Q&_nc_ss=7b2a8&oh=00_AQL8qhD8cQLlb7sakBt-evsef4TtLsA9KLJt6llU9I2IAw&oe=6AB97D6A',
    etiqueta: 'Servicio a Domicilio'
  }
];

export default function Catalogo() {
  const { agregarAlCarrito } = useCarrito();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estados para carrusel de anuncios
  const [anuncioIndex, setAnuncioIndex] = useState(0);

  // Estado para el carrusel de Pasteles Estrella
  const [estrellaIndex, setEstrellaIndex] = useState(0);

  // Estados para el Modal de Admin (Crear / Editar)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [productoIdActual, setProductoIdActual] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    stock: '',
    categoria_id: 1,
    descripcion: '',
    porciones: '',
    detalles: '',
    imagen_url: '',
    imagen_url_2: '',
    imagen_url_3: ''
  });

  // Identificar si es Administrador
  const token = localStorage.getItem('token');
  const usuarioRaw = localStorage.getItem('user') || localStorage.getItem('usuario');
  const usuario = (() => {
    try { return usuarioRaw ? JSON.parse(usuarioRaw) : null; } catch { return null; }
  })();
  const esAdmin = usuario?.rol === 'admin';

  // Cargar catálogo inicial y categorías
  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [resProductos, resCategorias] = await Promise.all([
        apiClient('/catalogo/productos'),
        apiClient('/catalogo/categorias').catch(() => [])
      ]);
      setProductos(Array.isArray(resProductos) ? resProductos : []);
      setCategorias(Array.isArray(resCategorias) ? resCategorias : []);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, []);

  // Rotación automática del banner de anuncios (cada 5 seg)
  useEffect(() => {
    const timer = setInterval(() => {
      setAnuncioIndex((prev) => (prev + 1) % ANUNCIOS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Pasteles Estrella tomados de los primeros productos disponibles
  const pastelesEstrella = useMemo(() => {
    if (productos.length === 0) return [];
    return productos.slice(0, 5); // Toma hasta 5 pasteles
  }, [productos]);

  // Rotación automática de Pasteles Estrella (cada 4 seg)
  useEffect(() => {
    if (pastelesEstrella.length <= 1) return;
    const timer = setInterval(() => {
      setEstrellaIndex((prev) => (prev + 1) % pastelesEstrella.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [pastelesEstrella.length]);

  // FILTRO COMBINADO: Buscador en tiempo real + Categorías
  const productosFiltrados = useMemo(() => {
    return productos.filter((prod) => {
      const coincideTexto = prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            (prod.descripcion && prod.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
      const coincideCategoria = categoriaSeleccionada === 'todas' || 
                                String(prod.categoria_id) === String(categoriaSeleccionada);
      return coincideTexto && coincideCategoria;
    });
  }, [productos, busqueda, categoriaSeleccionada]);

  // Funciones de navegación carrusel estrella
  const anteriorEstrella = () => {
    setEstrellaIndex((prev) => (prev - 1 + pastelesEstrella.length) % pastelesEstrella.length);
  };
  const siguienteEstrella = () => {
    setEstrellaIndex((prev) => (prev + 1) % pastelesEstrella.length);
  };

  // Abrir modal para Crear
  const abrirModalCrear = () => {
    setModoEdicion(false);
    setProductoIdActual(null);
    setFormData({
      nombre: '',
      precio: '',
      stock: 10,
      categoria_id: categorias[0]?.id || 1,
      descripcion: '',
      porciones: '16 personas',
      detalles: '',
      imagen_url: '',
      imagen_url_2: '',
      imagen_url_3: ''
    });
    setModalAbierto(true);
  };

  // Abrir modal para Editar
  const abrirModalEditar = (prod) => {
    setModoEdicion(true);
    setProductoIdActual(prod.id);
    setFormData({
      nombre: prod.nombre || '',
      precio: prod.precio || '',
      stock: prod.stock || 0,
      categoria_id: prod.categoria_id || 1,
      descripcion: prod.descripcion || '',
      porciones: prod.porciones || '',
      detalles: prod.detalles || '',
      imagen_url: prod.imagen_url || '',
      imagen_url_2: prod.imagen_url_2 || '',
      imagen_url_3: prod.imagen_url_3 || ''
    });
    setModalAbierto(true);
  };

  // Guardar (Crear o Actualizar)
  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    try {
      if (modoEdicion) {
        await apiClient(`/catalogo/productos/${productoIdActual}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(formData)
        });
        alert('¡Producto actualizado con éxito!');
      } else {
        await apiClient('/catalogo/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(formData)
        });
        alert('¡Producto agregado con éxito!');
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      alert(err.message || 'Error al guardar el producto');
    }
  };

  // Eliminar Producto
  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${nombre}"?`)) return;
    try {
      await apiClient(`/catalogo/productos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Producto eliminado correctamente');
      setProductos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message || 'Error al eliminar el producto');
    }
  };

  return (
    <div style={styles.fondoGeneral}>
      <div style={styles.contenedor}>
        
        {/* Barra superior de Administrador */}
        {esAdmin && (
          <div style={styles.barraAdmin}>
            <div>
              <strong>Panel de Control de Catálogo</strong>
              <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                Modo administrador activo: gestiona productos, existencias e imágenes.
              </p>
            </div>
            <button onClick={abrirModalCrear} style={styles.btnNuevoProducto}>
              ➕ Nuevo Pastel / Producto
            </button>
          </div>
        )}
        <div style={styles.barraFiltrosSticky}>
        {/* 1. SECCIÓN: Buscador interactivo */}
        <div style={styles.seccionBusqueda}>
          <input
            type="text"
            placeholder="🔍 Buscar por pastel de fresa, chocolate, galletas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={styles.inputBusqueda}
          />
        </div>

        {/* Pestañas de Categorías */}
        <div style={styles.contenedorCategorias}>
          <button
            onClick={() => setCategoriaSeleccionada('todas')}
            style={{
              ...styles.btnCategoria,
              ...(categoriaSeleccionada === 'todas' ? styles.btnCategoriaActiva : {})
            }}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaSeleccionada(cat.id)}
              style={{
                ...styles.btnCategoria,
                ...(String(categoriaSeleccionada) === String(cat.id) ? styles.btnCategoriaActiva : {})
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

        {/* 2. SECCIÓN: Cuadro Grande de Anuncios / Preview con cambio automático */}
        <div style={styles.bannerAnuncioContenedor}>
          <img
            src={ANUNCIOS[anuncioIndex].imagen}
            alt="Anuncio Pastelería"
            style={styles.bannerImagen}
          />
          <div style={styles.bannerGradiente}>
            <span style={styles.bannerBadge}>{ANUNCIOS[anuncioIndex].etiqueta}</span>
            <h2 style={styles.bannerTitulo}>{ANUNCIOS[anuncioIndex].titulo}</h2>
            <p style={styles.bannerSubtitulo}>{ANUNCIOS[anuncioIndex].subtitulo}</p>
            <div style={styles.bannerIndicadores}>
              {ANUNCIOS.map((_, i) => (
                <span
                  key={i}
                  onClick={() => setAnuncioIndex(i)}
                  style={{
                    ...styles.indicadorPunto,
                    backgroundColor: i === anuncioIndex ? '#d97706' : 'rgba(255,255,255,0.6)'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3. SECCIÓN: Badges / Beneficios (Delivery, Pagos, Personalizados) */}
        <div style={styles.gridBeneficios}>
          <div style={styles.cardBeneficio}>
            <span style={styles.iconoBeneficio}>🛵</span>
            <div>
              <strong style={styles.tituloBeneficio}>Envíos a Domicilio</strong>
              <p style={styles.descBeneficio}>Entregas programadas con sumo cuidado</p>
            </div>
          </div>
          <div style={styles.cardBeneficio}>
            <span style={styles.iconoBeneficio}>💳</span>
            <div>
              <strong style={styles.tituloBeneficio}>Pagos con Tarjeta</strong>
              <p style={styles.descBeneficio}>Aceptamos transferencias y tarjetas</p>
            </div>
          </div>
          <div style={styles.cardBeneficio}>
            <span style={styles.iconoBeneficio}>🎨</span>
            <div>
              <strong style={styles.tituloBeneficio}>Pasteles Personalizados</strong>
              <p style={styles.descBeneficio}>Elaboramos tus ideas y temáticas</p>
            </div>
          </div>
        </div>

        {/* 4. SECCIÓN: Nuestros Pasteles Estrella (Estilo de la imagen con el del centro resaltado) */}
        {pastelesEstrella.length >= 3 && (
          <div style={styles.seccionEstrella}>
            <div style={styles.encabezadoEstrella}>
              <span style={styles.subtituloEstrella}>Los favoritos de nuestros clientes</span>
              <h2 style={styles.tituloEstrella}>Nuestros Pasteles Estrella</h2>
            </div>

            <div style={styles.carruselEstrellaWrapper}>
              <button onClick={anteriorEstrella} style={styles.btnFlechaEstrella} title="Anterior">❮</button>

              <div style={styles.carruselEstrellaContenedor}>
                {[-1, 0, 1].map((desfase) => {
                  const indiceActual = (estrellaIndex + desfase + pastelesEstrella.length) % pastelesEstrella.length;
                  const item = pastelesEstrella[indiceActual];
                  const esCentro = desfase === 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !esCentro && setEstrellaIndex(indiceActual)}
                      style={{
                        ...styles.tarjetaEstrella,
                        ...(esCentro ? styles.tarjetaEstrellaCentro : styles.tarjetaEstrellaLateral)
                      }}
                    >
                      <div style={styles.contenedorFotoEstrella}>
                        <img
                          src={item.imagen_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'}
                          alt={item.nombre}
                          style={{
                            ...styles.imagenEstrella,
                            height: esCentro ? '190px' : '140px'
                          }}
                        />
                      </div>
                      <h4 style={{ ...styles.nombreEstrella, fontSize: esCentro ? '17px' : '14px' }}>
                        {item.nombre}
                      </h4>
                      <p style={{ ...styles.precioEstrella, fontSize: esCentro ? '18px' : '15px' }}>
                        ${Number(item.precio).toFixed(2)} MXN
                      </p>
                      {esCentro && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarAlCarrito(item, 1);
                          }}
                          style={styles.btnEstrellaComprar}
                        >
                          Agregar al Carrito 🛒
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={siguienteEstrella} style={styles.btnFlechaEstrella} title="Siguiente">❯</button>
            </div>

            <p style={styles.leyendaArrastra}>
              Pasa al siguiente pastel o déjalo girar solo ✨
            </p>
          </div>
        )}

        {/* 5. SECCIÓN: Frase Estrella */}
        <div style={styles.fraseEstrellaContenedor}>
          <span style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>🍰✨</span>
          <h3 style={styles.fraseTexto}>
            "Somos los mejores pasteles para tus más dulces recuerdos"
          </h3>
          <p style={styles.fraseAutor}>
            Horneando sonrisas y momentos inolvidables en cada rebanada.
          </p>
        </div>

        {/* Botón WhatsApp de Cotización Personalizada */}
        <BotonPersonalizadoWA />

        {/* 6. SECCIÓN: Catálogo Completo */}
        <div style={{ marginTop: '40px', marginBottom: '20px' }}>
          <h2 style={styles.tituloSeccionCatalogo}>Nuestros Postres y Pasteles</h2>
          <p style={{ color: '#78716c', margin: '4px 0 0 0', fontSize: '15px' }}>
            Explora toda nuestra variedad horneada con el mejor sabor casero
          </p>
        </div>

        {cargando ? (
          <p style={{ textAlign: 'center', margin: '40px 0', color: '#78716c' }}>Cargando catálogo delicioso...</p>
        ) : productosFiltrados.length === 0 ? (
          <div style={styles.sinResultados}>
            <h3>No encontramos productos que coincidan con tu búsqueda 🍰</h3>
            <p>Prueba con otro sabor o revisa otra categoría.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {productosFiltrados.map((prod) => {
              const agotado = Number(prod.stock) <= 0;

              return (
                <div key={prod.id} style={styles.tarjeta}>
                  {agotado && (
                    <div style={styles.badgeAgotado}>
                      PRODUCTO AGOTADO
                    </div>
                  )}

                  <Link to={`/producto/${prod.id}`} style={styles.linkImagen}>
                    <img
                      src={prod.imagen_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'}
                      alt={prod.nombre}
                      style={{
                        ...styles.imagenTarjeta,
                        filter: agotado ? 'grayscale(80%)' : 'none'
                      }}
                    />
                  </Link>

                  <div style={styles.cuerpoTarjeta}>
                    <Link to={`/producto/${prod.id}`} style={styles.tituloLink}>
                      <h3 style={styles.nombreProducto}>{prod.nombre}</h3>
                    </Link>

                    <div style={styles.filaPrecio}>
                      <span style={styles.precio}>${Number(prod.precio).toFixed(2)} MXN</span>
                      <span style={{ fontSize: '12px', color: agotado ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                        {agotado ? 'Agotado' : `${prod.stock} disponibles`}
                      </span>
                    </div>

                    <p style={styles.descripcionCorta}>
                      {prod.descripcion?.slice(0, 75)}...
                    </p>

                    <button
                      onClick={() => agregarAlCarrito(prod, 1)}
                      disabled={agotado}
                      style={{
                        ...styles.btnComprar,
                        backgroundColor: agotado ? '#d1d5db' : '#d97706',
                        cursor: agotado ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {agotado ? 'No disponible' : 'Agregar al Carrito 🛒'}
                    </button>

                    {esAdmin && (
                      <div style={styles.accionesAdmin}>
                        <button onClick={() => abrirModalEditar(prod)} style={styles.btnEditar}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleEliminar(prod.id, prod.nombre)} style={styles.btnEliminar}>
                          🗑️ Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL ADMIN (CREAR / EDITAR) */}
        {modalAbierto && (
          <div style={styles.overlayModal}>
            <div style={styles.modal}>
              <div style={styles.headerModal}>
                <h3 style={{ margin: 0, color: '#4a2c2a' }}>
                  {modoEdicion ? `Editar Producto #${productoIdActual}` : 'Crear Nuevo Producto'}
                </h3>
                <button onClick={() => setModalAbierto(false)} style={styles.btnCerrarModal}>✕</button>
              </div>

              <form onSubmit={handleGuardarProducto} style={styles.formModal}>
                <div style={styles.filaForm}>
                  <div style={{ flex: 2 }}>
                    <label style={styles.label}>Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      style={styles.inputModal}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Categoría</label>
                    <select
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      style={styles.inputModal}
                    >
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.filaForm}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Precio (MXN) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                      style={styles.inputModal}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Stock (Existencias) *</label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      style={styles.inputModal}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Porciones</label>
                    <input
                      type="text"
                      placeholder="Ej. 16 personas"
                      value={formData.porciones}
                      onChange={(e) => setFormData({ ...formData, porciones: e.target.value })}
                      style={styles.inputModal}
                    />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Foto Principal (URL) *</label>
                  <input
                    type="text"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imagen_url}
                    onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                    style={styles.inputModal}
                  />
                </div>

                <div style={styles.filaForm}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Foto Perspectiva 2 (URL)</label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={formData.imagen_url_2}
                      onChange={(e) => setFormData({ ...formData, imagen_url_2: e.target.value })}
                      style={styles.inputModal}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Foto Perspectiva 3 (URL)</label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={formData.imagen_url_3}
                      onChange={(e) => setFormData({ ...formData, imagen_url_3: e.target.value })}
                      style={styles.inputModal}
                    />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Descripción General</label>
                  <textarea
                    rows="2"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    style={styles.inputModal}
                  />
                </div>

                <div>
                  <label style={styles.label}>Detalles e Ingredientes</label>
                  <textarea
                    rows="2"
                    value={formData.detalles}
                    onChange={(e) => setFormData({ ...formData, detalles: e.target.value })}
                    style={styles.inputModal}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setModalAbierto(false)} style={styles.btnCancelarModal}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnGuardarModal}>
                    {modoEdicion ? 'Actualizar Producto' : 'Guardar y Publicar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  fondoGeneral: { backgroundColor: '#fdfbf7', minHeight: '100vh', paddingBottom: '60px' },
  contenedor: { width: "94%", maxWidth: '1360px', margin: '0 auto', padding: '24px 16px', fontFamily: '"Georgia", serif, system-ui', boxSizing: 'border-box'},
  barraAdmin: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px' },
  btnNuevoProducto: { backgroundColor: '#15803d', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },

  barraFiltrosSticky: {position: 'sticky', top: '65px', zIndex: 90,  backgroundColor: '#fdfbf7',  paddingTop: '12px', boxShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.05)', marginBottom: '20px'},
  seccionBusqueda: { marginBottom: '10px' },
  inputBusqueda: { width: '100%', padding: '12px 20px', borderRadius: '30px', border: '1px solid #e7e2d9', backgroundColor: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' },
  contenedorCategorias: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', margin: 0 },
  btnCategoria: { padding: '7px 18px', borderRadius: '25px', border: '1px solid #e5e0d8', backgroundColor: '#fff', color: '#57534e', cursor: 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  btnCategoriaActiva: { backgroundColor: '#78350f', color: '#fff', borderColor: '#78350f' },

  // Cuadro grande de Anuncio / Preview
  bannerAnuncioContenedor: { position: 'relative', width: '100%', minHeight: '360px', height: '380px', borderRadius: '20px', overflow: 'hidden', marginBottom: '32px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' },
  bannerImagen: { width: '100%', height: '100%', objectFit: 'cover' },
  bannerGradiente: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(30,15,8,0.85) 0%, rgba(30,15,8,0.2) 70%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '30px' },
  bannerBadge: { alignSelf: 'flex-start', backgroundColor: '#d97706', color: '#fff', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' },
  bannerTitulo: { color: '#fff', fontSize: '28px', margin: '0 0 6px 0', textShadow: '0 2px 4px rgba(0,0,0,0.4)' },
  bannerSubtitulo: { color: '#fef3c7', fontSize: '15px', maxWidth: '650px', margin: '0 0 16px 0', lineHeight: '1.4' },
  bannerIndicadores: { display: 'flex', gap: '8px' },
  indicadorPunto: { width: '12px', height: '12px', borderRadius: '50%', cursor: 'pointer', transition: 'background-color 0.3s' },

  // Barrita de beneficios
  gridBeneficios: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '45px' },
  cardBeneficio: { display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1ece4', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' },
  iconoBeneficio: { fontSize: '28px' },
  tituloBeneficio: { display: 'block', color: '#44403c', fontSize: '15px', fontWeight: 'bold' },
  descBeneficio: { margin: 0, color: '#78716c', fontSize: '12px' },

  // Pasteles Estrella
  seccionEstrella: { textAlign: 'center', margin: '40px 0 50px 0', padding: '35px 20px', backgroundColor: '#fbf7ee', borderRadius: '24px', border: '1px solid #f3ece0' },
  encabezadoEstrella: { marginBottom: '25px' },
  subtituloEstrella: { color: '#991b1b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
  tituloEstrella: { fontSize: '32px', color: '#431407', margin: '6px 0 0 0', fontWeight: '700' },
  carruselEstrellaWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' },
  btnFlechaEstrella: { backgroundColor: '#fff', border: '1px solid #e7e0d4', width: '42px', height: '42px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: '#78350f', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
  carruselEstrellaContenedor: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%', maxWidth: '850px' },
  tarjetaEstrella: { backgroundColor: '#fff', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.4s ease', cursor: 'pointer' },
  tarjetaEstrellaCentro: { transform: 'scale(1.08)', boxShadow: '0 15px 35px rgba(120, 53, 15, 0.15)', border: '2px solid #fed7aa', zIndex: 2, minWidth: '260px' },
  tarjetaEstrellaLateral: { transform: 'scale(0.88)', opacity: 0.75, boxShadow: '0 4px 15px rgba(0,0,0,0.04)', minWidth: '210px', filter: 'blur(0.3px)' },
  contenedorFotoEstrella: { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '14px' },
  imagenEstrella: { width: '100%', objectFit: 'cover', borderRadius: '16px' },
  nombreEstrella: { margin: '0 0 6px 0', color: '#292524', fontWeight: 'bold' },
  precioEstrella: { margin: '0 0 12px 0', color: '#b45309', fontWeight: 'bold' },
  btnEstrellaComprar: { backgroundColor: '#b45309', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  leyendaArrastra: { color: '#78716c', fontSize: '13px', marginTop: '18px' },

  // Frase Estrella
  fraseEstrellaContenedor: { textAlign: 'center', padding: '36px 20px', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #f3ece0', margin: '40px 0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' },
  fraseTexto: { fontSize: '24px', color: '#451a03', fontStyle: 'italic', margin: '0 0 8px 0', fontWeight: '600' },
  fraseAutor: { color: '#a8a29e', margin: 0, fontSize: '14px' },

  // Grid del catálogo
  tituloSeccionCatalogo: { fontSize: '26px', color: '#431407', margin: 0, fontWeight: '700' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px', marginTop: '20px' },
  tarjeta: { position: 'relative', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #ede7df', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', transition: 'transform 0.2s' },
  badgeAgotado: { position: 'absolute', top: '12px', left: '12px', backgroundColor: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', zIndex: 2 },
  linkImagen: { display: 'block', overflow: 'hidden' },
  imagenTarjeta: { width: '100%', height: '210px', objectFit: 'cover' },
  cuerpoTarjeta: { padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 },
  tituloLink: { textDecoration: 'none', color: '#292524' },
  nombreProducto: { margin: '0 0 8px 0', fontSize: '17px', fontWeight: '700' },
  filaPrecio: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  precio: { fontSize: '18px', fontWeight: 'bold', color: '#b45309' },
  descripcionCorta: { fontSize: '13px', color: '#78716c', margin: '0 0 14px 0', flex: 1, lineHeight: '1.4' },
  btnComprar: { width: '100%', color: '#fff', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px' },
  accionesAdmin: { display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid #f5f0eb', paddingTop: '10px' },
  btnEditar: { flex: 1, backgroundColor: '#f5f0eb', border: '1px solid #e7e0d4', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
  btnEliminar: { flex: 1, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
  sinResultados: { textAlign: 'center', padding: '50px 20px', color: '#78716c' },

  // Modal
  overlayModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modal: { backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  headerModal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f5f0eb', paddingBottom: '12px' },
  btnCerrarModal: { background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#78716c' },
  formModal: { display: 'flex', flexDirection: 'column', gap: '12px' },
  filaForm: { display: 'flex', gap: '10px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#44403c', marginBottom: '4px' },
  inputModal: { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d6cfc7', fontSize: '13px', boxSizing: 'border-box' },
  btnCancelarModal: { padding: '9px 16px', backgroundColor: '#f5f0eb', border: '1px solid #e7e0d4', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  btnGuardarModal: { padding: '9px 18px', backgroundColor: '#b45309', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }
};