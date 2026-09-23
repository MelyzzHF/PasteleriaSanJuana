// frontend/src/components/BotonPersonalizadoWA.jsx
export default function BotonPersonalizadoWA() {
  const numeroWhatsApp = import.meta.env.VITE_WHATSAPP_NUMERO; // Tu número
  const mensajePredeterminado = encodeURIComponent(
    '¡Hola! Me gustaría cotizar un pastel personalizado para un evento especial 🎂✨'
  );

  const enlaceWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajePredeterminado}`;

  return (
    <div style={waStyles.contenedor}>
      <div style={waStyles.contenidoFila}>
        {/* Pastelito decorativo */}
        <div style={waStyles.iconoWrapper}>
          <span style={{ fontSize: '36px' }}>🎂</span>
        </div>

        {/* Textos centrados y legibles */}
        <div style={waStyles.infoTexto}>
          <h3 style={waStyles.titulo}>¿Buscas un pastel personalizado?</h3>
          <p style={waStyles.descripcion}>
            Elige sabores, rellenos, decoraciones con brillos o mariposas y tu dedicatoria especial.
          </p>
        </div>

        {/* Botón verde de WhatsApp */}
        <div style={waStyles.btnWrapper}>
          <a
            href={enlaceWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            style={waStyles.boton}
          >
            <span style={{ fontSize: '18px' }}>💬</span>
            <span>Cotizar por WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

const waStyles = {
  contenedor: {
    margin: '30px auto',
    maxWidth: '900px',
    backgroundColor: '#fefce8', // Tono crema cálido
    border: '2px dashed #f59e0b', // Línea punteada naranja/dorada
    borderRadius: '18px',
    padding: '20px 28px',
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.08)'
  },
  contenidoFila: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap' // Se adapta perfecto a celulares
  },
  iconoWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoTexto: {
    flex: '1 1 320px',
    textAlign: 'left'
  },
  titulo: {
    margin: '0 0 6px 0',
    color: '#451a03',
    fontSize: '20px',
    fontFamily: '"Georgia", serif',
    fontWeight: 'bold'
  },
  descripcion: {
    margin: 0,
    color: '#78716c',
    fontSize: '14px',
    lineHeight: '1.4'
  },
  btnWrapper: {
    display: 'flex',
    alignItems: 'center'
  },
  boton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#25D366', // Verde oficial de WhatsApp
    color: '#ffffff',
    textDecoration: 'none',
    padding: '12px 22px',
    borderRadius: '30px',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
    transition: 'transform 0.2s',
    whiteSpace: 'nowrap'
  }
};