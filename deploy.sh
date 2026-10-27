#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PROJECT_ID:-}" || -z "${SERVICE_ACCOUNT:-}" ]]; then
  echo "Set PROJECT_ID and SERVICE_ACCOUNT before deploying." >&2
  exit 1
fi

gcloud run deploy fairshift \
  --source . \
  --project "$PROJECT_ID" \
  --region asia-south1 \
  --service-account "$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=asia-south1,USE_MEMORY_DB=false,NEXT_PUBLIC_DEMO=false" \
  --set-secrets "SESSION_SECRET=SESSION_SECRET:latest"
