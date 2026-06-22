import type { IncomingMessage, ServerResponse } from 'http';
import { createConfiguredApp } from './create-app';

type ExpressLike = (req: IncomingMessage, res: ServerResponse) => unknown;

let cachedHandler: ExpressLike | undefined;
let initPromise: Promise<ExpressLike> | undefined;

async function buildHandler(): Promise<ExpressLike> {
  const app = await createConfiguredApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as ExpressLike;
}

export async function handler(req: unknown, res: unknown): Promise<void> {
  if (!cachedHandler) {
    if (!initPromise) {
      initPromise = buildHandler();
    }
    cachedHandler = await initPromise;
  }
  // The Vercel runtime invokes our function with a Node.js `IncomingMessage`
  // and `ServerResponse`, which is exactly what Express expects as its
  // `(req, res)` request listener — so we forward the call directly. No
  // `serverless-http` shim needed.
  cachedHandler(req as IncomingMessage, res as ServerResponse);
}
