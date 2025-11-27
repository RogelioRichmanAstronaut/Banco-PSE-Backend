import { IsNumber, IsString, IsOptional } from 'class-validator';

/**
 * DTO para solicitud de reembolso según documento oficial
 */
export class ReembolsoRequestDto {
  @IsString()
  id_transaccion_original: string;

  @IsString()
  referencia_reembolso: string;

  @IsNumber()
  monto_a_reembolsar: number;

  @IsOptional()
  @IsString()
  razon_reembolso?: string;
}

/**
 * Response de solicitud de reembolso
 */
export class ReembolsoResponseDto {
  referencia_reembolso: string;
  id_reembolso_banco: string;
  estado_solicitud: 'ACEPTADA' | 'RECHAZADA' | 'ERROR';
  monto_procesado: number;
  codigo_respuesta: string;
  mensaje_respuesta: string;
}

