import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientesModule } from './clientes/clientes.module';
import { PagosModule } from './pagos/pagos.module';
import { TransaccionesModule } from './transacciones/transacciones.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ClientesModule, PagosModule, TransaccionesModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
