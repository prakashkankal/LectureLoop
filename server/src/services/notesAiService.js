import OpenAI from 'openai';
import sharp from 'sharp';
import crypto from 'crypto';

/**
 * Helper to convert timestamp string (MM:SS or HH:MM:SS) to total seconds.
 */
function parseTimestampToSeconds(tsStr) {
  if (!tsStr) return 0;
  const parts = tsStr.replace(/[[\]]/g, '').trim().split(':').map(Number);
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  return 0;
}

/**
 * Extract transcript segments belonging to a topic based on time boundaries.
 */
export function extractTopicTranscript(fullTranscript, startSec = 0, endSec = Infinity, topicTitle = '') {
  if (!fullTranscript || typeof fullTranscript !== 'string') {
    return '';
  }

  const pattern = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^[]+)/g;
  const matches = [];
  let match;

  while ((match = pattern.exec(fullTranscript)) !== null) {
    const sec = parseTimestampToSeconds(match[1]);
    const text = match[2].trim();
    matches.push({ sec, time: match[1], text });
  }

  if (matches.length === 0) {
    return fullTranscript.slice(0, 3000);
  }

  const s = Number(startSec) || 0;
  const e = Number(endSec) || Infinity;

  const filtered = matches.filter((m) => m.sec >= s - 2 && m.sec <= e + 2);

  if (filtered.length > 0) {
    return filtered.map((m) => `[${m.time}] ${m.text}`).join('\n');
  }

  const lowerTitle = (topicTitle || '').toLowerCase();
  const titleIndex = fullTranscript.toLowerCase().indexOf(lowerTitle);
  if (titleIndex !== -1) {
    return fullTranscript.substring(Math.max(0, titleIndex - 200), titleIndex + 2500);
  }

  return fullTranscript.slice(0, 3000);
}

/**
 * Generate a source hash for transcript versioning.
 */
export function generateSourceHash(topic, transcriptSlice) {
  const content = `${topic.index}_${topic.title}_${topic.summary}_${transcriptSlice}`;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function createFallbackSpecification(topic, transcriptSlice) {
  const terms = (topic.keyTerms || []).length > 0 ? topic.keyTerms : ['Core Concept', 'Implementation'];
  return {
    topicTitle: topic.title || `Topic ${topic.index}`,
    overview: topic.summary || 'Comprehensive topic review and key learning objectives from lecture transcript.',
    keyConcepts: terms.map((term) => ({
      term,
      explanation: `Key mechanism discussed in topic segment (${topic.startTime || '00:00'} - ${topic.endTime || 'end'}).`,
    })),
    steps: [
      `1. Grasp definition of ${topic.title}`,
      '2. Follow lecture implementation workflow',
      '3. Practice syntax and resolve common pitfalls',
    ],
    codeOrSyntax: [
      {
        label: 'Syntax / Command Pattern',
        code: `${(topic.title || 'action').toLowerCase().replace(/[^a-z0-9]/g, '_')}(options)`,
        note: 'Follow standard convention from lecture',
      },
    ],
    criticalWarnings: [
      'Watch out for syntax mistakes and unverified assumptions.',
    ],
    takeaways: [
      `Mastered key principles of ${topic.title}.`,
      'Ready for checkpoint assessment questions.',
    ],
    diagramSummary: `${topic.title} Process Flow`,
  };
}

export function createHandwrittenNotesPrompt(transcript) {
  return `Create an image of handwritten notes based only on the transcript below. Do not add information that is not in the transcript.\n\nTranscript:\n${transcript}`;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a hand-drawn wobbly path for boxes and containers.
 */
function wobblyBoxPath(x, y, w, h, jitter = 3) {
  const x2 = x + w;
  const y2 = y + h;
  return `M ${x} ${y + jitter}
    Q ${x + w / 2} ${y - jitter} ${x2 - jitter} ${y}
    Q ${x2 + jitter} ${y + h / 2} ${x2} ${y2 - jitter}
    Q ${x + w / 2} ${y2 + jitter} ${x + jitter} ${y2}
    Q ${x - jitter} ${y + h / 2} ${x} ${y + jitter} Z`;
}

/**
 * Render wrapped text lines using native SVG <text> elements.
 * Critical: librsvg drops <foreignObject> tags, so native SVG <text> is required.
 */
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

/**
 * Construct an authentic handwritten student notebook infographic page.
 * Strictly adheres to Sections 2, 3, 4, 5:
 * - White/cream notebook sheet with soft ruled lines and red margin line.
 * - Spiral notebook holes on left margin.
 * - Real student handwriting fonts ('Ink Free', 'Segoe Print', cursive).
 * - Wobbly hand-drawn boxes, curved arrows, highlighter bands.
 * - Purple/blue handwritten headings, black ink explanations, red warning notes, green revision takeaways.
 * - Scanned student notebook aesthetic, NOT a corporate document or clean website screenshot.
 */
export function generateHandwrittenInfographicSvg(spec, topicIndex = 1, lectureTitle = '') {
  const title = escapeXml(spec.topicTitle);
  const lectureName = escapeXml(lectureTitle ? lectureTitle.toUpperCase().slice(0, 45) : '');

  // Generate ruled notebook horizontal lines (every 40px)
  const ruledLines = [];
  for (let y = 140; y < 1740; y += 40) {
    ruledLines.push(`<line x1="88" y1="${y}" x2="975" y2="${y}" stroke="#E0E7FF" stroke-width="1.2" opacity="0.8" />`);
  }

  // Generate spiral binder holes on left margin
  const spiralHoles = [];
  for (let y = 80; y < 1750; y += 75) {
    spiralHoles.push(`
      <circle cx="42" cy="${y}" r="9" fill="#F1F5F9" stroke="#94A3B8" stroke-width="1.8" />
      <circle cx="40" cy="${y - 1}" r="7" fill="#E2E8F0" />
    `);
  }

  // Build Key Concepts (Handwritten bullet points with hand-drawn highlighter blobs)
  const conceptsSvg = (spec.keyConcepts || []).slice(0, 3).map((c, i) => {
    const y = 540 + i * 95;
    return `
      <g transform="translate(105, ${y})">
        <!-- Hand-drawn bullet dot -->
        <circle cx="12" cy="14" r="6" fill="#4F46E5" />
        <circle cx="10" cy="12" r="2.5" fill="#FFFFFF" />

        <!-- Highlighter behind term -->
        <path d="M 28 14 Q 130 11 250 13" stroke="#FEF08A" stroke-width="26" stroke-linecap="round" opacity="0.85" />

        <!-- Handwritten Term in Blue Ink -->
        <text x="32" y="19" font-family="'Ink Free', 'Segoe Print', 'Caveat', cursive" font-size="25" font-weight="bold" fill="#1D4ED8">${escapeXml(c.term)}</text>

        <!-- Handwritten Explanation in Black Pen -->
        <text x="32" y="52" font-family="'Ink Free', 'Segoe Print', 'Caveat', cursive" font-size="20" fill="#0F172A">${escapeXml(c.explanation)}</text>
      </g>
    `;
  }).join('');

  // Build Workflow Diagram (Hand-drawn wobbly boxes with curved connection arrows)
  const steps = (spec.steps || []).slice(0, 3);
  const stepsSvg = steps.map((step, idx) => {
    const stepX = 105 + idx * 295;
    const boxPath = wobblyBoxPath(0, 0, 275, 120, 3.5);
    const stepText = step.replace(/^\d+\.\s*/, '');
    return `
      <g transform="translate(${stepX}, 900)">
        <!-- Wobbly Hand-drawn box -->
        <path d="${boxPath}" fill="#FFFFFF" stroke="#4F46E5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Hand-drawn step circle -->
        <circle cx="26" cy="26" r="14" fill="#6366F1" />
        <text x="26" y="32" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#FFFFFF">${idx + 1}</text>
        <text x="50" y="32" font-family="'Ink Free', 'Segoe Print', cursive" font-size="20" font-weight="bold" fill="#312E81">Phase ${idx + 1}</text>
        ${renderWrappedSvgText(stepText, 18, 64, 24, 22, "font-family=\"'Ink Free', 'Segoe Print', cursive\" font-size=\"18\" font-weight=\"bold\" fill=\"#1E293B\"")}
        ${idx < steps.length - 1 ? `
          <!-- Hand-drawn curved arrow connecting to next step -->
          <g transform="translate(282, 54)">
            <path d="M 0 5 Q 8 -3 16 5" stroke="#3B82F6" stroke-width="3.5" fill="none" stroke-linecap="round" />
            <polygon points="14,1 22,5 14,9" fill="#3B82F6" />
          </g>
        ` : ''}
      </g>
    `;
  }).join('');

  // Primary Syntax & Command block
  const codeBlock = (spec.codeOrSyntax && spec.codeOrSyntax[0]) || {
    label: 'Command Syntax',
    code: 'git status',
    note: 'View modified files in working tree',
  };

  // Warning text
  const warningText = (spec.criticalWarnings && spec.criticalWarnings[0]) || 'Verify changes and branch status before committing.';

  // Takeaways with hand-drawn checkmarks
  const takeaways = (spec.takeaways || []).slice(0, 3);
  const takeawaysSvg = takeaways.map((t, idx) => {
    return `
      <g transform="translate(35, ${40 + idx * 44})">
        <!-- Hand-drawn green checkmark -->
        <circle cx="12" cy="12" r="11" fill="#10B981" />
        <path d="M 6 12 L 10 16 L 18 8" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <text x="36" y="19" font-family="'Ink Free', 'Segoe Print', cursive" font-size="21" font-weight="bold" fill="#064E3B">${escapeXml(t)}</text>
      </g>
    `;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1792" width="1024" height="1792">
  <defs>
    <!-- Paper Texture Filter -->
    <filter id="paper-texture" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
      <feDiffuseLighting in="noise" lighting-color="#FCFCF9" surfaceScale="1.5" result="light">
        <feDistantLight azimuth="60" elevation="50" />
      </feDiffuseLighting>
      <feBlend mode="multiply" in="SourceGraphic" in2="light" />
    </filter>

    <filter id="hand-shadow" x="-3%" y="-3%" width="106%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="3.5" flood-color="#334155" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- ── 1. Realistic Notebook Sheet Paper Base ──────────────────────── -->
  <rect x="0" y="0" width="1024" height="1792" fill="#FBFBFA" />
  <rect x="18" y="18" width="988" height="1756" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.8" filter="url(#hand-shadow)" />

  <!-- Ruled Horizontal Notebook Lines -->
  <g>${ruledLines.join('')}</g>

  <!-- Red Vertical Left Margin Line -->
  <line x1="88" y1="20" x2="88" y2="1770" stroke="#F87171" stroke-width="2.2" opacity="0.85" />

  <!-- Spiral Notebook Punched Holes on Left Margin -->
  <g>${spiralHoles.join('')}</g>

  <!-- Sticky Tape Decoration on Top-Right Corner -->
  <rect x="910" y="8" width="80" height="26" fill="#FDE047" opacity="0.65" transform="rotate(18, 910, 8)" />

  <!-- ── 2. Handwritten Header Banner ─────────────────────────────────── -->
  <g transform="translate(105, 55)">
    <!-- Hand-sketched topic pill badge -->
    <path d="${wobblyBoxPath(0, 0, 185, 36, 2)}" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" />
    <text x="92" y="24" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#4338CA">★ TOPIC 0${topicIndex} NOTES</text>

    <!-- Lecture Title Annotation -->
    <text x="205" y="25" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#64748B">${lectureName ? `LECTURE: ${lectureName}` : 'LECTURE LOOP STUDY NOTES'}</text>

    <!-- Main Title in Bold Blue/Purple Calligraphy Ink -->
    <text x="0" y="88" font-family="'Ink Free', 'Segoe Print', cursive" font-size="44" font-weight="bold" fill="#312E81" letter-spacing="-0.5">${title}</text>

    <!-- Hand-drawn double wavy colored underlines -->
    <path d="M 0 102 Q 220 109 460 102 T 875 104" fill="none" stroke="#3B82F6" stroke-width="4.5" stroke-linecap="round" />
    <path d="M 10 110 Q 230 117 470 110 T 865 112" fill="none" stroke="#8B5CF6" stroke-width="3" stroke-linecap="round" />
  </g>

  <!-- ── 3. Hand-Drawn Definition / Overview Box ──────────────────────── -->
  <g transform="translate(105, 215)">
    <!-- Wobbly hand-sketched box with yellow highlighter background -->
    <path d="${wobblyBoxPath(0, 0, 865, 205, 4)}" fill="#FFFBEB" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#hand-shadow)" />

    <!-- Section Label Tag in handwritten felt pen -->
    <path d="${wobblyBoxPath(24, -16, 210, 32, 2)}" fill="#F59E0B" stroke="#B45309" stroke-width="2" />
    <text x="129" y="6" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#FFFFFF">DEFINING CONCEPT</text>

    <!-- Yellow Highlighter Stroke behind main text -->
    <path d="M 35 46 Q 450 42 820 45" stroke="#FEF08A" stroke-width="32" stroke-linecap="round" opacity="0.65" />
    ${renderWrappedSvgText(spec.overview, 35, 52, 38, 56, "font-family=\"'Ink Free', 'Segoe Print', 'Caveat', cursive\" font-size=\"24\" font-weight=\"bold\" fill=\"#1E293B\"")}
  </g>

  <!-- ── 4. Key Terminology Section ───────────────────────────────────── -->
  <g transform="translate(105, 475)">
    <text x="0" y="28" font-family="'Ink Free', 'Segoe Print', cursive" font-size="30" font-weight="bold" fill="#1E3A8A">Key Terminology &amp; Concepts</text>
    <path d="M 0 38 Q 180 44 380 38" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" />
  </g>
  ${conceptsSvg}

  <!-- ── 5. Hand-Drawn Flowchart & Execution Workflow ─────────────────── -->
  <g transform="translate(105, 840)">
    <text x="0" y="28" font-family="'Ink Free', 'Segoe Print', cursive" font-size="30" font-weight="bold" fill="#1E3A8A">Execution Workflow &amp; Steps</text>
    <path d="M 0 38 Q 180 44 380 38" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" />
  </g>
  ${stepsSvg}

  <!-- ── 6. Exact Technical Syntax & Commands (Hand-lettered box) ─────── -->
  <g transform="translate(105, 1075)">
    <!-- Wobbly Hand-drawn command container -->
    <path d="${wobblyBoxPath(0, 0, 865, 200, 3.5)}" fill="#F0F9FF" stroke="#0284C7" stroke-width="2.5" stroke-dasharray="10,5" filter="url(#hand-shadow)" />

    <!-- Hand-drawn terminal pill -->
    <path d="${wobblyBoxPath(24, -15, 190, 30, 2)}" fill="#0284C7" />
    <text x="119" y="6" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="15" font-weight="bold" fill="#FFFFFF">${escapeXml(codeBlock.label || 'Code & Syntax')}</text>

    <!-- Hand-drawn Code Line with Cyan Highlighter -->
    <path d="M 30 78 Q 400 75 780 77" stroke="#BAE6FD" stroke-width="36" stroke-linecap="round" opacity="0.75" />
    <text x="35" y="87" font-family="'Consolas', 'Ink Free', monospace" font-size="28" font-weight="bold" fill="#0369A1">$ ${escapeXml(codeBlock.code)}</text>

    <text x="35" y="150" font-family="'Ink Free', 'Segoe Print', cursive" font-size="20" fill="#334155">Annotation: ${escapeXml(codeBlock.note || 'Apply parameter within proper scope.')}</text>
  </g>

  <!-- ── 7. Warning & Common Gotchas (Red Pen & Warning Icon) ─────────── -->
  <g transform="translate(105, 1315)">
    <!-- Wobbly Red Box -->
    <path d="${wobblyBoxPath(0, 0, 865, 150, 4)}" fill="#FEF2F2" stroke="#DC2626" stroke-width="2.8" filter="url(#hand-shadow)" />

    <!-- Hand-drawn Warning Exclamation Circle -->
    <circle cx="45" cy="45" r="20" fill="#DC2626" />
    <text x="45" y="55" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="28" font-weight="bold" fill="#FFFFFF">!</text>
    <text x="80" y="44" font-family="'Ink Free', 'Segoe Print', cursive" font-size="24" font-weight="bold" fill="#991B1B">COMMON PITFALL / WARNING</text>
    <path d="M 80 50 Q 220 54 360 50" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" />
    ${renderWrappedSvgText(warningText, 80, 85, 26, 52, "font-family=\"'Ink Free', 'Segoe Print', cursive\" font-size=\"21\" font-weight=\"bold\" fill=\"#7F1D1D\"")}
  </g>

  <!-- ── 8. Quick Revision Takeaways (Green Pastel Highlighter) ──────── -->
  <g transform="translate(105, 1500)">
    <!-- Wobbly Green Highlighter Box -->
    <path d="${wobblyBoxPath(0, 0, 865, 205, 3.5)}" fill="#F0FDF4" stroke="#16A34A" stroke-width="2.5" filter="url(#hand-shadow)" />
    <path d="${wobblyBoxPath(24, -15, 220, 30, 2)}" fill="#16A34A" />
    <text x="134" y="6" text-anchor="middle" font-family="'Ink Free', 'Segoe Print', cursive" font-size="15" font-weight="bold" fill="#FFFFFF">QUICK REVISION HIGHLIGHTS</text>
    ${takeawaysSvg}
  </g>

  <!-- ── 9. Handwritten Notebook Footer ───────────────────────────────── -->
  <g transform="translate(105, 1740)">
    <line x1="0" y1="0" x2="865" y2="0" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6,4" />
    <text x="0" y="24" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#64748B">Lecture Loop • Student Handwritten Study Notes</text>
    <text x="865" y="24" text-anchor="end" font-family="'Ink Free', 'Segoe Print', cursive" font-size="16" font-weight="bold" fill="#64748B">- Page 1 • Topic 0${topicIndex} -</text>
  </g>
</svg>`;
}

/**
 * Generate the final image buffer (PNG).
 * Sends only the topic transcript and a handwritten-notes instruction to the image API.
 * If image generation is unavailable, renders the local handwritten-notes fallback.
 */
export async function generateTopicInfographicImage({
  topic,
  transcriptSlice,
  lectureTitle = '',
  forceMock = false,
}) {
  const openAIKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API || process.env['OPEN-AI-API'];

  // Check if real OpenAI generation can be executed
  const shouldTryOpenAI = !forceMock && Boolean(openAIKey) && process.env.OPENAI_MOCK_IMAGE !== 'true';

  if (shouldTryOpenAI) {
    // List supported GPT image models in priority order
    const supportedModels = [
      process.env.OPENAI_IMAGE_MODEL,
      'gpt-image-1',
      'chatgpt-image-latest',
      'gpt-image-1-mini',
      'gpt-image-2',
      'dall-e-3',
    ].filter(Boolean);

    const openai = new OpenAI({ apiKey: openAIKey });

    for (const model of supportedModels) {
      try {
        const response = await openai.images.generate({
          model,
          prompt: createHandwrittenNotesPrompt(transcriptSlice),
          size: '1024x1792',
          quality: 'standard',
          response_format: 'b64_json',
          n: 1,
        });

        const b64 = response.data?.[0]?.b64_json;
        if (b64) {
          const buffer = Buffer.from(b64, 'base64');
          return {
            buffer,
            spec: null,
            format: 'png',
            width: 1024,
            height: 1792,
            model,
            version: 2,
          };
        }
      } catch (apiErr) {
        console.warn(`[Notes AI] Model '${model}' notice (${apiErr.status || ''} ${apiErr.message}); checking next option.`);
      }
    }
  }

  // Realistic handwritten student notebook infographic rendering using Sharp
  const spec = createFallbackSpecification(topic, transcriptSlice);
  const svg = generateHandwrittenInfographicSvg(spec, topic.index, lectureTitle);
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toBuffer();

  return {
    buffer: pngBuffer,
    spec,
    format: 'png',
    width: 1024,
    height: 1792,
    model: 'handwritten-college-infographic-v2',
    version: 2,
  };
}
