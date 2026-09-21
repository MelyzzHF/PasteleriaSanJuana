// frontend/src/pages/Catalogo.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/cliente';
import { useCarrito } from '../context/CarritoContext';

export default function Catalogo() {
  const { agregarAlCarrito } = useCarrito();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

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
        apiClient('/catalogo/categorias').catch(() => []) // Por si aún no tienes endpoint de categorías
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

  // FILTRO COMBINADO: Buscador en tiempo real + Categorías
  const productosFiltrados = useMemo(() => {
    return productos.filter((prod) => {
      // Filtro por texto (nombre o descripción)
      const coincideTexto = prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            (prod.descripcion && prod.descripcion.toLowerCase().includes(busqueda.toLowerCase()));

      // Filtro por categoría
      const coincideCategoria = categoriaSeleccionada === 'todas' || 
                                String(prod.categoria_id) === String(categoriaSeleccionada);

      return coincideTexto && coincideCategoria;
    });
  }, [productos, busqueda, categoriaSeleccionada]);

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

      {/* Buscador interactivo */}
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

      {/* Grid de Productos */}
      {cargando ? (
        <p style={{ textAlign: 'center', margin: '40px 0' }}>Cargando catálogo...</p>
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
                {/* Indicador de Agotado */}
                {agotado && (
                  <div style={styles.badgeAgotado}>
                    PRODUCTO AGOTADO
                  </div>
                )}

                {/* Imagen del producto que redirige al detalle */}
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

                  {/* Botón para cliente */}
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

                  {/* Acciones exclusivas para el Administrador */}
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

      {/* ================= MODAL ADMIN (CREAR / EDITAR) ================= */}
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
  );
}

const styles = {
  contenedor: { maxWidth: '1200px', margin: '20px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' },
  barraAdmin: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px' },
  btnNuevoProducto: { backgroundColor: '#15803d', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  seccionBusqueda: { marginBottom: '20px' },
  inputBusqueda: { width: '100%', padding: '14px 20px', borderRadius: '30px', border: '1px solid #d1d5db', fontSize: '15px', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' },
  contenedorCategorias: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '28px' },
  btnCategoria: { padding: '8px 18px', borderRadius: '20px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', cursor: 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' },
  btnCategoriaActiva: { backgroundColor: '#d97706', color: '#fff', borderColor: '#d97706' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' },
  tarjeta: { position: 'relative', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  badgeAgotado: { position: 'absolute', top: '12px', left: '12px', backgroundColor: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', zIndex: 2 },
  linkImagen: { display: 'block', overflow: 'hidden' },
  imagenTarjeta: { width: '100%', height: '200px', objectFit: 'cover', transition: 'transform 0.2s' },
  cuerpoTarjeta: { padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 },
  tituloLink: { textDecoration: 'none', color: '#1f2937' },
  nombreProducto: { margin: '0 0 8px 0', fontSize: '17px', fontWeight: '700' },
  filaPrecio: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  precio: { fontSize: '18px', fontWeight: 'bold', color: '#d97706' },
  descripcionCorta: { fontSize: '13px', color: '#6b7280', margin: '0 0 14px 0', flex: 1 },
  btnComprar: { width: '100%', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' },
  accionesAdmin: { display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' },
  btnEditar: { flex: 1, backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
  btnEliminar: { flex: 1, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
  sinResultados: { textAlign: 'center', padding: '50px 20px', color: '#6b7280' },
  overlayModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modal: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  headerModal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' },
  btnCerrarModal: { background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' },
  formModal: { display: 'flex', flexDirection: 'column', gap: '12px' },
  filaForm: { display: 'flex', gap: '10px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' },
  inputModal: { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' },
  btnCancelarModal: { padding: '9px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  btnGuardarModal: { padding: '9px 18px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }
};