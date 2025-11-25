-- Script para datos de prueba
-- Incluye usuarios de ejemplo para desarrollo y testing

USE banco_pse;
-- Limpieza de tablas para evitar duplicados
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE correo;
TRUNCATE TABLE pago;
TRUNCATE TABLE usuario;
SET FOREIGN_KEY_CHECKS = 1;

-- Reiniciar numeración de id en pago y correo
ALTER TABLE pago AUTO_INCREMENT = 1;
ALTER TABLE correo AUTO_INCREMENT = 1;

-- CLIENTES (rol: cliente)
-- =====================================================
INSERT INTO usuario (
    id, tipoDocumento, nombre, apellido, email, contrasena, telefono, ocupacion, rol, balance
) VALUES
    (1000123456, 'CC', 'Juan', 'Perez', 'richiegut30@gmail.com', '$2b$10$XtGFPCqe93QoiN/D4epK7OnkUkhgRteGEX7sLOQGLzOpQ8XQmueIO', '3001234567', 'Ingeniero', 'cliente', 500000.00),
    (1000987654, 'CC', 'Maria', 'Garcia', 'maria.garcia@email.com', '$2b$10$3yzU1T17WphZjfIoevYgKeb1GuloI.j/C2ou/DtPX5SOt68k.TGRi', '3009876543', 'Contadora', 'cliente', 750000.00),
    (1000555123, 'CC', 'Carlos', 'Rodriguez', 'carlos.rodriguez@email.com', '$2b$10$1Hj2WFY8BPm01RTXsxbcFe/7ULgfJBIDpgGHhfQDrcxZNvG5KvOBm', '3005551234', 'Medico', 'cliente', 1000000.00),
    (1001222334, 'CC', 'Ana', 'Martinez', 'ana.martinez@email.com', '$2b$10$53S9dgPaTG0vxhBSK5Kw3uDpLh6VGmU0L2R7/k.POIaKyo5yEKrRS', '3012223344', 'Arquitecta', 'cliente', 300000.00),
    (9999999999, 'CC', 'Administrador', 'Sistema', 'admin@banco-pse.com', '$2b$10$I.zcGd4QPjlpYkYLCyvkgOjzyeBK5/e8vq3hAC2VQXKnoshFcLXUa', '3001112233', 'Administrador', 'administrador', 0.00),
    (9000123456, 'NIT', 'Banco', 'Javeriano', 'bancojaveriano@gmail.com', '$2b$10$0uH4QY0P/cy/iz7nngktc1uoKTIhdCCANqfQSVl8XX8kSPAN5T3eyq', '6001234567', 'Entidad Financiera', 'banco', 0.00),
    (9000999887, 'NIT', 'Solución', 'Turismo', 'solucion.turismo@sistema.com', '$2b$10$lDnUj7qqWrayKmYYXlRj4eKldUJDpljFJoHTKadg.93ghI95Lp48W', '6009998877', 'Sistema de Turismo', 'cliente', 0.00),
    (1234567901, 'CC', 'Dev', 'Tester', 'dev.tester@example.com', 'password123', '3001110000', 'Tester', 'cliente', 500000.00);

-- PAGOS DE PRUEBA
-- =====================================================
-- Pago para usuario Juan (id 1000123456)
INSERT INTO pago (
    fecha,
    monto,
    id_usuario,
    estado
) VALUES (
    '2025-11-23',
    150000.00,
    1000123456,
    'pendiente'
);