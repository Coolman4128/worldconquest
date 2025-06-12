import fs from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let defaultGameState: any = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadDefaultGameState() {
  try {
    const data = await fs.readFile(join(__dirname, '../../assets/default_gamestate.json'), 'utf-8');
    defaultGameState = JSON.parse(data);
    console.log('Default gamestate loaded');
  } catch (error) {
    console.error('Error loading default gamestate:', error);
    process.exit(1);
  }
}

export function getDefaultGameState() {
  return defaultGameState;
}
