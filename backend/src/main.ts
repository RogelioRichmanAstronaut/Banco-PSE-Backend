import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // SIN prefijo global - los endpoints oficiales van en raíz
  // Endpoints oficiales: /crear-pago, /pagos/estado, /pagos/reembolso
  // Endpoints internos: /api/pagos/procesar, /api/pagos/:id, etc.

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `🚀 Banco PSE ejecutándose en: http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(`📡 Endpoints oficiales:`);
  console.log(`   POST /crear-pago`);
  console.log(`   GET  /pagos/estado`);
  console.log(`   POST /pagos/reembolso`);
  console.log(`   POST /pagos/comprobante/validar`);
}
void bootstrap();
