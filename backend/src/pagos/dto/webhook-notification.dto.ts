/**
 * DTO para notificación webhook del banco a Turismo
 * El banco envía esto a url_notificacion cuando el pago se procesa
 */
export class WebhookNotificationDto {
  referencia_transaccion: string;
  estado_transaccion: 'APROBADA' | 'RECHAZADA' | 'REEMBOLSADA';
  monto_transaccion: number;
  fecha_hora_pago: string; // ISO 8601
  codigo_respuesta: string;
  metodo_pago: string;
}

/**
 * Response por redirección del cliente (url_respuesta)
 */
export class RedirectResponseDto {
  referencia_transaccion: string;
  estado_transaccion: 'APROBADA' | 'RECHAZADA' | 'PENDIENTE' | 'FALLIDA';
  codigo_autorizacion?: string;
}

