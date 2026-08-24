# Shipflow Funnel Builder

1. Search `@aganoob/registry` and existing funnels before adding UI.
2. Define semantic screens with `defineScreen` and `defineFunnel`.
3. Keep offers and domains in `lib/products.ts`; keep funnel copy in `funnels/`.
4. Use `track` and `createCheckout`; funnel code never calls providers directly.
5. Run `pnpm validate`, `pnpm test`, and `pnpm build`.
