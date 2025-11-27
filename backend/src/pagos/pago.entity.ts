import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Usuario } from '../auth/usuario.entity';

@Entity('pago')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_usuario' })
  @Index()
  idUsuario: number;

  @Column({ type: 'date', nullable: true })
  fecha: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  monto: number;

  @Column({ nullable: true, length: 50 })
  estado: string;

  // Campos según documento oficial de integración
  @Column({ name: 'referencia_transaccion', nullable: true, length: 100 })
  referenciaTransaccion: string;

  @Column({ name: 'descripcion_pago', nullable: true, length: 255 })
  descripcionPago: string;

  @Column({ name: 'cedula_cliente', nullable: true, length: 50 })
  cedulaCliente: string;

  @Column({ name: 'nombre_cliente', nullable: true, length: 100 })
  nombreCliente: string;

  @Column({ name: 'url_respuesta', nullable: true, length: 500 })
  urlRespuesta: string;

  @Column({ name: 'url_notificacion', nullable: true, length: 500 })
  urlNotificacion: string;

  @Column({ nullable: true, length: 50 })
  destinatario: string;

  @Column({ name: 'codigo_autorizacion', nullable: true, length: 50 })
  codigoAutorizacion: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.pagos)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @OneToMany('Correo', 'pago')
  correos: Array<{ id: number; asunto: string; cuerpo: string }>;
}
