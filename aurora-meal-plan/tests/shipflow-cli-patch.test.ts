import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const patchFile = new URL("../patches/@aganoob__cli@2.2.0.patch", import.meta.url);
const cloudRunPatchFile = new URL("../patches/@aganoob__deployment-gcp-cloud-run@2.2.0.patch", import.meta.url);

describe("Shipflow Cloud Run patch", () => {
  it("loads ESM deployment adapters and supplies staging runtime credentials", async () => {
    const patch = await readFile(patchFile, "utf8");

    expect(patch).toContain("provider = await import(packageName)");
    expect(patch).toContain("META_CAPI_ACCESS_TOKEN=${deploymentSecretName(context.environmentName, \"meta-capi-access-token\")}:latest");
    expect(patch).toContain("POSTHOG_PROJECT_API_KEY=${deploymentSecretName(context.environmentName, \"posthog-project-api-key\")}:latest");
    expect(patch).toContain("Object.entries(publicEnvironment).map(([name, value]) => `${name}=${value}`)");
    expect(patch).toContain('name === "META_TEST_EVENT_CODE"');
    expect(patch).toContain('"--location", target.region, "--project", target.projectId');
    expect(patch).toContain('"projects", "get-iam-policy", projectId');
  });
});

describe("Shipflow Cloud Run naming patch", () => {
  it("bounds generated service-account IDs to GCP's maximum length", async () => {
    const patch = await readFile(cloudRunPatchFile, "utf8");

    expect(patch).toContain("30 - suffix.length - 1");
    expect(patch).toContain('buildServiceAccount: serviceAccountName(prefix, "build")');
  });
});
