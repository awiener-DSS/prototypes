#!/usr/bin/env node
/**
 * Local CORS proxy for Groq (OpenAI-compatible) chat completions.
 *
 * Why: browsers cannot call api.groq.com directly (CORS). This proxy lets the
 * Admin Insights panel send your Groq API key from the UI safely on localhost.
 *
 * Usage:
 *   node tools/groq-proxy.mjs
 *
 * Then in Admin Insights → Connection, save your Groq key.
 * Default panel base URL: http://127.0.0.1:8787/openai/v1
 */
import http from 'http';
import https from 'https';

var PORT = Number(process.env.INSIGHTS_PROXY_PORT || 8787);
var UPSTREAM_HOST = 'api.groq.com';

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

var server = http.createServer(async function (req, res) {
  sendCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, upstream: 'https://api.groq.com' }));
    return;
  }

  if (req.method !== 'POST' || req.url.indexOf('/openai/v1/') !== 0) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. POST /openai/v1/chat/completions' }));
    return;
  }

  var auth = req.headers.authorization || '';
  if (!/^Bearer\s+\S+/i.test(auth)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing Authorization: Bearer <GROQ_API_KEY>' }));
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
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('Groq insights proxy listening on http://127.0.0.1:' + PORT);
  console.log('Chat completions: POST http://127.0.0.1:' + PORT + '/openai/v1/chat/completions');
});
