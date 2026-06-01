import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';

interface AppConfig {
    trading212: { api_key: string; api_secret?: string };
    binance: { api_key: string; api_secret: string };
    app: { port: number };
    ai: { model: string; effort: string };
}

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
    if (_config) return _config;
    const path = join(PROJECT_ROOT, 'config.toml');
    _config = parse(readFileSync(path, 'utf-8')) as AppConfig;
    return _config;
}
