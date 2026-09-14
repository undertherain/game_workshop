// Live has independent input/output streams, not definitive turn boundaries.
// Keep fragments in delivery order within nearby groups for each speaker.
export function createVoiceCaptions(createMessage) {
  const groups = { user: [], assistant: [] };
  return event => {
    const role = event.type === 'session.input_transcript.delta' ? 'user'
      : event.type === 'session.output_transcript.delta' ? 'assistant' : null;
    if (!role || typeof event.delta !== 'string' || !event.delta) return;
    const stream = groups[role];
    let group = stream.find(g => event.start_ms <= g.end + 1200 && event.end_ms >= g.start - 1200);
    if (!group) {
      group = { start: event.start_ms, end: event.end_ms, text: '', update: createMessage(role) };
      stream.push(group);
      if (stream.length > 30) stream.shift();
    }
    group.start = Math.min(group.start, event.start_ms); group.end = Math.max(group.end, event.end_ms);
    group.text = (group.text + event.delta).slice(-6000);
    group.update(group.text);
  };
}
