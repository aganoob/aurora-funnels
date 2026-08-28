# production GCP VM bundle

This bundle targets Ubuntu 24.04 in aurora-funnels/europe-west2-a. Assign a static IP, create Artifact Registry, attach a dedicated service account, allow ports 80/443, and administer through IAP. Keep environment files under /etc/shipflow/production as root-owned mode 0600. Postgres data belongs on the attached data disk, with daily logical backups and seven-day retention.
