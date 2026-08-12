#!/usr/bin/env node
/**
 * Dev server: static dealer forum + Groq OpenAI-compatible proxy (same origin).
 *
 *   node tools/dev-server.mjs
 *   open http://127.0.0.1:8765/
 *
 * Admin Insights → API key uses base URL /openai/v1 (same host, no CORS).
 */
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(__dirname, '..');
var PORT = Number(process.env.PORT || 8765);
var UPSTREAM_HOST = 'api.groq.com';

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept'
  );
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) {
      chunks.push(c);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function safeJoin(root, urlPath) {
  var decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  if (decoded === '/') decoded = '/index.html';
  var full = path.normalize(path.join(root, decoded));
  if (!full.startsWith(root)) return null;
  return full;
}

async function proxyGroq(req, res) {
  sendCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  var auth = req.headers.authorization || '';
  if (!/^Bearer\s+\S+/i.test(auth)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing Authorization: Bearer <GROQ_API_KEY>' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  try {
    var body = await readBody(req);
    var upstream = https.request(
      {
        hostname: UPSTREAM_HOST,
        path: req.url,
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': body.length
        }
      },
      function (up) {
        var chunks = [];
        up.on('data', function (c) {
          chunks.push(c);
        });
        up.on('end', function () {
          var buf = Buffer.concat(chunks);
          res.writeHead(up.statusCode || 502, {
            'Content-Type': up.headers['content-type'] || 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(buf);
        });
      }
    );
    upstream.on('error', function (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream error: ' + err.message }));
    });
    upstream.write(body);
    upstream.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }));
  }
}

function serveStatic(req, res) {
  var filePath = safeJoin(ROOT, req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, function (err, st) {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

var server = http.createServer(function (req, res) {
  if ((req.url || '').indexOf('/openai/v1/') === 0 || req.url === '/openai/v1') {
    proxyGroq(req, res);
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, groqProxy: true }));
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('Dealer forum + Groq proxy: http://127.0.0.1:' + PORT + '/');
  console.log('Chat completions:        POST /openai/v1/chat/completions');
});
