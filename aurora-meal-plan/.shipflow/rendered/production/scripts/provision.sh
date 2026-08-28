#!/usr/bin/env bash
set -euo pipefail
bundle_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
gcloud compute addresses create aurora-meal-production-ip --project aurora-funnels --region europe-west2
gcloud compute disks create aurora-meal-production-postgres-data --project aurora-funnels --zone europe-west2-a --size 20GB
gcloud compute instances create aurora-meal-production --project aurora-funnels --zone europe-west2-a --machine-type e2-medium --image-family ubuntu-2404-lts-amd64 --image-project ubuntu-os-cloud --boot-disk-size 20GB --tags shipflow-https --address aurora-meal-production-ip --metadata-from-file user-data="$bundle_dir/cloud-init.yaml" --disk name=aurora-meal-production-postgres-data,device-name=shipflow-postgres-data,mode=rw
# Use a dedicated VM service account, Artifact Registry, IAP administration, and firewall rules for ports 80/443.
