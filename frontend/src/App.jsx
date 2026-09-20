// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { CarritoProvider, useCarrito } from './context/CarritoContext';

import Catalogo from './pages/Catalogo';
import ProductoDetalle from './pages/ProductoDetalle';
import Carrito from './pages/Carrito';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import PanelCocina from './pages/PanelCocina';

function Navbar() {
  const { totalItems } = useCarrito();

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
          <Link to="/cocina" style={{ ...styles.link, ...styles.cocinaBadge }}>
            👨‍🍳 Cocina
          </Link>
          <Link to="/login" style={styles.linkLogin}>
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <CarritoProvider>
      <Router>
        <div style={styles.appContainer}>
          {/* El Navbar DEBE estar aquí adentro */}
          <Navbar />
          
          <main style={styles.mainContent}>
            <Routes>
              <Route path="/" element={<Catalogo />} />
              <Route path="/producto/:id" element={<ProductoDetalle />} />
              <Route path="/carrito" element={<Carrito />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cocina" element={<PanelCocina />} />
            </Routes>
          </main>
        </div>
      </Router>
    </CarritoProvider>
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
    gap: '20px'
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