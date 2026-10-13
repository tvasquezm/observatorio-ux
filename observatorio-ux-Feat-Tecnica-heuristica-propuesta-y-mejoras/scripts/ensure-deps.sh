#!/bin/sh
# Uso: sh scripts/ensure-deps.sh <paquete-pnpm>
# Reinstala las dependencias de <paquete> solo si pnpm-lock.yaml cambió desde
# el último install hecho en este volumen de node_modules.
# El filtro "<paquete>..." limita la escritura a los node_modules que ese
# servicio monta como volumen; un install general ensuciaría el disco del host.
set -e
cd "$(dirname "$0")/.."

pkg="${1:?falta el nombre del paquete pnpm}"
stamp=node_modules/.lock-hash
current=$(sha256sum pnpm-lock.yaml | cut -d' ' -f1)

if [ "$(cat "$stamp" 2>/dev/null)" = "$current" ]; then
  exit 0
fi

echo "==> Dependencias desactualizadas o primer arranque: instalando ${pkg}..."
CI=true pnpm install --frozen-lockfile --filter "${pkg}..." --config.confirmModulesPurge=false
echo "$current" > "$stamp"
