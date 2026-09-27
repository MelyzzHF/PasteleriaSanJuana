-- backend/migrations/init.sql (MySQL)

CREATE DATABASE IF NOT EXISTS pasteleria_db;
USE pasteleria_db;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    rol VARCHAR(20) DEFAULT 'cliente',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    total DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente',
    direccion_envio TEXT NOT NULL,
    fecha_entrega DATE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT,
    producto_id INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT,
    metodo_pago VARCHAR(50) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente',
    referencia_transaccion VARCHAR(100),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- Inserción de catálogo de ejemplo
INSERT INTO categorias (nombre, descripcion) VALUES
('Pasteles Clásicos', 'Pasteles tradicionales para toda ocasión'),
('Pasteles Especiales', 'Diseños temáticos y sabores gourmet'),
('Postres y Porciones', 'Cupcakes, tartaletas y rebanadas individuales');

INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url) VALUES
(1, 'Pastel Tres Leches Tradicional', 'Bizcocho esponjoso bañado en tres leches con canela', 320.00, 10, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500'),
(1, 'Pastel de Chocolate Fudge', 'Delicioso pastel de chocolate relleno con ganache oscuro', 380.00, 8, 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=500'),
(2, 'Pastel Red Velvet', 'Clásico terciopelo rojo con betún cremoso de queso crema', 420.00, 5, 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=500'),
(3, 'Caja de Cupcakes Vainilla y Fresa (6 pzas)', 'Cupcakes suaves decorados con crema batida y fruta natural', 180.00, 15, 'https://images.unsplash.com/photo-1587668178277-295251f900ce?w=500');