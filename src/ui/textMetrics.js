function px(fontSize) {
  if (typeof fontSize === 'number') return fontSize;
  const n = parseFloat(fontSize);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

export function advance(fontSize) {
  return px(fontSize);
}

export function charsThatFit(widthPx, fontSize) {
  return Math.max(1, Math.floor(widthPx / px(fontSize)));
}

export function fits(text, widthPx, fontSize) {
  return advance(fontSize) * text.length <= widthPx;
}

export function wrapText(text, widthPx, fontSize) {
  const max = charsThatFit(widthPx, fontSize);
  const out = [];
  for (const paragraph of String(text).split('\n')) {
    if (paragraph === '') {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(' ')) {
      let rest = word;
      while (rest.length > max) {
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(rest.slice(0, max));
        rest = rest.slice(max);
      }
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= max) line += ` ${rest}`;
      else {
        out.push(line);
        line = rest;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

export function ellipsize(text, widthPx, fontSize) {
  const max = charsThatFit(widthPx, fontSize);
  const s = String(text);
  if (s.length <= max) return s;
  if (max <= 2) return s.slice(0, max);
  return `${s.slice(0, max - 2)}..`;
}

export function clampLines(text, widthPx, fontSize, maxLines) {
  const lines = wrapText(text, widthPx, fontSize).split('\n');
  if (lines.length <= maxLines) return lines.join('\n');
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = ellipsize(`${kept[maxLines - 1]}..`, widthPx, fontSize);
  return kept.join('\n');
}

export function textHeight(text, widthPx, fontSize, lineSpacing = 0) {
  const lines = String(text).split('\n').length;
  const wrapped = wrapText(text, widthPx, fontSize).split('\n').length;
  const n = Math.max(lines, wrapped);
  return n * px(fontSize) + (n - 1) * lineSpacing;
}

export function lineCount(text, widthPx, fontSize) {
  return wrapText(text, widthPx, fontSize).split('\n').length;
}

export function padLabel(text, widthPx, fontSize) {
  const max = charsThatFit(widthPx, fontSize);
  return String(text).length >= max ? String(text).slice(0, max) : String(text).padEnd(max, ' ');
}
