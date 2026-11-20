#!/usr/bin/env bash
# Configura y publica CineMax en Firebase desde Google Cloud Shell (sirve desde una tablet).
#
#   bash scripts/configurar-firebase.sh [ID-DEL-PROYECTO]
#
# Hace, en orden: Firestore (nam5), app web + .env.local, inicio de sesión anónimo,
# reglas de Firestore y publicación en Firebase Hosting. Se puede ejecutar varias veces.
set -euo pipefail

PROYECTO="${1:-$(gcloud config get-value project 2>/dev/null || true)}"
if [ -z "$PROYECTO" ]; then
  echo "Indique el ID del proyecto: bash scripts/configurar-firebase.sh ID-DEL-PROYECTO" >&2
  exit 1
fi
FB="npx --yes firebase-tools@14"
paso() { printf '\n\033[1;31m==> %s\033[0m\n' "$1"; }

paso "Proyecto: $PROYECTO"
gcloud config set project "$PROYECTO" >/dev/null

paso "1/6 Instalando dependencias (tarda un par de minutos)"
npm install --legacy-peer-deps --no-audit --no-fund

paso "2/6 Comprobando acceso a Firebase"
if ! $FB projects:list --non-interactive >/dev/null 2>&1; then
  echo "Hace falta iniciar sesión: abra el enlace, autorice y pegue el código aquí."
  $FB login --no-localhost
fi

paso "3/6 Base de datos Firestore (ubicación nam5)"
gcloud services enable firestore.googleapis.com identitytoolkit.googleapis.com firebaserules.googleapis.com
if gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  echo "Firestore ya existe."
else
  gcloud firestore databases create --location=nam5
fi

paso "4/6 App web y archivo .env.local"
APP_ID=$($FB apps:list WEB --project "$PROYECTO" --json | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const r = JSON.parse(s).result || [];
    process.stdout.write((r[0] && r[0].appId) || "");
  });')
if [ -z "$APP_ID" ]; then
  APP_ID=$($FB apps:create WEB "CineMax web" --project "$PROYECTO" --json | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      process.stdout.write(JSON.parse(s).result.appId);
    });')
fi
echo "App web: $APP_ID"
$FB apps:sdkconfig WEB "$APP_ID" --project "$PROYECTO" --json | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const r = JSON.parse(s).result || {};
    let c = r.sdkConfig;
    if (!c && r.fileContents) {
      const m = r.fileContents.match(/\{[\s\S]*\}/);
      c = Function("return " + m[0])();
    }
    const fs = require("fs");
    fs.writeFileSync(".env.local", [
      "VITE_FIREBASE_API_KEY=" + c.apiKey,
      "VITE_FIREBASE_AUTH_DOMAIN=" + c.authDomain,
      "VITE_FIREBASE_PROJECT_ID=" + c.projectId,
      "VITE_FIREBASE_STORAGE_BUCKET=" + (c.storageBucket || ""),
      "VITE_FIREBASE_MESSAGING_SENDER_ID=" + (c.messagingSenderId || ""),
      "VITE_FIREBASE_APP_ID=" + c.appId,
      "VITE_FIREBASE_EMULADORES=false",
      "",
    ].join("\n"));
    fs.writeFileSync(".firebaserc", JSON.stringify({ projects: { default: c.projectId } }, null, 2) + "\n");
    console.log(".env.local listo para " + c.projectId);
  });'

paso "5/6 Inicio de sesión anónimo"
RESPUESTA=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: $PROYECTO" -H "Content-Type: application/json" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROYECTO/config?updateMask=signIn.anonymous.enabled" \
  -d '{"signIn":{"anonymous":{"enabled":true}}}' || true)
if [ "$RESPUESTA" = "200" ]; then
  echo "Inicio de sesión anónimo activado."
else
  echo "No se pudo activar automáticamente (código $RESPUESTA)."
  echo "Actívelo a mano: consola de Firebase > Authentication > Comenzar > Método de acceso > Anónimo."
fi

paso "6/6 Compilando y publicando reglas y sitio"
npm run build
$FB deploy --only firestore,hosting --project "$PROYECTO" --non-interactive

printf '\n\033[1;32mListo. Abra https://%s.web.app\033[0m\n' "$PROYECTO"
echo "En la app: Credenciales > Director de Operaciones. Debe decir \"Firebase en línea\"."
