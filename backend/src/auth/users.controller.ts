import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
export class UsersController {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  @Get()
  async findAll(@Query() query: any) {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const size = Number(query.size) > 0 ? Number(query.size) : 25;
    const skip = (page - 1) * size;

    const qb = this.usuarioRepository.createQueryBuilder('usuario');
    if (query.q) {
      qb.where('usuario.nombre LIKE :q OR usuario.email LIKE :q', {
        q: `%${query.q}%`,
      });
    }

    const [data, total] = await qb.skip(skip).take(size).getManyAndCount();

    return { data, total, page, size };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { id: Number(id) } });
    return usuario;
  }
}
