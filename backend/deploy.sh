#!/usr/bin/env bash
set -euo pipefail

# ======================= Banco PSE - Deploy Script =======================
# Todo corre en Docker (MySQL + App NestJS)
# Puerto: 3000 (no conflicta con backend_arqui en 3001)
# backend_arqui llama a: http://localhost:3000

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_banner() {
  echo -e "${BLUE}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║           🏦 BANCO PSE - SISTEMA DE PAGOS                    ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_usage() {
  cat <<EOF
Uso:
  ./deploy.sh              # Despliegue completo (build + up)
  ./deploy.sh up           # Solo levantar (sin rebuild)
  ./deploy.sh down         # Detener todo
  ./deploy.sh restart      # Reiniciar app
  ./deploy.sh logs         # Ver logs
  ./deploy.sh status       # Estado de contenedores
  ./deploy.sh rebuild      # Rebuild + restart

Puertos:
  - App NestJS: 3002 (para backend_arqui usar localhost:3002)
  - MySQL:      3306 (interno)

Para backend_arqui (.env):
  BANK_BASE_URL=http://localhost:3002

Puertos en uso (no tocar):
  - 3000: backend_arqui (turismo) - default
  - 3001: backend_arqui (turismo) - alternativo
  - 5432: PostgreSQL (turismo)
EOF
}

check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está corriendo${NC}"
    exit 1
  fi
  if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}❌ docker-compose no está instalado${NC}"
    exit 1
  fi
}

# Usar docker compose (v2) o docker-compose (v1)
compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

do_deploy() {
  print_banner
  check_docker
  
  echo -e "${YELLOW}📦 Construyendo imágenes...${NC}"
  compose_cmd build --no-cache
  
  echo -e "${YELLOW}🚀 Levantando servicios...${NC}"
  compose_cmd up -d
  
  echo -e "${YELLOW}⏳ Esperando a que MySQL esté listo...${NC}"
  sleep 10
  
  # Verificar que está corriendo
  if compose_cmd ps | grep -q "banco-pse-app.*Up"; then
    echo -e "${GREEN}✅ Banco PSE desplegado correctamente${NC}"
    echo ""
    echo -e "${BLUE}Endpoints disponibles:${NC}"
    echo "  POST http://localhost:3002/crear-pago"
    echo "  GET  http://localhost:3002/pagos/estado"
    echo "  POST http://localhost:3002/api/pagos/procesar"
    echo "  POST http://localhost:3002/auth/login"
    echo ""
    echo -e "${YELLOW}Para backend_arqui (.env):${NC}"
    echo "  BANK_BASE_URL=http://localhost:3002"
    echo ""
    echo -e "${BLUE}Comandos útiles:${NC}"
    echo "  ./deploy.sh logs     # Ver logs"
    echo "  ./deploy.sh status   # Estado"
    echo "  ./deploy.sh restart  # Reiniciar"
  else
    echo -e "${RED}❌ Error al desplegar. Revisa logs:${NC}"
    compose_cmd logs --tail=50
    exit 1
  fi
}

do_up() {
  check_docker
  echo -e "${YELLOW}🚀 Levantando servicios...${NC}"
  compose_cmd up -d
  echo -e "${GREEN}✅ Servicios levantados${NC}"
}

do_down() {
  check_docker
  echo -e "${YELLOW}🛑 Deteniendo servicios...${NC}"
  compose_cmd down
  echo -e "${GREEN}✅ Servicios detenidos${NC}"
}

do_restart() {
  check_docker
  echo -e "${YELLOW}🔄 Reiniciando app...${NC}"
  compose_cmd restart app
  echo -e "${GREEN}✅ App reiniciada${NC}"
}

do_logs() {
  check_docker
  compose_cmd logs -f --tail=100
}

do_status() {
  check_docker
  echo -e "${BLUE}Estado de contenedores:${NC}"
  compose_cmd ps
  echo ""
  echo -e "${BLUE}Verificando conexión MySQL:${NC}"
  docker exec banco-pse-mysql mysql -ubanco_user -pbanco_pass -e "SELECT COUNT(*) as usuarios FROM banco_pse.usuario;" 2>/dev/null || echo "⚠️ MySQL no disponible aún"
}

do_rebuild() {
  check_docker
  echo -e "${YELLOW}🔨 Rebuild completo...${NC}"
  compose_cmd down
  compose_cmd build --no-cache
  compose_cmd up -d
  echo -e "${GREEN}✅ Rebuild completado${NC}"
}

# =========================== Main ===========================

CMD="${1:-}"

case "$CMD" in
  "")
    do_deploy
    ;;
  up)
    do_up
    ;;
  down)
    do_down
    ;;
  restart)
    do_restart
    ;;
  logs)
    do_logs
    ;;
  status)
    do_status
    ;;
  rebuild)
    do_rebuild
    ;;
  help|--help|-h)
    print_usage
    ;;
  *)
    echo -e "${RED}Comando desconocido: $CMD${NC}"
    print_usage
    exit 1
    ;;
esac
