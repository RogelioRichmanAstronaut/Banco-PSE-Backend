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
import { ReembolsoRequestDto } from './dto/reembolso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller()
export class PagosController {
  constructor(private pagosService: PagosService) {}

  // =====================================================
  // ENDPOINTS SEGÚN DOCUMENTO OFICIAL DE INTEGRACIÓN
  // =====================================================

  /**
   * Crear pago - Endpoint principal para el sistema de Turismo
   * POST /crear-pago
   * 
   * Request: monto_total, descripcion_pago, cedula_cliente, nombre_cliente,
   *          url_respuesta, url_notificacion, destinatario
   * Response: referencia_transaccion, url_banco
   */
  @Post('crear-pago')
  async crearPago(@Body() createPagoDto: CreatePagoDto) {
    return this.pagosService.crearPagoOficial(createPagoDto);
  }

  /**
   * Consultar estado de pago
   * GET /pagos/estado
   * Query params: id_transaccion o id_pago
   */
  @Get('pagos/estado')
  async consultarEstado(
    @Query('id_transaccion') idTransaccion?: string,
    @Query('id_pago') idPago?: string,
  ) {
    return this.pagosService.consultarEstado(idTransaccion, idPago);
  }

  /**
   * Solicitar reembolso
   * POST /pagos/reembolso
   */
  @Post('pagos/reembolso')
  async solicitarReembolso(@Body() reembolsoDto: ReembolsoRequestDto) {
    return this.pagosService.solicitarReembolso(reembolsoDto);
  }

  /**
   * Validar comprobante
   * POST /pagos/comprobante/validar
   */
  @Post('pagos/comprobante/validar')
  async validarComprobante(
    @Body() body: { id_transaccion: string; monto_esperado: number },
  ) {
    return this.pagosService.validarComprobante(body.id_transaccion, body.monto_esperado);
  }

  // =====================================================
  // ENDPOINTS INTERNOS DEL BANCO (para el frontend del banco)
  // =====================================================

  /**
   * Procesar el pago - Usuario se autentica en el banco
   * POST /api/pagos/procesar
   */
  @Post('api/pagos/procesar')
  async procesarPago(@Body() procesarPagoDto: ProcesarPagoDto) {
    return this.pagosService.procesarPago(procesarPagoDto);
  }

  /**
   * Listar pagos (admin)
   * GET /api/pagos
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Get('api/pagos')
  async listarPagos(@Query() query: any) {
    return this.pagosService.listarPagos(query);
  }

  /**
   * Obtener un pago específico
   * GET /api/pagos/:id
   */
  @Get('api/pagos/:id')
  async obtenerPago(@Param('id') id: string) {
    return this.pagosService.obtenerPago(parseInt(id, 10));
  }

  /**
   * Mis pagos (usuario autenticado)
   * GET /api/pagos/usuario/mis-pagos
   */
  @UseGuards(JwtAuthGuard)
  @Get('api/pagos/usuario/mis-pagos')
  async obtenerMisPagos(@Request() req: any) {
    return this.pagosService.obtenerPagosUsuario(req.user.userId as number);
  }

  /**
   * Cancelar pago (admin)
   * POST /api/pagos/:id/cancel
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador')
  @Post('api/pagos/:id/cancel')
  async cancelarPago(@Param('id') id: string) {
    return this.pagosService.cancelarPago(parseInt(id, 10));
  }
}
