// frontend/src/components/BotonPersonalizadoWA.jsx

export default function BotonPersonalizadoWA() {
const NUMERO_TELEFONO = import.meta.env.VITE_WHATSAPP_NUMERO;
  // 2. La plantilla base que se escribirá sola en el chat del cliente
  const mensajeBase = `¡Hola! Me gustaría cotizar un pastel personalizado para un cumpleaños 🎂:

- Fecha del evento: 
- Cantidad de personas / Porciones: 
- Sabor de pan y relleno: 
- Color / Temática: 
- Decoración Principal (mariposas, brillos, flores, etc.): 
- Dedicatoria (ej. "Felicidades..."): 

(Te envío fotito de referencia si tengo) ✨`;

  const enlaceWhatsApp = `https://wa.me/${NUMERO_TELEFONO}?text=${encodeURIComponent(mensajeBase)}`;

  return (
    <div style={styles.contenedor}>
      <div style={styles.tarjeta}>
        <div style={styles.icono}>🎂</div>
        <div>
          <h3 style={styles.titulo}>¿Buscas un pastel personalizado?</h3>
          <p style={styles.descripcion}>
            Elige sabores, rellenos, decoraciones con brillos o mariposas y tu dedicatoria especial.
          </p>
        </div>
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noreferrer"
          style={styles.boton}
        >
          <span>💬</span> Cotizar por WhatsApp
        </a>
      </div>
    </div>
  );
}

const styles = {
  contenedor: {
    margin: '25px auto',
    maxWidth: '800px',
    padding: '0 15px',
  },
  tarjeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    border: '2px dashed #d97706',
    borderRadius: '12px',
    padding: '16px 20px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  icono: {
    fontSize: '36px',
  },
  titulo: {
    margin: '0 0 4px 0',
    color: '#4a2c2a',
    fontSize: '18px',
  },
  descripcion: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
    maxWidth: '450px',
  },
  boton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#25D366', // Verde característico de WhatsApp
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '14px',
    padding: '10px 18px',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
    transition: 'opacity 0.2s',
  }
};