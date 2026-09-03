type RuntimeEnv = Record<string, string | undefined>;

function workerEnv(): RuntimeEnv {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require('cloudflare:workers') as { env: RuntimeEnv };
    return env;
  } catch {
    return {};
  }
}

export function getRuntimeEnv(): RuntimeEnv {
  const fromProcess = typeof process !== 'undefined' ? process.env : {};
  if (fromProcess.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return fromProcess as RuntimeEnv;
  }
  const fromWorker = workerEnv();
  if (fromWorker.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return fromWorker;
  }
  return fromProcess as RuntimeEnv;
}
