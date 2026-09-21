// frontend/src/context/CarritoContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const CarritoContext = createContext();

export function CarritoProvider({ children }) {
  // Inicializa el carrito desde localStorage si ya existía algo guardado
  const [carrito, setCarrito] = useState(() => {
    try {
      const guardado = localStorage.getItem('carrito_pasteleria');
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  // Guardar en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('carrito_pasteleria', JSON.stringify(carrito));
  }, [carrito]);

  // Agregar producto (o sumar cantidad si ya existe)
  const agregarAlCarrito = (producto, cantidad = 1) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id);
      const cantidadActual = existe ? existe.cantidad : 0;
      const stockDisponible = Number(producto.stock) || 0;

    // Si ya alcanzó o superó el stock, no permitir sumar más
    if (cantidadActual + cantidad > stockDisponible) {
      alert(`Solo hay ${stockDisponible} pieza(s) disponible(s) de "${producto.nombre}".`);
      return prev;
    }
      if (existe) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }
      return [...prev, { ...producto, cantidad }];
    });
  };

  // Quitar un producto específico
  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  // Cambiar cantidad manualmente (+ o -)
  const actualizarCantidad = (id, cantidad) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(id);
      return;
    }
    setCarrito((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad } : item))
    );
  };

  // Vaciar carrito por completo
  const vaciarCarrito = () => {
    setCarrito([]);
  };

  // Totales calculados
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce(
    (sum, item) => sum + Number(item.precio) * item.cantidad,
    0
  );

  return (
    <CarritoContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        eliminarDelCarrito,
        actualizarCantidad,
        vaciarCarrito,
        totalItems,
        totalPrecio
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

// Hook personalizado para consumirlo fácilmente
// eslint-disable-next-line react-refresh/only-export-components
export function useCarrito() {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error('useCarrito debe ser usado dentro de un CarritoProvider');
  }
  return context;
}