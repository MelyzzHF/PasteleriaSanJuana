// frontend/src/context/CarritoContext.jsx
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const CarritoContext = createContext();

const CLAVE_CARRITO = 'carrito_pasteleria';

export function CarritoProvider({ children }) {
  // Inicializa el carrito desde localStorage si ya existía algo guardado
  const [carrito, setCarrito] = useState(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_CARRITO);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  // Guardar en localStorage cada vez que cambie
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (err) {
      console.error('No se pudo guardar el carrito:', err);
    }
  }, [carrito]);

  // Agregar producto (o sumar cantidad si ya existe).
  // La validación de stock se hace FUERA de setCarrito para que el updater
  // sea puro y el alert no se dispare dos veces en StrictMode.
  const agregarAlCarrito = useCallback(
    (producto, cantidad = 1) => {
      const existe = carrito.find((item) => item.id === producto.id);
      const cantidadActual = existe ? existe.cantidad : 0;
      const stockDisponible = Number(producto.stock) || 0;

      // Si ya alcanzó o superó el stock, no permitir sumar más
      if (cantidadActual + cantidad > stockDisponible) {
        alert(`Solo hay ${stockDisponible} pieza(s) disponible(s) de "${producto.nombre}".`);
        return;
      }

      setCarrito((prev) => {
        if (prev.some((item) => item.id === producto.id)) {
          return prev.map((item) =>
            item.id === producto.id
              ? { ...item, cantidad: item.cantidad + cantidad }
              : item
          );
        }
        return [...prev, { ...producto, cantidad }];
      });
    },
    [carrito]
  );

  // Quitar un producto específico
  const eliminarDelCarrito = useCallback((id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Cambiar cantidad manualmente (+ o -)
  const actualizarCantidad = useCallback(
    (id, cantidad) => {
      if (cantidad <= 0) {
        eliminarDelCarrito(id);
        return;
      }
      setCarrito((prev) =>
        prev.map((item) => (item.id === id ? { ...item, cantidad } : item))
      );
    },
    [eliminarDelCarrito]
  );

  // Vaciar carrito por completo
  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
  }, []);

  // Totales calculados
  const totalItems = useMemo(
    () => carrito.reduce((sum, item) => sum + item.cantidad, 0),
    [carrito]
  );
  const totalPrecio = useMemo(
    () => carrito.reduce((sum, item) => sum + Number(item.precio) * item.cantidad, 0),
    [carrito]
  );

  const value = useMemo(
    () => ({
      carrito,
      agregarAlCarrito,
      eliminarDelCarrito,
      actualizarCantidad,
      vaciarCarrito,
      totalItems,
      totalPrecio
    }),
    [
      carrito,
      agregarAlCarrito,
      eliminarDelCarrito,
      actualizarCantidad,
      vaciarCarrito,
      totalItems,
      totalPrecio
    ]
  );

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
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