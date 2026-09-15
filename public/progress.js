import { skillLabels, gameSkills } from './curriculum.js';
const key = 'little-makers-progress-v1';
const evidenceTypes = ['practice', 'checked', 'assisted', 'supplied'];
export function sanitizeProgress(value) {
  const records = Array.isArray(value?.records) ? value.records : [];
  return { records: records.filter(r => r && Object.hasOwn(skillLabels, r.skill) && evidenceTypes.includes(r.evidence)
    && typeof r.source === 'string' && r.source.length <= 80).slice(-120).map(r => ({ skill: r.skill, source: r.source, evidence: r.evidence })) };
}
export function recordEvidence(progress, record) {
  const clean = sanitizeProgress({ records: [record] }).records[0];
  if (!clean) return sanitizeProgress(progress);
  return sanitizeProgress({ records: [...progress.records.filter(r => r.skill !== clean.skill || r.source !== clean.source || r.evidence !== clean.evidence), clean] });
}
export function movementOffer(progress, target) {
  if (!Object.hasOwn(gameSkills, target) || gameSkills[target][0] !== 'movement') return null;
  return progress.records.find(r => r.skill === 'movement' && r.evidence === 'checked' && r.source !== `game:${target}` && r.source.startsWith('game:')) || null;
}
export function createProgressStore(storage) {
  let progress;
  try { progress = sanitizeProgress(JSON.parse(storage?.getItem(key) || '{}')); } catch { progress = { records: [] }; }
  return {
    get: () => structuredClone(progress),
    record(record) {
      progress = recordEvidence(progress, record);
      try { storage?.setItem(key, JSON.stringify(progress)); } catch { /* Keep this session usable without storage. */ }
      globalThis.dispatchEvent?.(new Event('workshop-progress'));
    },
  };
}
let storage;
try { storage = globalThis.localStorage; } catch { /* Private browsing can deny access. */ }
export const progress = createProgressStore(storage);

export function movementStarter(source, template) {
  const who = { platformer: 'player', breaker: 'paddle', paratroopers: 'cannon' }[template];
  if (!who) throw Error('Unknown game');
  const start = source.indexOf('def update():');
  const end = source.indexOf('\n#', start);
  if (start < 0 || end < 0) throw Error('Could not locate the starter controls.');
  return source.slice(0, start) + `def update():\n    if keyboard.left:\n        ${who}.x -= ${who}.speed\n    if keyboard.right:\n        ${who}.x += ${who}.speed\n` + source.slice(end);
}
