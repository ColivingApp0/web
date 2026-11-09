import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({ trustProxyHeaders: true });

/**
 * Reverse proxy for the API (`API_BASE = '/api/v1'`, same-origin by ADR-001).
 *
 * In development the dev-server applies `proxy.conf.json`; in production the
 * client and the API are separate Render services, so the SSR server forwards
 * `/api/*` to `API_PROXY_TARGET` and keeps every request same-origin for the
 * browser. The backend has no CORS on purpose, so this hop is what makes the
 * deployed app work without changing the API contract.
 */
const apiProxyTarget = process.env['API_PROXY_TARGET'];

if (apiProxyTarget) {
  const target = new URL(apiProxyTarget);
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
  const targetPort = target.port || (target.protocol === 'https:' ? '443' : '80');

  app.use('/api', (req, res) => {
    const upstream = transport(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: targetPort,
        method: req.method,
        path: req.originalUrl,
        headers: {
          ...req.headers,
          host: target.host,
          'x-forwarded-host': req.headers['x-forwarded-host'] ?? req.headers.host ?? '',
          'x-forwarded-proto': req.headers['x-forwarded-proto'] ?? req.protocol,
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );

    upstream.on('error', (error) => {
      console.error(`API proxy error for ${req.method} ${req.originalUrl}:`, error.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'api_unreachable' }));
    });

    req.pipe(upstream);
  });
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
