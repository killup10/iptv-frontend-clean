export function parseLrc(source) {
  if (typeof source !== 'string' || !source) return null;
  const offset = Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
  const result = [];
  for (const raw of source.split('\n')) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d{2}(?:\.\d{1,3})?)\]/g)];
    const body = raw.replace(/\[[^\]]*\]/g, '').trim();
    const tokens = [...body.matchAll(/<(\d+):(\d{2}(?:\.\d{1,3})?)>([^<]*)/g)];
    const text = body.replace(/<\d+:\d{2}(?:\.\d{1,3})?>/g, '').trim();
    for (const stamp of stamps) {
      const time = Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + offset);
      const shift = time - (Number(stamps[0][1]) * 60 + Number(stamps[0][2]) + offset);
      const words = tokens.map(token => ({ time: Math.max(0, Number(token[1]) * 60 + Number(token[2]) + offset + shift), text: token[3].trim() })).filter(word => word.text);
      result.push({ time, text, words: words.length ? words : null });
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result.length ? result : null;
}

export function getWords(line, nextTime, duration) {
  if (line.words?.length) return line.words;
  const tokens = line.text.split(/\s+/).filter(Boolean);
  // Limit estimates so a long instrumental gap doesn't stretch one sentence.
  const end = Math.min(nextTime ?? (duration > line.time ? duration : line.time + tokens.length * .45), line.time + Math.max(2, tokens.length * .65));
  const span = Math.max(.1, end - line.time);
  const weights = tokens.map(text => Math.max(1, text.replace(/[^\p{L}\p{N}]/gu, '').length));
  const total = weights.reduce((a, b) => a + b, 0);
  let elapsed = 0;
  return tokens.map((text, index) => {
    const word = { text, time: line.time + span * elapsed / total };
    elapsed += weights[index];
    return word;
  });
}

export function activeLineIndex(lines, time) {
  for (let index = lines.length - 1; index >= 0; index--) if (time >= lines[index].time) return index;
  return -1;
}
