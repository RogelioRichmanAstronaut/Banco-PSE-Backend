import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
export declare class UsersController {
    private usuarioRepository;
    constructor(usuarioRepository: Repository<Usuario>);
    findAll(query: any): Promise<{
        data: Usuario[];
        total: number;
        page: number;
        size: number;
    }>;
    findOne(id: string): Promise<Usuario | null>;
}
