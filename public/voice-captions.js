// Live has independent input/output streams, not definitive turn boundaries.
// Keep fragments in delivery order within nearby groups for each speaker.
export function createVoiceCaptions(createMessage) {
  const groups = { user: [], assistant: [] };
  const written = new Map();
  return event => {
    // Only completed public answer text is permitted through the data channel.
    // Keep exact examples separate from captions; never infer code from speech.
    if (event.type === 'response.event') {
      const answer = event.event;
      if (answer?.type !== 'response.output_text.done' || typeof answer.text !== 'string' ||
          typeof answer.item_id !== 'string' || !Number.isInteger(answer.content_index)) return;
      const id = JSON.stringify([event.delegation_id, answer.item_id, answer.content_index]);
      if (written.has(id)) return;
      written.set(id, true);
      if (written.size > 100) written.delete(written.keys().next().value);
      const snippets = [...new Set([...answer.text.slice(0, 6000).matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)]
        .map(match => match[1]).filter(code => code.trim() && code.length <= 1000))].slice(0, 6);
      if (snippets.length) createMessage('assistant')('Written answer\n' + answer.text.slice(0, 6000)
        .replace(/(?<!`)`([^`\n]+)`(?!`)/g, '$1'));
      return;
    }
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
