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

  // Crear un pago pendiente desde el sistema de turismo
  async crearPago(createPagoDto: CreatePagoDto) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: createPagoDto.idUsuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const pago = this.pagoRepository.create({
      idUsuario: createPagoDto.idUsuario,
      monto: createPagoDto.monto,
      fecha: new Date(),
      estado: 'pendiente',
    });

    const pagoGuardado = await this.pagoRepository.save(pago);

    return {
      pagoId: pagoGuardado.id,
      redirectUrl: `/pago/${pagoGuardado.id}`,
      message:
        'Pago creado. Redirigir al usuario al banco para completar el pago.',
    };
  }

  // Procesar el pago (cuando el usuario se autentica en el banco)
  async procesarPago(procesarPagoDto: ProcesarPagoDto) {
    // Validar que pagoId sea un número válido
    if (!procesarPagoDto.pagoId || isNaN(Number(procesarPagoDto.pagoId))) {
      throw new BadRequestException('El pagoId es inválido');
    }
    // Buscar el pago
    const pago = await this.pagoRepository.findOne({
      where: { id: procesarPagoDto.pagoId },
      relations: ['usuario'],
    });

    if (!pago) {
      // Si el pago no existe, no se puede procesar
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado === 'exitoso') {
      throw new BadRequestException('Este pago ya ha sido procesado');
    }

    // Validar credenciales del usuario
    const usuario = await this.usuarioRepository.findOne({
      where: { email: procesarPagoDto.email },
    });

    if (!usuario) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      throw new BadRequestException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      procesarPagoDto.contrasena,
      usuario.contrasena,
    );

    if (!isPasswordValid) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      throw new BadRequestException('Credenciales inválidas');
    }

    // Verificar que el usuario tenga saldo suficiente (asegurando tipo numérico)
    if (Number(usuario.balance) < Number(pago.monto)) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      throw new BadRequestException('Saldo insuficiente');
    }

    // Buscar usuario "sistema de turismo"
    const usuarioDestino = await this.usuarioRepository.findOne({
      where: { email: 'solucion.turismo@sistema.com' },
    });

    if (!usuarioDestino) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      throw new NotFoundException('Usuario destino no encontrado');
    }

    // Validar fondos suficientes
    if (Number(usuario.balance) < Number(pago.monto)) {
      pago.estado = 'fallido';
      await this.pagoRepository.save(pago);
      throw new BadRequestException('Fondos insuficientes');
    }

    // Realizar la transferencia
    usuario.balance = Number(usuario.balance) - Number(pago.monto);
    usuarioDestino.balance =
      Number(usuarioDestino.balance) + Number(pago.monto);

    // Actualizar estado del pago
    pago.estado = 'exitoso';
    pago.fecha = new Date();

    // Guardar cambios
    await this.usuarioRepository.save([usuario, usuarioDestino]);
    await this.pagoRepository.save(pago);

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
      // No fallar la transacción si el correo falla
    }

    return {
      success: true,
      message: 'Pago procesado exitosamente',
      pagoId: pago.id,
      nuevoBalance: usuario.balance,
    };
  }

  // Cancelar pago
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

  // Obtener información de un pago
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

  // Obtener todos los pagos de un usuario
  async obtenerPagosUsuario(userId: number) {
    return this.pagoRepository.find({
      where: { idUsuario: userId },
      order: { fecha: 'DESC' },
    });
  }

  // Listar pagos con filtros básicos y paginación
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
