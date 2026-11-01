export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function splitIntoChunks(text: string, maxChunks: number, maxChars: number): string[] {
  const pieces: string[] = [];
  for (const paragraph of text.split(/\n{2,}/)) {
    let rest = paragraph.trim();
    while (rest.length > maxChars) {
      const newline = rest.lastIndexOf('\n', maxChars);
      const cut = newline > maxChars / 2 ? newline : maxChars;
      pieces.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) pieces.push(rest);
  }

  const chunks: string[] = [];
  for (const piece of pieces) {
    const current = chunks.pop();
    if (current !== undefined && current.length + 2 + piece.length <= maxChars) {
      chunks.push(`${current}\n\n${piece}`);
    } else {
      if (current !== undefined) chunks.push(current);
      chunks.push(piece);
    }
  }

  if (chunks.length <= maxChunks) return chunks;
  const kept = chunks.slice(0, maxChunks - 1);
  kept.push(truncate(chunks.slice(maxChunks - 1).join('\n\n'), maxChars));
  return kept;
}
