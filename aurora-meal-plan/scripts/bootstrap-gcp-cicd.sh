#!/usr/bin/env bash
set -euo pipefail

project_id="${GCP_PROJECT_ID:-aurora-funnels}"
region="${GCP_REGION:-europe-west1}"
pool_id="${GCP_WORKLOAD_IDENTITY_POOL_ID:-github-actions}"
provider_id="${GCP_WORKLOAD_IDENTITY_PROVIDER_ID:-aurora-funnels}"
repository_id="1344281725"
repository_owner_id="7197295"

if ! gcloud auth print-access-token >/dev/null 2>&1; then
  echo "Authenticate first: gcloud auth login"
  exit 1
fi

if ! gcloud projects describe "$project_id" >/dev/null; then
  echo "Unable to access GCP project: $project_id"
  exit 1
fi

project_number="$(gcloud projects describe "$project_id" --format='value(projectNumber)')"
pool_resource="projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}"
provider_resource="${pool_resource}/providers/${provider_id}"

if ! gcloud iam workload-identity-pools describe "$pool_id" --project "$project_id" --location global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$pool_id" \
    --project "$project_id" \
    --location global \
    --display-name "GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "$provider_id" --project "$project_id" --location global --workload-identity-pool "$pool_id" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$provider_id" \
    --project "$project_id" \
    --location global \
    --workload-identity-pool "$pool_id" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.environment=assertion.environment" \
    --attribute-condition "assertion.repository_id=='${repository_id}' && assertion.repository_owner_id=='${repository_owner_id}' && assertion.ref=='refs/heads/main' && (assertion.environment=='staging' || assertion.environment=='production')"
fi

environment_names() {
  local environment="$1"
  local service="$2"
  node --input-type=module -e '
    import { gcpResourceNames } from "@aganoob/deployment-gcp-cloud-run";
    const [environment, projectId, region, service] = process.argv.slice(1);
    const names = gcpResourceNames(environment, { provider: "gcp-cloud-run", projectId, region, service });
    console.log(`${names.buildServiceAccount}\t${names.funnelServiceAccount}`);
  ' "$environment" "$project_id" "$region" "$service"
}

ensure_service_account() {
  local account="$1"
  local display_name="$2"
  if ! gcloud iam service-accounts describe "${account}@${project_id}.iam.gserviceaccount.com" --project "$project_id" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$account" --project "$project_id" --display-name "$display_name"
  fi
}

ensure_secret() {
  local secret="$1"
  if ! gcloud secrets describe "$secret" --project "$project_id" >/dev/null 2>&1; then
    gcloud secrets create "$secret" --project "$project_id" --replication-policy automatic
  fi
}

grant_project_role() {
  local member="$1"
  local role="$2"
  gcloud projects add-iam-policy-binding "$project_id" --member "$member" --role "$role" --quiet >/dev/null
}

grant_service_role() {
  local member="$1"
  local role="$2"
  local service="$3"
  local title="GitHub${service//-/}"
  local condition="expression=resource.type == 'run.googleapis.com/Service' && resource.name == 'projects/${project_id}/locations/${region}/services/${service}',title=${title},description=Allow GitHub deployments for ${service}"
  gcloud projects add-iam-policy-binding "$project_id" --member "$member" --role "$role" --condition "$condition" --quiet >/dev/null
}

grant_bucket_role() {
  local member="$1"
  local role="$2"
  local bucket="$3"
  gcloud storage buckets add-iam-policy-binding "gs://${bucket}" --member "$member" --role "$role" --quiet >/dev/null
}

grant_bucket_legacy_writer() {
  local account="$1"
  local bucket="$2"
  local uniform_access
  uniform_access="$(gcloud storage buckets describe "gs://${bucket}" --format='value(uniform_bucket_level_access)')"
  if [ "$uniform_access" = "False" ]; then
    gcloud storage buckets update "gs://${bucket}" --add-acl-grant="entity=user-${account},role=WRITER" --quiet >/dev/null
  fi
}

ensure_cloudbuild_source_bucket() {
  local bucket="$1"
  if ! gcloud storage buckets describe "gs://${bucket}" >/dev/null 2>&1; then
    gcloud storage buckets create "gs://${bucket}" --location US --quiet >/dev/null
  fi
}

for environment in staging production; do
  if [ "$environment" = staging ]; then
    service="aurora-meal-staging"
  else
    service="aurora-meal-production"
  fi

  pnpm shipflow deploy setup --environment "$environment" --yes --non-interactive

  ensure_cloudbuild_source_bucket "${project_id}_cloudbuild"

  IFS=$'\t' read -r build_account runtime_account <<<"$(environment_names "$environment" "$service")"
  deploy_account="github-${environment}-deployer"
  deploy_email="${deploy_account}@${project_id}.iam.gserviceaccount.com"
  build_email="${build_account}@${project_id}.iam.gserviceaccount.com"
  runtime_email="${runtime_account}@${project_id}.iam.gserviceaccount.com"
  workload_member="principalSet://iam.googleapis.com/${pool_resource}/attribute.environment/${environment}"

  ensure_service_account "$deploy_account" "GitHub ${environment} deployer"
  for secret_suffix in npm-token stripe-secret-key stripe-webhook-secret meta-capi-access-token posthog-project-api-key; do
    ensure_secret "shipflow-${environment}-${secret_suffix}"
  done

  gcloud iam service-accounts add-iam-policy-binding "$deploy_email" \
    --project "$project_id" \
    --member "$workload_member" \
    --role roles/iam.workloadIdentityUser \
    --quiet >/dev/null
  gcloud iam service-accounts add-iam-policy-binding "$build_email" \
    --project "$project_id" \
    --member "serviceAccount:${deploy_email}" \
    --role roles/iam.serviceAccountUser \
    --quiet >/dev/null
  gcloud iam service-accounts add-iam-policy-binding "$runtime_email" \
    --project "$project_id" \
    --member "serviceAccount:${deploy_email}" \
    --role roles/iam.serviceAccountUser \
    --quiet >/dev/null

  grant_project_role "serviceAccount:${deploy_email}" roles/cloudbuild.builds.editor
  grant_project_role "serviceAccount:${deploy_email}" roles/serviceusage.serviceUsageConsumer
  grant_service_role "serviceAccount:${deploy_email}" roles/run.admin "$service"
  grant_bucket_role "serviceAccount:${deploy_email}" roles/storage.bucketViewer "${project_id}_cloudbuild"
  grant_bucket_role "serviceAccount:${deploy_email}" roles/storage.objectUser "${project_id}_cloudbuild"
  grant_bucket_role "serviceAccount:${build_email}" roles/storage.objectViewer "${project_id}_cloudbuild"
  grant_bucket_legacy_writer "$deploy_email" "${project_id}_cloudbuild"

  gcloud secrets add-iam-policy-binding "shipflow-${environment}-npm-token" \
    --project "$project_id" \
    --member "serviceAccount:${deploy_email}" \
    --role roles/secretmanager.secretVersionAdder \
    --quiet >/dev/null
  gcloud secrets add-iam-policy-binding "shipflow-${environment}-npm-token" \
    --project "$project_id" \
    --member "serviceAccount:${build_email}" \
    --role roles/secretmanager.secretAccessor \
    --quiet >/dev/null

  gcloud projects remove-iam-policy-binding "$project_id" \
    --member "serviceAccount:${build_email}" \
    --role roles/secretmanager.secretAccessor \
    --quiet >/dev/null 2>&1 || true
  gcloud projects remove-iam-policy-binding "$project_id" \
    --member "serviceAccount:${runtime_email}" \
    --role roles/secretmanager.secretAccessor \
    --quiet >/dev/null 2>&1 || true
  for secret_suffix in stripe-secret-key stripe-webhook-secret meta-capi-access-token posthog-project-api-key; do
    gcloud secrets add-iam-policy-binding "shipflow-${environment}-${secret_suffix}" \
      --project "$project_id" \
      --member "serviceAccount:${runtime_email}" \
      --role roles/secretmanager.secretAccessor \
      --quiet >/dev/null
  done
done

echo "GCP_PROJECT_ID=${project_id}"
echo "GCP_REGION=${region}"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=${provider_resource}"
echo "staging GCP_DEPLOY_SERVICE_ACCOUNT=github-staging-deployer@${project_id}.iam.gserviceaccount.com"
echo "production GCP_DEPLOY_SERVICE_ACCOUNT=github-production-deployer@${project_id}.iam.gserviceaccount.com"
