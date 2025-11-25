"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const pago_entity_1 = require("./pago.entity");
const usuario_entity_1 = require("../auth/usuario.entity");
const mail_service_1 = require("../common/mail.service");
let PagosService = class PagosService {
    pagoRepository;
    usuarioRepository;
    mailService;
    constructor(pagoRepository, usuarioRepository, mailService) {
        this.pagoRepository = pagoRepository;
        this.usuarioRepository = usuarioRepository;
        this.mailService = mailService;
    }
    async crearPago(createPagoDto) {
        const usuario = await this.usuarioRepository.findOne({
            where: { id: createPagoDto.idUsuario },
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
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
            message: 'Pago creado. Redirigir al usuario al banco para completar el pago.',
        };
    }
    async procesarPago(procesarPagoDto) {
        if (!procesarPagoDto.pagoId || isNaN(Number(procesarPagoDto.pagoId))) {
            throw new common_1.BadRequestException('El pagoId es inválido');
        }
        const pago = await this.pagoRepository.findOne({
            where: { id: procesarPagoDto.pagoId },
            relations: ['usuario'],
        });
        if (!pago) {
            throw new common_1.NotFoundException('Pago no encontrado');
        }
        if (pago.estado === 'exitoso') {
            throw new common_1.BadRequestException('Este pago ya ha sido procesado');
        }
        const usuario = await this.usuarioRepository.findOne({
            where: { email: procesarPagoDto.email },
        });
        if (!usuario) {
            pago.estado = 'fallido';
            await this.pagoRepository.save(pago);
            throw new common_1.BadRequestException('Credenciales inválidas');
        }
        const isPasswordValid = await bcrypt.compare(procesarPagoDto.contrasena, usuario.contrasena);
        if (!isPasswordValid) {
            pago.estado = 'fallido';
            await this.pagoRepository.save(pago);
            throw new common_1.BadRequestException('Credenciales inválidas');
        }
        if (Number(usuario.balance) < Number(pago.monto)) {
            pago.estado = 'fallido';
            await this.pagoRepository.save(pago);
            throw new common_1.BadRequestException('Saldo insuficiente');
        }
        const usuarioDestino = await this.usuarioRepository.findOne({
            where: { email: 'solucion.turismo@sistema.com' },
        });
        if (!usuarioDestino) {
            pago.estado = 'fallido';
            await this.pagoRepository.save(pago);
            throw new common_1.NotFoundException('Usuario destino no encontrado');
        }
        if (Number(usuario.balance) < Number(pago.monto)) {
            pago.estado = 'fallido';
            await this.pagoRepository.save(pago);
            throw new common_1.BadRequestException('Fondos insuficientes');
        }
        usuario.balance = Number(usuario.balance) - Number(pago.monto);
        usuarioDestino.balance =
            Number(usuarioDestino.balance) + Number(pago.monto);
        pago.estado = 'exitoso';
        pago.fecha = new Date();
        await this.usuarioRepository.save([usuario, usuarioDestino]);
        await this.pagoRepository.save(pago);
        try {
            await this.mailService.enviarConfirmacionPago(usuario.email, `${usuario.nombre} ${usuario.apellido}`, pago.monto, pago.fecha, pago.id);
        }
        catch (error) {
            console.error('Error al enviar correo:', error);
        }
        return {
            success: true,
            message: 'Pago procesado exitosamente',
            pagoId: pago.id,
            nuevoBalance: usuario.balance,
        };
    }
    async cancelarPago(pagoId) {
        const pago = await this.pagoRepository.findOne({ where: { id: pagoId } });
        if (!pago) {
            throw new common_1.NotFoundException('Pago no encontrado');
        }
        if (pago.estado === 'exitoso') {
            throw new common_1.BadRequestException('No se puede cancelar un pago exitoso');
        }
        pago.estado = 'cancelado';
        await this.pagoRepository.save(pago);
        return { success: true, message: 'Pago cancelado', pagoId: pago.id };
    }
    async obtenerPago(id) {
        const pago = await this.pagoRepository.findOne({
            where: { id },
            relations: ['usuario'],
        });
        if (!pago) {
            throw new common_1.NotFoundException('Pago no encontrado');
        }
        return pago;
    }
    async obtenerPagosUsuario(userId) {
        return this.pagoRepository.find({
            where: { idUsuario: userId },
            order: { fecha: 'DESC' },
        });
    }
    async listarPagos(query) {
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
};
exports.PagosService = PagosService;
exports.PagosService = PagosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(pago_entity_1.Pago)),
    __param(1, (0, typeorm_1.InjectRepository)(usuario_entity_1.Usuario)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        mail_service_1.MailService])
], PagosService);
//# sourceMappingURL=pagos.service.js.map