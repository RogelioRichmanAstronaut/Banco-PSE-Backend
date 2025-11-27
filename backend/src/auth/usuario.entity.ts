import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { Pago } from '../pagos/pago.entity';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tipoDocumento', nullable: true, length: 20 })
  tipoDocumento: string;

  @Column({ nullable: true, length: 50 })
  @Index()
  documento: string;

  @Column({ nullable: true, length: 100 })
  nombre: string;

  @Column({ nullable: true, length: 100 })
  apellido: string;

  @Column({ unique: true, nullable: true, length: 100 })
  @Index()
  email: string;

  @Column({ nullable: true, length: 255 })
  contrasena: string;

  @Column({ nullable: true, length: 20 })
  telefono: string;

  @Column({ nullable: true, length: 100 })
  ocupacion: string;

  @Column({ nullable: true, length: 50 })
  rol: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @OneToMany(() => Pago, (pago) => pago.usuario)
  pagos: Pago[];
}
