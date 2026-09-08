export function hasValidRequestOrigin(request: Request) {
  const submittedOrigin = request.headers.get("origin");
  if (!submittedOrigin) return true;

  try {
    const publicUrl = process.env.SHIPFLOW_PUBLIC_URL?.trim();
    const expectedOrigin = new URL(publicUrl || request.url).origin;
    return new URL(submittedOrigin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
