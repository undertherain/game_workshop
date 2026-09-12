// Resolve teaching anchors against the current draft, never fixed line numbers.
export function findGuidance(source, guide) {
  if (!guide) return null;
  const lines = source.split('\n');
  const definitions = lines.map((line, i) => new RegExp(`^def ${guide.function}\\s*\\(`).test(line) ? i : -1).filter(i => i >= 0);
  if (definitions.length !== 1) return null;
  const start = definitions[0];
  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || /^\s|^#/.test(lines[end]))) end++;
  const matches = guide.replace ? lines.slice(start + 1, end).map((line, offset) => line.trim() === guide.replace ? start + 1 + offset : -1).filter(i => i >= 0) : [];
  const replacement = matches.length === 1;
  const index = replacement ? matches[0] : start;
  const offset = lines.slice(0, index).reduce((n, line) => n + line.length + 1, 0);
  const indent = lines[index].match(/^\s*/)[0].length;
  return { line: index + 1, replacement, from: offset + indent, to: offset + lines[index].length,
    message: replacement ? guide.instruction : guide.review };
}

export function findEditableRegion(source, guide) {
  if (!guide?.editAfter) return null;
  const scope = findGuidance(source, guide);
  if (!scope) return null;
  const lines = source.split('\n');
  const markers = lines.map((line, i) => line.trim() === guide.editAfter ? i : -1).filter(i => i >= 0);
  if (markers.length !== 1) return null;
  const marker = markers[0];
  // Only accept the marker inside the intended top-level function.
  const definitions = lines.slice(0, marker).filter(line => /^def /.test(line));
  if (!definitions.at(-1)?.startsWith(`def ${guide.function}(`)) return null;
  let last = marker;
  for (let i = marker + 1; i < lines.length; i++) {
    if (lines[i].trim() && !/^\s|^#/.test(lines[i])) break;
    if (/^ +(?:\S.*)?$/.test(lines[i])) last = i;
  }
  if (last === marker) return null;
  const first = marker + 1;
  const from = lines.slice(0, first).reduce((n, line) => n + line.length + 1, 0) + lines[first].match(/^ */)[0].length;
  const to = lines.slice(0, last).reduce((n, line) => n + line.length + 1, 0) + lines[last].length;
  return { from, to };
}
export function protectRegion(source, region) {
  return { prefix: source.slice(0, region.from), suffix: source.slice(region.to), source };
}
export function acceptsEdit(protection, source) {
  return source.length >= protection.prefix.length + protection.suffix.length && source.startsWith(protection.prefix) && source.endsWith(protection.suffix);
}
