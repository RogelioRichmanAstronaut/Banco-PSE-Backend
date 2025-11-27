import { IsNumber, IsString, IsUrl, IsOptional } from 'class-validator';

/**
 * DTO para crear un pago según documento oficial de integración
 * Endpoint: POST /crear-pago
 */
export class CreatePagoDto {
  @IsNumber()
  monto_total: number;

  @IsString()
  descripcion_pago: string;

  @IsString()
  cedula_cliente: string;

  @IsString()
  nombre_cliente: string;

  @IsUrl()
  url_respuesta: string;

  @IsUrl()
  url_notificacion: string;

  @IsString()
  destinatario: string;
}

/**
 * Response del banco al crear pago
 */
export class CreatePagoResponseDto {
  referencia_transaccion: string;
  url_banco: string;
}
