import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('pagos')
export class PagosController {
  constructor(private pagosService: PagosService) {}

  // Endpoint para crear un pago desde el sistema de turismo (sin autenticación)
  @Post('crear')
  async crearPago(@Body() createPagoDto: CreatePagoDto) {
    return this.pagosService.crearPago(createPagoDto);
  }

  // Endpoint para procesar el pago (autenticación en el banco)
  @Post('procesar')
  async procesarPago(@Body() procesarPagoDto: ProcesarPagoDto) {
    return this.pagosService.procesarPago(procesarPagoDto);
  }

  // Listar pagos (filtros básicos y paginación) - protegido para empleados/administradores
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get()
  async listarPagos(@Query() query: any) {
    return this.pagosService.listarPagos(query);
  }

  // Obtener información de un pago específico
  @Get(':id')
  async obtenerPago(@Param('id') id: string) {
    return this.pagosService.obtenerPago(parseInt(id, 10));
  }

  // Obtener todos los pagos del usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Get('usuario/mis-pagos')
  async obtenerMisPagos(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.pagosService.obtenerPagosUsuario(req.user.userId as number);
  }

  // Cancelar pago (protegido)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Post(':id/cancel')
  async cancelarPago(@Param('id') id: string) {
    return this.pagosService.cancelarPago(parseInt(id, 10));
  }
}
