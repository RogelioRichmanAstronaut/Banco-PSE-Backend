import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Pago } from './pago.entity';
import { Usuario } from '../auth/usuario.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { ReembolsoRequestDto } from './dto/reembolso.dto';
import { MailService } from '../common/mail.service';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private pagoRepository: Repository<Pago>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    private mailService: MailService,
  ) {}

  // =====================================================
  // MÉTODOS SEGÚN DOCUMENTO OFICIAL DE INTEGRACIÓN
  // =====================================================

  /**
   * Crear pago desde el sistema de Turismo
   * Genera referencia_transaccion y url_banco
   */
  async crearPagoOficial(dto: CreatePagoDto) {
    // Buscar usuario por cédula del cliente
    // Primero intentamos buscar por documento/cédula, luego por ID numérico
    let usuario = await this.usuarioRepository.findOne({
      where: { documento: dto.cedula_cliente },
    });

    // Si no existe por documento, intentar buscar por ID numérico
    if (!usuario && !isNaN(Number(dto.cedula_cliente))) {
      usuario = await this.usuarioRepository.findOne({
        where: { id: Number(dto.cedula_cliente) },
      });
    }

    // Si aún no existe, crear usuario temporal o buscar uno genérico
    if (!usuario) {
      // Buscar usuario genérico para pagos de invitados
      usuario = await this.usuarioRepository.findOne({
        where: { email: 'guest@banco.com' },
      });
      
      // Si no hay usuario guest, usar el primer cliente disponible
      if (!usuario) {
        usuario = await this.usuarioRepository.findOne({
          where: { rol: 'cliente' },
        });
      }
    }

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado en el sistema bancario. Debe registrarse primero.');
    }

    // Generar referencia de transacción según documento: <BANCO>-<YYYYMMDD>-<SUFIJO>
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referenciaTransaccion = `BDB-${dateStr}-${suffix}`;

    // Crear el pago con todos los campos del documento
    const pago = this.pagoRepository.create({
      idUsuario: usuario.id,
      monto: dto.monto_total,
      fecha: now,
      estado: 'pendiente',
      referenciaTransaccion: referenciaTransaccion,
      descripcionPago: dto.descripcion_pago,
      cedulaCliente: dto.cedula_cliente,
      nombreCliente: dto.nombre_cliente,
      urlRespuesta: dto.url_respuesta,
      urlNotificacion: dto.url_notificacion,
      destinatario: dto.destinatario,
    });

    const pagoGuardado = await this.pagoRepository.save(pago);

    // Generar URL del banco para redirigir al usuario
    const baseUrl = process.env.BANK_PUBLIC_URL || 'http://localhost:3000';
    const urlBanco = `${baseUrl}/pago/${pagoGuardado.id}?ref=${referenciaTransaccion}`;

    return {
      referencia_transaccion: referenciaTransaccion,
      url_banco: urlBanco,
    };
  }

  /**
   * Consultar estado de una transacción
   */
  async consultarEstado(idTransaccion?: string, idPago?: string) {
    let pago: Pago | null = null;

    if (idTransaccion) {
      pago = await this.pagoRepository.findOne({
        where: { referenciaTransaccion: idTransaccion },
      });
    }

    if (!pago && idPago) {
      pago = await this.pagoRepository.findOne({
        where: { id: parseInt(idPago, 10) },
      });
    }

    if (!pago) {
      throw new NotFoundException('Transacción no encontrada');
    }

    // Mapear estado interno a estado del documento
    let estadoDoc = 'PENDIENTE';
    if (pago.estado === 'exitoso') estadoDoc = 'APROBADA';
    else if (pago.estado === 'fallido') estadoDoc = 'DENEGADA';
    else if (pago.estado === 'cancelado') estadoDoc = 'CANCELADA';

    // Manejar fecha que puede ser Date o string
    let fechaActualizacion: string;
    if (pago.fecha instanceof Date) {
      fechaActualizacion = pago.fecha.toISOString();
    } else if (pago.fecha) {
      fechaActualizacion = new Date(pago.fecha).toISOString();
    } else {
      fechaActualizacion = new Date().toISOString();
    }

    return {
      estado: estadoDoc,
      detalle: `Estado del pago: ${pago.estado}`,
      monto: pago.monto,
      moneda: 'COP',
      codigo_autorizacion: pago.codigoAutorizacion || null,
      comprobante: pago.estado === 'exitoso' ? `COMP-${pago.id}` : null,
      fecha_actualizacion: fechaActualizacion,
    };
  }

  /**
   * Solicitar reembolso
   */
  async solicitarReembolso(dto: ReembolsoRequestDto) {
    // Buscar la transacción original
    const pago = await this.pagoRepository.findOne({
      where: { referenciaTransaccion: dto.id_transaccion_original },
    });

    if (!pago) {
      return {
        referencia_reembolso: dto.referencia_reembolso,
        id_reembolso_banco: null,
        estado_solicitud: 'RECHAZADA',
        monto_procesado: 0,
        codigo_respuesta: '55',
        mensaje_respuesta: 'Transacción original no encontrada',
      };
    }

    if (pago.estado !== 'exitoso') {
      return {
        referencia_reembolso: dto.referencia_reembolso,
        id_reembolso_banco: null,
        estado_solicitud: 'RECHAZADA',
        monto_procesado: 0,
        codigo_respuesta: '54',
        mensaje_respuesta: 'La transacción no está en estado exitoso',
      };
    }

    if (dto.monto_a_reembolsar > Number(pago.monto)) {
      return {
        referencia_reembolso: dto.referencia_reembolso,
        id_reembolso_banco: null,
        estado_solicitud: 'RECHAZADA',
        monto_procesado: 0,
        codigo_respuesta: '56',
        mensaje_respuesta: 'Monto de reembolso excede el monto original',
      };
    }

    // Generar ID de reembolso
    const idReembolso = `REF-${Date.now()}`;

    // =====================================================
    // LÓGICA FINANCIERA: Devolver dinero al usuario
    // =====================================================
    
    // Buscar el usuario que hizo el pago
    const usuario = await this.usuarioRepository.findOne({
      where: { id: pago.idUsuario },
    });

    // Buscar la cuenta de Turismo
    const turismo = await this.usuarioRepository.findOne({
      where: { email: 'solucion.turismo@sistema.com' },
    });

    if (usuario && turismo) {
      // Devolver dinero al usuario
      usuario.balance = Number(usuario.balance) + Number(dto.monto_a_reembolsar);
      // Restar dinero de Turismo
      turismo.balance = Number(turismo.balance) - Number(dto.monto_a_reembolsar);
      
      await this.usuarioRepository.save([usuario, turismo]);
      console.log(`[REEMBOLSO] Devuelto $${dto.monto_a_reembolsar} a usuario ${usuario.id}`);
    } else {
      console.warn('[REEMBOLSO] No se pudo realizar el movimiento de fondos - usuarios no encontrados');
    }

    // Marcar pago como reembolsado
    pago.estado = 'reembolsado';
    await this.pagoRepository.save(pago);

    return {
      referencia_reembolso: dto.referencia_reembolso,
      id_reembolso_banco: idReembolso,
      estado_solicitud: 'ACEPTADA',
      monto_procesado: dto.monto_a_reembolsar,
      codigo_respuesta: '00',
      mensaje_respuesta: 'Solicitud de reembolso aceptada',
    };
  }

  /**
   * Validar comprobante
   */
  async validarComprobante(idTransaccion: string, montoEsperado: number) {
    const pago = await this.pagoRepository.findOne({
      where: { referenciaTransaccion: idTransaccion },
    });

    if (!pago) {
      return { valido: 'NO', detalle: 'Transacción no encontrada' };
    }

    if (pago.estado !== 'exitoso') {
      return { valido: 'NO', detalle: 'Transacción no está aprobada' };
    }

    const montoCoincide = Number(pago.monto) === montoEsperado;

    return {
      valido: montoCoincide ? 'SI' : 'NO',
      detalle: montoCoincide ? 'Comprobante válido' : 'Monto no coincide',
    };
  }

  /**
   * Enviar notificación webhook a Turismo (servidor a servidor)
   * Se llama cuando el pago se procesa exitosamente o falla
   */
  private async enviarWebhook(pago: Pago, estado: 'APROBADA' | 'RECHAZADA') {
    if (!pago.urlNotificacion) {
      console.log('[WEBHOOK] No hay URL de notificación configurada');
      return;
    }

    const payload = {
      referencia_transaccion: pago.referenciaTransaccion,
      estado_transaccion: estado,
      monto_transaccion: pago.monto,
      fecha_hora_pago: new Date().toISOString(),
      codigo_respuesta: estado === 'APROBADA' ? '00' : '51',
      metodo_pago: 'CUENTA_BANCARIA',
    };

    console.log(`[WEBHOOK] Enviando notificación a ${pago.urlNotificacion}`);

    try {
      const response = await fetch(pago.urlNotificacion, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('[WEBHOOK] Notificación enviada exitosamente');
      } else {
        console.error(`[WEBHOOK] Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[WEBHOOK] Error enviando notificación:', error);
    }
  }

  // =====================================================
  // MÉTODOS INTERNOS DEL BANCO (para el frontend del banco)
  // =====================================================

  async procesarPago(procesarPagoDto: ProcesarPagoDto) {
    if (!procesarPagoDto.pagoId || isNaN(Number(procesarPagoDto.pagoId))) {
      throw new BadRequestException('El pagoId es inválido');
    }

    const pago = await this.pagoRepository.findOne({
      where: { id: procesarPagoDto.pagoId },
      relations: ['usuario'],
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado === 'exitoso') {
      throw new BadRequestException('Este pago ya ha sido procesado');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { email: procesarPagoDto.email },
    });

    if (!usuario) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      // Enviar webhook de rechazo
      await this.enviarWebhook(pago, 'RECHAZADA');
      throw new BadRequestException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      procesarPagoDto.contrasena,
      usuario.contrasena,
    );

    if (!isPasswordValid) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      // Enviar webhook de rechazo
      await this.enviarWebhook(pago, 'RECHAZADA');
      throw new BadRequestException('Credenciales inválidas');
    }

    if (Number(usuario.balance) < Number(pago.monto)) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      // Enviar webhook de rechazo
      await this.enviarWebhook(pago, 'RECHAZADA');
      throw new BadRequestException('Saldo insuficiente');
    }

    const usuarioDestino = await this.usuarioRepository.findOne({
      where: { email: 'solucion.turismo@sistema.com' },
    });

    if (!usuarioDestino) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      await this.enviarWebhook(pago, 'RECHAZADA');
      throw new NotFoundException('Usuario destino no encontrado');
    }

    // Realizar transferencia
    usuario.balance = Number(usuario.balance) - Number(pago.monto);
    usuarioDestino.balance = Number(usuarioDestino.balance) + Number(pago.monto);

    // Generar código de autorización
    const codigoAutorizacion = `AUTH-${Date.now()}`;
    
    pago.estado = 'exitoso';
    pago.fecha = new Date();
    pago.codigoAutorizacion = codigoAutorizacion;

    await this.usuarioRepository.save([usuario, usuarioDestino]);
    await this.pagoRepository.save(pago);

    // Enviar webhook de aprobación
    await this.enviarWebhook(pago, 'APROBADA');

    // Enviar correo de confirmación
    try {
      await this.mailService.enviarConfirmacionPago(
        usuario.email,
        `${usuario.nombre} ${usuario.apellido}`,
        pago.monto,
        pago.fecha,
        pago.id,
      );
    } catch (error) {
      console.error('Error al enviar correo:', error);
    }

    return {
      success: true,
      message: 'Pago procesado exitosamente',
      pagoId: pago.id,
      nuevoBalance: usuario.balance,
      referencia_transaccion: pago.referenciaTransaccion,
      estado_transaccion: 'APROBADA',
      codigo_autorizacion: codigoAutorizacion,
      // URL para redirigir al usuario de vuelta a Turismo
      url_respuesta: pago.urlRespuesta,
    };
  }

  async cancelarPago(pagoId: number) {
    const pago = await this.pagoRepository.findOne({ where: { id: pagoId } });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado === 'exitoso') {
      throw new BadRequestException('No se puede cancelar un pago exitoso');
    }

    pago.estado = 'cancelado';
    await this.pagoRepository.save(pago);

    return { success: true, message: 'Pago cancelado', pagoId: pago.id };
  }

  async obtenerPago(id: number) {
    const pago = await this.pagoRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }

  async obtenerPagosUsuario(userId: number) {
    return this.pagoRepository.find({
      where: { idUsuario: userId },
      order: { fecha: 'DESC' },
    });
  }

  async listarPagos(query: any) {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const size = Number(query.size) > 0 ? Number(query.size) : 25;
    const skip = (page - 1) * size;

    const qb = this.pagoRepository.createQueryBuilder('pago');

    if (query.estado) {
      qb.andWhere('pago.estado = :estado', { estado: query.estado });
    }

    if (query.userId) {
      qb.andWhere('pago.id_usuario = :userId', { userId: query.userId });
    }

    if (query.from) {
      qb.andWhere('pago.fecha >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('pago.fecha <= :to', { to: query.to });
    }

    const [data, total] = await qb
      .orderBy('pago.fecha', 'DESC')
      .skip(skip)
      .take(size)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      size,
    };
  }
}
