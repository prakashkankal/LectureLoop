import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wobblyBoxPath(x, y, w, h, jitter = 3) {
  const x2 = x + w;
  const y2 = y + h;
  return `M ${x} ${y + jitter}
    Q ${x + w / 2} ${y - jitter} ${x2 - jitter} ${y}
    Q ${x2 + jitter} ${y + h / 2} ${x2} ${y2 - jitter}
    Q ${x + w / 2} ${y2 + jitter} ${x + jitter} ${y2}
    Q ${x - jitter} ${y + h / 2} ${x} ${y + jitter} Z`;
}

function renderWrappedSvgText(text, x, startY, lineHeight, maxChars, fontProps) {
  const words = String(text || '').split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current);

  return lines.map((line, idx) => 
    `<text x="${x}" y="${startY + idx * lineHeight}" ${fontProps}>${escapeXml(line)}</text>`
  ).join('\n');
}

async function test() {
  const spec = {
    topicTitle: 'Basic Git Commands',
    overview: 'Essential version control commands to stage, record snapshots, and inspect local repository history accurately.',
    keyConcepts: [
      { term: 'Working Tree', explanation: 'Current local directory containing untracked & modified files.' },
      { term: 'Staging Area', explanation: 'Index where snapshot changes are gathered via git add.' },
      { term: 'Local Repository', explanation: 'Permanent project timeline stored in .git database.' },
    ],
    steps: [
      '1. Stage files with git add .',
      '2. Create snapshot via git commit -m "msg"',
      '3. Verify repository state using git status',
    ],
    codeOrSyntax: [
      {
        label: 'Commit Snapshot',
        code: 'git commit -m "feat: implement notes"',
        note: 'Imperative summary of changes to save in timeline',
      },
    ],
    criticalWarnings: [
      'Never commit secrets, tokens, or untracked .env files to public branch.',
    ],
    takeaways: [
      'Always run git status before git commit.',
      'Keep commits focused on single logical changes.',
      'Use descriptive imperative commit messages.',
    ],
    diagramSummary: 'Working Tree ➔ Staging Index ➔ Commit History',
  };

  const topicIndex = 4;
  const lectureName = 'COMPLETE GIT AND GITHUB TUTORIAL';

  // Ruled lines
  const ruledLines = [];
  for (let y = 140; y < 1740; y += 40) {
    ruledLines.push(`<line x1="88" y1="${y}" x2="975" y2="${y}" stroke="#E0E7FF" stroke-width="1.2" opacity="0.8" />`);
  }

  // Spiral holes
  const spiralHoles = [];
  for (let y = 80; y < 1750; y += 75) {
    spiralHoles.push(`
      <circle cx="42" cy="${y}" r="9" fill="#F1F5F9" stroke="#94A3B8" stroke-width="1.8" />
      <circle cx="40" cy="${y - 1}" r="7" fill="#E2E8F0" />
    `);
  }

  // Key concepts
  const conceptsSvg = spec.keyConcepts.map((c, i) => {
    const y = 540 + i * 95;
    return `
      <g transform="translate(105, ${y})">
        <circle cx="12" cy="14" r="6" fill="#4F46E5" />
        <circle cx="10" cy="12" r="2.5" fill="#FFFFFF" />
        <path d="M 28 14 Q 130 11 250 13" stroke="#FEF08A" stroke-width="26" stroke-linecap="round" opacity="0.85" />
        <text x="32" y="19" font-family="'Ink Free', 'Segoe Print', 'Caveat', cursive" font-size="25" font-weight="bold" fill="#1D4ED8">${escapeXml(c.term)}</text>
        <text x="32" y="52" font-family="'Ink Free', 'Segoe Print', 'Caveat', cursive" font-size="20" fill="#0F172A">${escapeXml(c.explanation)}</text>
      </g>
    `;
  }).join('');

  // Steps
  const stepsSvg = spec.steps.map((step, idx) => {
    const stepX = 105 + idx * 295;
    const boxPath = wobblyBoxPath(0, 0, 275, 120, 3.5);
    const stepText = step.replace(/^\d+\.\s*/, '');
    return `
      <g transform="translate(${stepX}, 900)">
        <path d="${boxPath}" fill="#FFFFFF" stroke="#4F46E5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="26" cy="26" r="14" fill="#6366F1" />
        <text x="26" y="32" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#FFFFFF">${idx + 1}</text>
        <text x="50" y="32" font-family="'Ink Free', 'Segoe Print', cursive" font-size="20" font-weight="bold" fill="#312E81">Phase ${idx + 1}</text>
        ${renderWrappedSvgText(stepText, 18, 64, 24, 22, "font-family=\"'Ink Free', 'Segoe Print', cursive\" font-size=\"18\" font-weight=\"bold\" fill=\"#1E293B\"")}
        ${idx < spec.steps.length - 1 ? `
          <g transform="translate(282, 54)">
            <path d="M 0 5 Q 8 -3 16 5" stroke="#3B82F6" stroke-width="3.5" fill="none" stroke-linecap="round" />
            <polygon points="14,1 22,5 14,9" fill="#3B82F6" />
          </g>
        ` : ''}
      </g>
    `;
  }).join('');

  // Takeaways
  const takeawaysSvg = spec.takeaways.map((t, idx) => `
    <g transform="translate(35, ${40 + idx * 44})">
      <circle cx="12" cy="12" r="11" fill="#10B981" />
      <path d="M 6 12 L 10 16 L 18 8" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <text x="36" y="19" font-family="'Ink Free', 'Segoe Print', cursive" font-size="21" font-weight="bold" fill="#064E3B">${escapeXml(t)}</text>
    </g>
  `).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1792" width="1024" height="1792">
  <defs>
    <filter id="hand-shadow" x="-3%" y="-3%" width="106%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="3.5" flood-color="#334155" flood-opacity="0.12" />
    </filter>
  </defs>

  <rect x="0" y="0" width="1024" height="1792" fill="#FBFBFA" />
  <rect x="18" y="18" width="988" height="1756" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.8" filter="url(#hand-shadow)" />

  <g>${ruledLines.join('')}</g>
  <line x1="88" y1="20" x2="88" y2="1770" stroke="#F87171" stroke-width="2.2" opacity="0.85" />
  <g>${spiralHoles.join('')}</g>

  <rect x="910" y="8" width="80" height="26" fill="#FDE047" opacity="0.65" transform="rotate(18, 910, 8)" />

  <!-- Header -->
  <g transform="translate(105, 55)">
    <path d="${wobblyBoxPath(0, 0, 185, 36, 2)}" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" />
    <text x="92" y="24" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#4338CA">★ TOPIC 0${topicIndex} NOTES</text>
    <text x="205" y="25" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#64748B">LECTURE: ${lectureName}</text>
    <text x="0" y="88" font-family="'Ink Free', 'Segoe Print', cursive" font-size="44" font-weight="bold" fill="#312E81" letter-spacing="-0.5">${escapeXml(spec.topicTitle)}</text>
    <path d="M 0 102 Q 220 109 460 102 T 875 104" fill="none" stroke="#3B82F6" stroke-width="4.5" stroke-linecap="round" />
    <path d="M 10 110 Q 230 117 470 110 T 865 112" fill="none" stroke="#8B5CF6" stroke-width="3" stroke-linecap="round" />
  </g>

  <!-- Overview Box -->
  <g transform="translate(105, 215)">
    <path d="${wobblyBoxPath(0, 0, 865, 205, 4)}" fill="#FFFBEB" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#hand-shadow)" />
    <path d="${wobblyBoxPath(24, -16, 210, 32, 2)}" fill="#F59E0B" stroke="#B45309" stroke-width="2" />
    <text x="129" y="6" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#FFFFFF">DEFINING CONCEPT</text>
    <path d="M 35 46 Q 450 42 820 45" stroke="#FEF08A" stroke-width="32" stroke-linecap="round" opacity="0.65" />
    ${renderWrappedSvgText(spec.overview, 35, 52, 38, 56, "font-family=\"'Ink Free', 'Segoe Print', 'Caveat', cursive\" font-size=\"24\" font-weight=\"bold\" fill=\"#1E293B\"")}
  </g>

  <!-- Terminology -->
  <g transform="translate(105, 475)">
    <text x="0" y="28" font-family="'Ink Free', 'Segoe Print', cursive" font-size="30" font-weight="bold" fill="#1E3A8A">Key Terminology &amp; Concepts</text>
    <path d="M 0 38 Q 180 44 380 38" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" />
  </g>
  ${conceptsSvg}

  <!-- Workflow -->
  <g transform="translate(105, 840)">
    <text x="0" y="28" font-family="'Ink Free', 'Segoe Print', cursive" font-size="30" font-weight="bold" fill="#1E3A8A">Execution Workflow &amp; Steps</text>
    <path d="M 0 38 Q 180 44 380 38" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" />
  </g>
  ${stepsSvg}

  <!-- Syntax Box -->
  <g transform="translate(105, 1075)">
    <path d="${wobblyBoxPath(0, 0, 865, 200, 3.5)}" fill="#F0F9FF" stroke="#0284C7" stroke-width="2.5" stroke-dasharray="10,5" filter="url(#hand-shadow)" />
    <path d="${wobblyBoxPath(24, -15, 190, 30, 2)}" fill="#0284C7" />
    <text x="119" y="6" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="15" font-weight="bold" fill="#FFFFFF">${escapeXml(spec.codeOrSyntax[0].label)}</text>
    <path d="M 30 78 Q 400 75 780 77" stroke="#BAE6FD" stroke-width="36" stroke-linecap="round" opacity="0.75" />
    <text x="35" y="87" font-family="'Consolas', 'Ink Free', monospace" font-size="28" font-weight="bold" fill="#0369A1">$ ${escapeXml(spec.codeOrSyntax[0].code)}</text>
    <text x="35" y="150" font-family="'Ink Free', 'Segoe Print', cursive" font-size="20" fill="#334155">Annotation: ${escapeXml(spec.codeOrSyntax[0].note)}</text>
  </g>

  <!-- Warning Box -->
  <g transform="translate(105, 1315)">
    <path d="${wobblyBoxPath(0, 0, 865, 150, 4)}" fill="#FEF2F2" stroke="#DC2626" stroke-width="2.8" filter="url(#hand-shadow)" />
    <circle cx="45" cy="45" r="20" fill="#DC2626" />
    <text x="45" y="55" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="28" font-weight="bold" fill="#FFFFFF">!</text>
    <text x="80" y="44" font-family="'Ink Free', 'Segoe Print', cursive" font-size="24" font-weight="bold" fill="#991B1B">COMMON PITFALL / WARNING</text>
    <path d="M 80 50 Q 220 54 360 50" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" />
    ${renderWrappedSvgText(spec.criticalWarnings[0], 80, 85, 26, 52, "font-family=\"'Ink Free', 'Segoe Print', cursive\" font-size=\"21\" font-weight=\"bold\" fill=\"#7F1D1D\"")}
  </g>

  <!-- Revision Box -->
  <g transform="translate(105, 1500)">
    <path d="${wobblyBoxPath(0, 0, 865, 205, 3.5)}" fill="#F0FDF4" stroke="#16A34A" stroke-width="2.5" filter="url(#hand-shadow)" />
    <path d="${wobblyBoxPath(24, -15, 220, 30, 2)}" fill="#16A34A" />
    <text x="134" y="6" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="15" font-weight="bold" fill="#FFFFFF">QUICK REVISION HIGHLIGHTS</text>
    ${takeawaysSvg}
  </g>

  <!-- Footer -->
  <g transform="translate(105, 1740)">
    <line x1="0" y1="0" x2="865" y2="0" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6,4" />
    <text x="0" y="24" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#64748B">Lecture Loop • Student Handwritten Study Notes</text>
    <text x="865" y="24" text-anchor="end" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#64748B">- Page 1 • Topic 0${topicIndex} -</text>
  </g>
</svg>`;

  const buffer = await sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();
  fs.writeFileSync('uploads/inspection-basic-git-commands.png', buffer);
  console.log('Saved new inspection image, size:', buffer.length);
}

test().catch(console.error);
