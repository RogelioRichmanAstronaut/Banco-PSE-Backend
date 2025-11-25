import { Repository } from 'typeorm';
import { Pago } from './pago.entity';
import { Usuario } from '../auth/usuario.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { MailService } from '../common/mail.service';
export declare class PagosService {
    private pagoRepository;
    private usuarioRepository;
    private mailService;
    constructor(pagoRepository: Repository<Pago>, usuarioRepository: Repository<Usuario>, mailService: MailService);
    crearPago(createPagoDto: CreatePagoDto): Promise<{
        pagoId: number;
        redirectUrl: string;
        message: string;
    }>;
    procesarPago(procesarPagoDto: ProcesarPagoDto): Promise<{
        success: boolean;
        message: string;
        pagoId: number;
        nuevoBalance: number;
    }>;
    cancelarPago(pagoId: number): Promise<{
        success: boolean;
        message: string;
        pagoId: number;
    }>;
    obtenerPago(id: number): Promise<Pago>;
    obtenerPagosUsuario(userId: number): Promise<Pago[]>;
    listarPagos(query: any): Promise<{
        data: Pago[];
        total: number;
        page: number;
        size: number;
    }>;
}
