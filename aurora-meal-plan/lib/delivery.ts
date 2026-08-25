import { createPostgresDeliveryAdapter } from "@aganoob/analytics-delivery/postgres";

let delivery: ReturnType<typeof createPostgresDeliveryAdapter> | undefined;

export function getDelivery() {
  const databaseUrl = process.env.DATABASE_URL;
  const encryptionKey = process.env.SHIPFLOW_DELIVERY_ENCRYPTION_KEY;
  if (!databaseUrl || !encryptionKey) throw new Error("Postgres delivery requires DATABASE_URL and SHIPFLOW_DELIVERY_ENCRYPTION_KEY.");
  delivery ??= createPostgresDeliveryAdapter({ databaseUrl, encryptionKey });
  return delivery;
}
