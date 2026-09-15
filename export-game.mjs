import { readFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';

const root = new URL('./', import.meta.url);
export const frameworkFiles = JSON.parse(await readFile(new URL('public/framework-files.json', root), 'utf8'));
const titles = { platformer: 'Forest adventure', breaker: 'Brick breaker', paratroopers: 'Sky patrol', sokoban: 'Crate Cottage', invaders: 'Space Invaders', asteroids: 'Asteroids' };
const hasTemplate = template => Object.hasOwn(titles, template);
export function validateExport(input) {
  if (!input || !hasTemplate(input.template)) throw new Error('Choose a supported game template.');
  if (typeof input.code !== 'string' || !input.code.trim() || input.code.length > 20000) throw new Error('Export needs between 1 and 20,000 characters of Python.');
  return { template: input.template, code: input.code };
}

// Standard ZIP with deflated entries. Names come only from the fixed asset list.
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const files = [], directory = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const filename = Buffer.from(name), data = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const packed = deflateRawSync(data), crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt16LE(33, 12); // Jan 1, 1980
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    files.push(local, filename, packed); directory.push(central, filename);
    offset += local.length + filename.length + packed.length;
  }
  const central = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, central, end]);
}

export async function exportGame(input) {
  const { template, code } = validateExport(input);
  const paths = [
    ...['index.html', 'player.js', 'player.css', 'play.py'].map(name => [name, 'public/standalone/' + name]),
    ['licenses/MPL-2.0.txt', 'public/standalone/licenses/MPL-2.0.txt'],
    ...['scene.js', 'space-scene.js', 'sokoban-scene.js', 'game-controls.js', 'forest.js', 'python-worker.js', 'framework-files.json', 'assets/forest/background.png'].map(name => [name, 'public/' + name]),
    ...frameworkFiles.map(name => ['framework/' + name, 'framework/' + name]),
    ...['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'pyodide-lock.json', 'python_stdlib.zip', 'package.json', 'README.md'].map(name => ['vendor/pyodide/' + name, 'node_modules/pyodide/' + name]),
  ];
  const entries = await Promise.all(paths.map(async ([name, location]) => [name, await readFile(new URL(location, root))]));
  entries.push(['my_game.py', code], ['game.json', JSON.stringify({ format: 'little-makers-game', version: 1, template, title: titles[template] }, null, 2) + '\n']);
  entries.push(['README.md', `# ${titles[template]}

## Play offline

1. Extract this whole ZIP into a folder.
2. Install Python 3 if needed, then open a terminal in that folder.
3. Run \`python3 play.py\` (Windows: \`py play.py\`). Your browser opens the game.
4. Keep the terminal open while playing; press Ctrl+C to stop.

The bundle includes Python for the browser (Pyodide), the Little Makers framework,
and all artwork. After Python 3 is installed, no internet, Node, workshop server,
account or API key is needed. Opening index.html directly does not work; use play.py
or serve this folder with any static HTTP server. It can also be hosted under a subfolder.

${template === 'asteroids' ? 'Left/Right or A/D turn. Up/W thrusts; Space fires. The playfield wraps at its edges.' : template === 'sokoban' ? 'Arrow keys or WASD move. U or Space undoes a move. N opens the next puzzle after a win.' : 'Arrow keys or A/D move. Space performs the game action.'} Touch buttons work too.
Restart resets the game. Hiding the tab pauses simulation.

## Your code

my_game.py is the exact editor draft at export time, including edits not yet run.
Edit it, then reload the page to use your new rules. Export does not complete missing
exercise rules or check whether the game can be won. Python errors appear in the player.

The project type is recorded in game.json (format version 1). Both the workshop and
this player execute framework.WorkshopGame: the same callbacks, collisions, scoring
and two 60 Hz simulation ticks per 30 Hz host frame. No saved progress or AI chat is included.

This is a standalone browser game bundle, not a native executable.
`]);
  entries.push(['THIRD_PARTY.md', `# Bundled runtime

Pyodide 0.27.7 is bundled unchanged from the locked npm dependency (MPL-2.0).
Project and source: https://github.com/pyodide/pyodide/tree/0.27.7
The Mozilla Public License is included in licenses/MPL-2.0.txt.
Python 3.12.7 license and notices: https://docs.python.org/3.12/license.html
The framework and Canvas artwork come from Little Makers.
`]);
  return zip(entries);
}
