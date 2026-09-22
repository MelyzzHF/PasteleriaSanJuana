// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useCarrito } from './context/CarritoContext';
import { useAuth } from './context/AuthContext';

import Catalogo from './pages/Catalogo';
import ProductoDetalle from './pages/ProductoDetalle';
import Carrito from './pages/Carrito';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import PanelCocina from './pages/PanelCocina';
import PanelRepartidor from './pages/PanelRepartidor';
import MisPedidos from './pages/MisPedidos';


function Navbar() {
  const { totalItems } = useCarrito();
  const { user, logout } = useAuth();

  return (
    <nav style={styles.nav}>
      <div style={styles.navContainer}>
        <Link to="/" style={styles.logo}>
          🎂 Sweet Pastelería
        </Link>
        
        <div style={styles.navLinks}>
          <Link to="/" style={styles.link}>
            Catálogo
          </Link>

          <Link to="/carrito" style={styles.link}>
            🛒 Carrito {totalItems > 0 && <span style={styles.cartBadge}>{totalItems}</span>}
          </Link>

          {/* 1. Solo Admin ve Cocina */}
          {user?.rol === 'admin' && (
            <>
                <Link to="/cocina" style={{ ...styles.link, ...styles.cocinaBadge }}>
                  👨‍🍳 Cocina
                </Link>

                <Link to="/repartidor" style={{ ...styles.link, ...styles.repartidorBadge }}>
                  🛵 Repartidor
                </Link>
              </>
            
          )}

          {/* 2. Solo Cliente ve Mis Pedidos */}
          {user?.rol === 'cliente' && (
            <Link to="/mis-pedidos" style={styles.link}>
              📦 Mis Pedidos
            </Link>
          )}

          {/* 3. Nombre y Logout O Botón Iniciar Sesión */}
          {user ? (
            <div style={styles.userSection}>
              <span style={styles.userName}>👤 {user.nombre}</span>
              <button onClick={logout} style={styles.btnLogout}>
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <Link to="/login" style={styles.linkLogin}>
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Router>
      <div style={styles.appContainer}>
        <Navbar />
        
        <main style={styles.mainContent}>
          <Routes>
            <Route path="/" element={<Catalogo />} />
            <Route path="/producto/:id" element={<ProductoDetalle />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />

            <Route 
              path="/cocina" 
              element={user?.rol === 'admin' ? <PanelCocina /> : <Navigate to="/" replace />} 
            />

             <Route 
                path="/repartidor" 
                element={user?.rol === 'admin' ? <PanelRepartidor /> : <Navigate to="/" replace />} 
              />

            {<Route 
              path="/mis-pedidos" 
              element={user ? <MisPedidos /> : <Navigate to="/login" replace />} 
            />}

          </Routes>
        </main>
      </div>
    </Router>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fbf9f6',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  nav: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  navContainer: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#8b4513',
    textDecoration: 'none'
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px'
  },
  link: {
    color: '#374151',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  cocinaBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 10px',
    borderRadius: '16px',
    fontWeight: '600'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '6px',
    borderLeft: '1px solid #e5e7eb'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  btnLogout: {
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#ef4444',
    fontWeight: '500'
  },
  linkLogin: {
    color: '#8b4513',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    padding: '6px 12px',
    border: '1px solid #8b4513',
    borderRadius: '6px'
  },
  cartBadge: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '10px',
    padding: '2px 7px'
  },
  mainContent: {
    flex: 1
  }
};