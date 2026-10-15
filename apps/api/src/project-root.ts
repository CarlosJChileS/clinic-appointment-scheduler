import { existsSync } from 'fs';
import { resolve, join } from 'path';

const candidates = [process.cwd(), resolve(process.cwd(), '../..'), resolve(__dirname, '../../..')];
export const PROJECT_ROOT = candidates.find((candidate) => existsSync(join(candidate, 'apps/web'))) ?? process.cwd();
