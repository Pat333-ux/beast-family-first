'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { assessFamily } = require('../domain/assessment');
const { suggestResources } = require('../domain/routing');
const { recordReview } = require('../domain/review');
const { createStore } = require('../data/store');

const PUBLIC_DIRECTORY = path.resolve(__dirname, '../../public');
const MAX_BODY_BYTES = 16 * 1024;
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function sendStatic(response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(PUBLIC_DIRECTORY, `.${requestedPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIRECTORY}${path.sep}`)) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  const contentType = CONTENT_TYPES[path.extname(filePath)];
  if (!contentType) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(contents);
  });
}

function createAppServer({ store = createStore() } = {}) {
  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    );

    const url = new URL(request.url, 'http://localhost');
    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ok', mode: 'local-demo' });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/cases') {
        sendJson(response, 200, { cases: store.list() });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/intakes') {
        const input = await readJson(request);
        const assessment = assessFamily(input.scores);
        const resources = suggestResources(input.needs || []);
        const created = store.create({
          assessment,
          needs: [...new Set(input.needs || [])],
          resources
        });
        sendJson(response, 201, { case: created });
        return;
      }

      const reviewMatch = url.pathname.match(/^\/api\/cases\/([0-9a-f-]+)\/review$/i);
      if (request.method === 'POST' && reviewMatch) {
        const existing = store.get(reviewMatch[1]);
        if (!existing) {
          sendJson(response, 404, { error: 'Case not found.' });
          return;
        }
        const review = await readJson(request);
        const updated = recordReview(existing, review);
        store.update(updated);
        sendJson(response, 200, { case: updated });
        return;
      }

      if (request.method === 'GET') {
        sendStatic(response, url.pathname);
        return;
      }
      sendJson(response, 404, { error: 'Not found.' });
    } catch (error) {
      const statusCode = error.statusCode || (error instanceof RangeError ? 400 : 400);
      sendJson(response, statusCode, { error: error.message });
    }
  });
}

module.exports = { createAppServer };
