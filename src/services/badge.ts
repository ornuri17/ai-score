// ============================================================
// AIScore badge renderer
// Shields-style SVG: "GradeByAI | 87/100".
// ============================================================

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function badgeColor(score: number | null): string {
  if (score === null) return '#9f9f9f';
  if (score >= 80) return '#2ea44f';
  if (score >= 60) return '#dfb317';
  if (score >= 40) return '#fe7d37';
  return '#e05d44';
}

// Rough Verdana 11px width, good enough for short labels
function textWidth(text: string): number {
  return Math.round(text.length * 6.5 + 10);
}

export function renderBadge(score: number | null, label = 'GradeByAI'): string {
  const value = score === null ? 'not scored' : `${score}/100`;
  const lw = textWidth(label);
  const vw = textWidth(value);
  const total = lw + vw;
  const color = badgeColor(score);
  const title = escapeXml(`${label}: ${value}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${title}">
<title>${title}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${total}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14">${escapeXml(label)}</text>
<text x="${lw + vw / 2}" y="14">${escapeXml(value)}</text>
</g>
</svg>`;
}
