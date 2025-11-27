-- Base de datos para Sistema Bancario PSE
-- Fecha de creación: 23 de noviembre de 2025
-- Actualizado: 26 de noviembre de 2025 (campos documento oficial)

CREATE DATABASE IF NOT EXISTS banco_pse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE banco_pse;

DROP TABLE IF EXISTS correo;
DROP TABLE IF EXISTS pago;
DROP TABLE IF EXISTS usuario;

-- Tabla de Usuario
CREATE TABLE IF NOT EXISTS usuario (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tipoDocumento VARCHAR(20),
    documento VARCHAR(50),
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    contrasena VARCHAR(255),
    telefono VARCHAR(20),
    ocupacion VARCHAR(100),
    rol VARCHAR(50),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    INDEX idx_documento (documento),
    INDEX idx_email (email),
    CHECK (balance >= 0)
) ENGINE=InnoDB;

-- Tabla de Pago (con campos según documento oficial de integración)
CREATE TABLE IF NOT EXISTS pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    fecha DATE,
    monto DECIMAL(15, 2),
    estado VARCHAR(50),
    -- Campos según documento oficial
    referencia_transaccion VARCHAR(100),
    descripcion_pago VARCHAR(255),
    cedula_cliente VARCHAR(50),
    nombre_cliente VARCHAR(100),
    url_respuesta VARCHAR(500),
    url_notificacion VARCHAR(500),
    destinatario VARCHAR(50),
    codigo_autorizacion VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE,
    INDEX idx_usuario (id_usuario),
    INDEX idx_referencia (referencia_transaccion),
    CHECK (monto > 0)
) ENGINE=InnoDB;

-- Tabla de Correo
CREATE TABLE IF NOT EXISTS correo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pago INT NOT NULL,
    asunto VARCHAR(255),
    cuerpo TEXT,
    FOREIGN KEY (id_pago) REFERENCES pago(id) ON DELETE CASCADE,
    INDEX idx_pago (id_pago)
) ENGINE=InnoDB;

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

-- Usuario de Turismo (destino de los pagos)
-- Contraseña: turismo123 (hasheada con bcrypt)
INSERT INTO usuario (tipoDocumento, documento, nombre, apellido, email, contrasena, telefono, ocupacion, rol, balance)
VALUES ('NIT', '900123456-1', 'Solución', 'Turismo', 'solucion.turismo@sistema.com', 
        '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 
        '3001234567', 'Sistema', 'empresa', 0.00);

-- Usuario cliente de prueba
-- Contraseña: cliente123 (hasheada con bcrypt)
INSERT INTO usuario (tipoDocumento, documento, nombre, apellido, email, contrasena, telefono, ocupacion, rol, balance)
VALUES ('CC', '1234567890', 'Juan', 'Pérez', 'juan.perez@email.com', 
        '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 
        '3009876543', 'Ingeniero', 'cliente', 5000000.00);

-- Usuario cliente adicional
INSERT INTO usuario (tipoDocumento, documento, nombre, apellido, email, contrasena, telefono, ocupacion, rol, balance)
VALUES ('CC', '9876543210', 'María', 'García', 'maria.garcia@email.com', 
        '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 
        '3005551234', 'Contadora', 'cliente', 3000000.00);

-- Usuario guest para pagos sin registro
INSERT INTO usuario (tipoDocumento, documento, nombre, apellido, email, contrasena, telefono, ocupacion, rol, balance)
VALUES ('CC', '0000000000', 'Usuario', 'Invitado', 'guest@banco.com', 
        '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 
        '0000000000', 'Invitado', 'cliente', 10000000.00);
