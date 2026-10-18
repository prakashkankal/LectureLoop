import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.resolve(__dirname, '../src/services/notesAiService.js');

const code = String.raw`import OpenAI from 'openai';
import sharp from 'sharp';
import crypto from 'crypto';

function parseTimestampToSeconds(tsStr) {
  if (!tsStr) return 0;
  const parts = tsStr.replace(/[[\]]/g, '').trim().split(':').map(Number);
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  return 0;
}

export function extractTopicTranscript(fullTranscript, startSec = 0, endSec = Infinity, topicTitle = '') {
  if (!fullTranscript || typeof fullTranscript !== 'string') return '';
  const pattern = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^[]+)/g;
  const matches = [];
  let match;
  while ((match = pattern.exec(fullTranscript)) !== null) {
    matches.push({ sec: parseTimestampToSeconds(match[1]), time: match[1], text: match[2].trim() });
  }
  if (matches.length === 0) return fullTranscript.slice(0, 3000);
  const s = Number(startSec) || 0;
  const e = Number(endSec) || Infinity;
  const filtered = matches.filter((m) => m.sec >= s - 2 && m.sec <= e + 2);
  if (filtered.length > 0) return filtered.map((m) => `[${m.time}] ${m.text}`).join('\n');
  const lowerTitle = (topicTitle || '').toLowerCase();
  const titleIndex = fullTranscript.toLowerCase().indexOf(lowerTitle);
  if (titleIndex !== -1) return fullTranscript.substring(Math.max(0, titleIndex - 200), titleIndex + 2500);
  return fullTranscript.slice(0, 3000);
}

export function generateSourceHash(topic, transcriptSlice) {
  const content = `${topic.index}_${topic.title}_${topic.summary}_${transcriptSlice}`;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

export async function generateTopicNotesSpecification(topic, transcriptSlice, lectureTitle = '') {
  const openAIKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API || process.env['OPEN-AI-API'];
  const groqKey = process.env.GROQ_API_KEY || process.env.WISPER_API_KEY;

  const promptInstructions = `You are an expert engineering professor creating rich colorful handwritten student notes infographics.
Extract and organize the topic content into a structured visual notes specification.
All content must be accurate, educationally correct, and directly from the transcript.
Return a JSON object with this EXACT structure:
{
  "topicTitle": "Full topic title",
  "lectureSubtitle": "Short subtitle",
  "section1": {
    "heading": "What is [Topic]?",
    "bullets": ["Point 1", "Point 2"],
    "sideBoxTitle": "Key Points :",
    "sideBoxItems": ["P1","P2","P3","P4","P5"]
  },
  "section2": {
    "heading": "Key Features / How It Works",
    "bullets": ["F1","F2","F3"],
    "sideBoxTitle": "Key Features :",
    "sideBoxItems": ["F1","F2","F3","F4","F5"]
  },
  "comparisonTable": {
    "heading": "Key Concepts & Differences",
    "col1Header": "Concept A",
    "col2Header": "Concept B",
    "rows": [["R1A","R1B"],["R2A","R2B"],["R3A","R3B"],["R4A","R4B"]]
  },
  "terminology": [
    {"term":"Term1","definition":"Def1"},
    {"term":"Term2","definition":"Def2"},
    {"term":"Term3","definition":"Def3"},
    {"term":"Term4","definition":"Def4"}
  ],
  "workflowSteps": [
    {"title":"S1","desc":"What happens","command":"cmd if any"},
    {"title":"S2","desc":"What happens","command":""},
    {"title":"S3","desc":"What happens","command":""},
    {"title":"S4","desc":"What happens","command":""}
  ],
  "revisionPoints": ["Rev1","Rev2","Rev3"],
  "importantPoints": ["Imp1","Imp2","Imp3","Imp4"]
}`;

  const userInput = `Lecture: ${lectureTitle}
Topic #${topic.index}: ${topic.title}
Summary: ${topic.summary || 'N/A'}
Key Terms: ${(topic.keyTerms || []).join(', ')}

Transcript:
${transcriptSlice.slice(0, 4000)}`;

  if (groqKey) {
    try {
      const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
      const resp = await groq.chat.completions.create({
        model: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        messages: [{ role: 'system', content: promptInstructions }, { role: 'user', content: userInput }],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0]?.message?.content || '{}');
      if (parsed.topicTitle && (parsed.section1 || parsed.terminology)) return sanitizeSpecification(parsed, topic);
    } catch (gErr) { console.warn('[Notes AI] Groq notice:', gErr.message); }
  }

  if (openAIKey) {
    try {
      const openai = new OpenAI({ apiKey: openAIKey });
      const resp = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [{ role: 'system', content: promptInstructions }, { role: 'user', content: userInput }],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(resp.choices[0]?.message?.content || '{}');
      if (parsed.topicTitle && (parsed.section1 || parsed.terminology)) return sanitizeSpecification(parsed, topic);
    } catch (oErr) { console.warn('[Notes AI] OpenAI notice:', oErr.message); }
  }

  return createFallbackSpecification(topic, transcriptSlice);
}

function sanitizeSpecification(parsed, topic) {
  const terms = topic.keyTerms || [];
  const t = topic.title || 'Topic';
  return {
    topicTitle: parsed.topicTitle || t,
    lectureSubtitle: parsed.lectureSubtitle || t,
    section1: {
      heading: parsed.section1?.heading || `What is ${t}?`,
      bullets: Array.isArray(parsed.section1?.bullets) && parsed.section1.bullets.length > 0 ? parsed.section1.bullets.slice(0, 3) : [`${t} is a core concept.`, 'It enables efficient development workflows.'],
      sideBoxTitle: parsed.section1?.sideBoxTitle || 'Key Points :',
      sideBoxItems: Array.isArray(parsed.section1?.sideBoxItems) && parsed.section1.sideBoxItems.length > 0 ? parsed.section1.sideBoxItems.slice(0, 5) : ['Core functionality', 'Wide adoption', 'Industry standard', 'Reliable', 'Well documented'],
    },
    section2: {
      heading: parsed.section2?.heading || 'Key Features & Usage',
      bullets: Array.isArray(parsed.section2?.bullets) && parsed.section2.bullets.length > 0 ? parsed.section2.bullets.slice(0, 3) : [`${t} includes structured workflow.`, 'Provides robust tooling.', 'Used in production systems.'],
      sideBoxTitle: parsed.section2?.sideBoxTitle || 'Key Features :',
      sideBoxItems: Array.isArray(parsed.section2?.sideBoxItems) && parsed.section2.sideBoxItems.length > 0 ? parsed.section2.sideBoxItems.slice(0, 5) : ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'Feature E'],
    },
    comparisonTable: {
      heading: parsed.comparisonTable?.heading || 'Key Concepts & Differences',
      col1Header: parsed.comparisonTable?.col1Header || 'Aspect',
      col2Header: parsed.comparisonTable?.col2Header || 'Detail',
      rows: Array.isArray(parsed.comparisonTable?.rows) && parsed.comparisonTable.rows.length > 0 ? parsed.comparisonTable.rows.slice(0, 4) : [['Definition', 'Core purpose'], ['Usage', 'Practical area'], ['Scope', 'Where it applies'], ['Example', 'Real-world usage']],
    },
    terminology: Array.isArray(parsed.terminology) && parsed.terminology.length > 0
      ? parsed.terminology.slice(0, 4).map((tm) => ({ term: tm.term || 'Term', definition: tm.definition || 'Core concept.' }))
      : terms.slice(0, 4).map((tm) => ({ term: tm, definition: 'Essential building block of this topic.' })),
    workflowSteps: Array.isArray(parsed.workflowSteps) && parsed.workflowSteps.length > 0
      ? parsed.workflowSteps.slice(0, 4).map((s) => ({ title: s.title || 'Step', desc: s.desc || '', command: s.command || '' }))
      : [{ title: 'Initialize', desc: 'Set up environment', command: '' }, { title: 'Configure', desc: 'Set parameters', command: '' }, { title: 'Execute', desc: 'Run process', command: '' }, { title: 'Verify', desc: 'Check results', command: '' }],
    revisionPoints: Array.isArray(parsed.revisionPoints) && parsed.revisionPoints.length > 0 ? parsed.revisionPoints.slice(0, 3) : [`${t} is fundamental.`, 'Practice regularly.', 'Review terminology.'],
    importantPoints: Array.isArray(parsed.importantPoints) && parsed.importantPoints.length > 0 ? parsed.importantPoints.slice(0, 4) : ['Follow best practices.', 'Verify your work.', 'Understand concepts.', 'Collaborate often.'],
  };
}

function createFallbackSpecification(topic, transcriptSlice) {
  const terms = (topic.keyTerms || []).length > 0 ? topic.keyTerms : ['Core Concept', 'Implementation', 'Workflow', 'Output'];
  const t = topic.title || 'Topic';
  return {
    topicTitle: t,
    lectureSubtitle: t,
    section1: {
      heading: `What is ${t}?`,
      bullets: [`${t} is a fundamental concept covering key principles from the lecture.`, 'It is widely used in real-world applications and forms the basis for advanced topics.'],
      sideBoxTitle: 'Key Points :',
      sideBoxItems: ['Core concept', 'Practical usage', 'Industry standard', 'Well documented', 'Widely adopted'],
    },
    section2: {
      heading: 'How It Works',
      bullets: [`${t} operates through a structured process.`, 'Each step builds on the previous, creating a reliable workflow.', 'Understanding internals helps debug and optimize.'],
      sideBoxTitle: 'Key Features :',
      sideBoxItems: ['Structured process', 'Repeatable steps', 'Debuggable', 'Optimizable', 'Scalable'],
    },
    comparisonTable: {
      heading: 'Concepts & Comparison',
      col1Header: `Without ${t.split(' ')[0]}`,
      col2Header: `With ${t.split(' ')[0]}`,
      rows: [['Manual process', 'Automated workflow'], ['Error prone', 'Reliable & consistent'], ['Hard to scale', 'Easily scalable'], ['No history', 'Full audit trail']],
    },
    terminology: terms.slice(0, 4).map((term) => ({ term, definition: `Key mechanism discussed in the ${t} topic segment.` })),
    workflowSteps: [
      { title: `Learn ${t}`, desc: 'Study the core concept', command: '' },
      { title: 'Setup', desc: 'Configure environment', command: '' },
      { title: 'Apply', desc: 'Implement in practice', command: '' },
      { title: 'Verify', desc: 'Test and validate', command: '' },
    ],
    revisionPoints: [`${t} is a core topic. Understand the definition clearly.`, 'Follow workflow steps in order.', 'Review terminology cards before exam.'],
    importantPoints: ['Read documentation before starting.', 'Practice with real examples.', 'Ask questions when stuck.', `${t} is used widely in industry.`],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SVG HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderWrappedSvgText(text, x, startY, lineHeight, maxChars, fontProps) {
  const words = String(text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) { if (current) lines.push(current); current = word; }
    else { current = (current + ' ' + word).trim(); }
  }
  if (current) lines.push(current);
  return lines.map((line, idx) => `<text x="${x}" y="${startY + idx * lineHeight}" ${fontProps}>${escapeXml(line)}</text>`).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SVG GENERATOR — Reference-image style
// ─────────────────────────────────────────────────────────────────────────────

export function generateHandwrittenInfographicSvg(spec, topicIndex = 1, lectureTitle = '') {
  const HW = "'Ink Free', 'Segoe Print', 'Caveat', cursive";
  const MONO = "'Consolas', 'Courier New', monospace";
  const lectureName = escapeXml(lectureTitle ? lectureTitle.slice(0, 40) : 'Lecture Loop');
  const title = escapeXml(spec.topicTitle || 'Topic Notes');
  const padNum = String(topicIndex).padStart(2, '0');

  // Ruled lines & spiral holes
  const ruledLines = [];
  for (let y = 150; y < 1780; y += 38) ruledLines.push(`<line x1="88" y1="${y}" x2="990" y2="${y}" stroke="#DBEAFE" stroke-width="1" opacity="0.9" />`);
  const spiralHoles = [];
  for (let y = 70; y < 1800; y += 72) spiralHoles.push(`<circle cx="44" cy="${y}" r="10" fill="#F0F4F8" stroke="#94A3B8" stroke-width="1.8" /><circle cx="42" cy="${y - 1}" r="7.5" fill="#E2E8F0" />`);

  // Mini helpers (inline, use outer-scope escapeXml / renderWrappedSvgText)
  const sNCircle = (cx, cy, num, bg) =>
    `<circle cx="${cx}" cy="${cy}" r="16" fill="${bg}" /><text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${HW}" font-size="18" font-weight="bold" fill="#FFFFFF">${num}</text>`;

  const hlHead = (text, x, y, bgColor) => {
    const len = Math.min(String(text).length * 13, 520);
    return `<rect x="${x - 4}" y="${y - 20}" width="${len}" height="26" fill="${bgColor}" rx="3" opacity="0.85" /><text x="${x}" y="${y}" font-family="${HW}" font-size="22" font-weight="bold" fill="#1A237E">${escapeXml(text)}</text><path d="M ${x - 4} ${y + 8} Q ${x + len / 2} ${y + 12} ${x + len} ${y + 8}" fill="none" stroke="#1565C0" stroke-width="2" stroke-linecap="round" />`;
  };

  const calloutBox = (x, y, w, h, border, bg, ttl, items) => {
    const tBg = border === '#388E3C' ? '#C8E6C9' : '#EDE7F6';
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" rx="8" stroke="${border}" stroke-width="2" stroke-dasharray="8,5" /><rect x="${x + 10}" y="${y - 12}" width="${Math.min(String(ttl).length * 11 + 20, w - 10)}" height="22" fill="${tBg}" rx="4" /><text x="${x + 18}" y="${y + 5}" font-family="${HW}" font-size="17" font-weight="bold" fill="${border}">${escapeXml(ttl)}</text>`;
    items.forEach((item, i) => {
      out += `<circle cx="${x + 20}" cy="${y + 46 + i * 30}" r="3.5" fill="${border}" />`;
      out += renderWrappedSvgText(item, x + 32, y + 50 + i * 30, 24, 20, `font-family="${HW}" font-size="16" fill="#212121"`);
    });
    return out;
  };

  const bulletRow = (text, x, y, dot) =>
    `<circle cx="${x + 6}" cy="${y - 4}" r="4" fill="${dot}" />${renderWrappedSvgText(text, x + 20, y, 26, 40, `font-family="${HW}" font-size="19" fill="#212121"`)}`;

  // ── Section 1 ─────────────────────────────────────────────────────
  const s1 = spec.section1 || {};
  const s1b = (s1.bullets || []).slice(0, 3);
  const s1si = (s1.sideBoxItems || []).slice(0, 5);
  const s1bSvg = s1b.map((b, i) => bulletRow(b, 110, 330 + i * 64, '#1565C0')).join('');
  const s1bh = Math.max(160, s1si.length * 30 + 58);
  const s1box = calloutBox(728, 285, 240, s1bh, '#388E3C', '#F1F8E9', s1.sideBoxTitle || 'Key Points :', s1si);

  // ── Section 2 ─────────────────────────────────────────────────────
  const s2StartY = 290 + s1b.length * 64 + 80;
  const s2 = spec.section2 || {};
  const s2b = (s2.bullets || []).slice(0, 3);
  const s2si = (s2.sideBoxItems || []).slice(0, 5);
  const s2bSvg = s2b.map((b, i) => bulletRow(b, 110, s2StartY + 48 + i * 64, '#6A1B9A')).join('');
  const s2bh = Math.max(160, s2si.length * 30 + 58);
  const s2box = calloutBox(728, s2StartY, 240, s2bh, '#6A1B9A', '#F3E5F5', s2.sideBoxTitle || 'Key Features :', s2si);

  // ── Section 3: Comparison Table ───────────────────────────────────
  const s3StartY = s2StartY + s2b.length * 64 + 80;
  const ct = spec.comparisonTable || {};
  const ctRows = (ct.rows || []).slice(0, 4);
  const colW = 428;
  const rowH = 44;
  const tableBodyH = (ctRows.length + 1) * rowH;

  let tableHtml = '';
  // Header row
  tableHtml += `<rect x="105" y="${s3StartY + 34}" width="${colW}" height="${rowH}" fill="#1565C0" /><rect x="${105 + colW + 4}" y="${s3StartY + 34}" width="${colW}" height="${rowH}" fill="#6A1B9A" />`;
  tableHtml += `<text x="${105 + colW / 2}" y="${s3StartY + 60}" text-anchor="middle" font-family="${HW}" font-size="18" font-weight="bold" fill="#FFFFFF">${escapeXml(ct.col1Header || 'Concept A')}</text>`;
  tableHtml += `<text x="${105 + colW + 4 + colW / 2}" y="${s3StartY + 60}" text-anchor="middle" font-family="${HW}" font-size="18" font-weight="bold" fill="#FFFFFF">${escapeXml(ct.col2Header || 'Concept B')}</text>`;
  // Data rows
  ctRows.forEach((row, i) => {
    const ry = s3StartY + 34 + (i + 1) * rowH;
    const bg1 = i % 2 === 0 ? '#E3F2FD' : '#FFFFFF';
    const bg2 = i % 2 === 0 ? '#F3E5F5' : '#FFFFFF';
    tableHtml += `<rect x="105" y="${ry}" width="${colW}" height="${rowH}" fill="${bg1}" stroke="#90CAF9" stroke-width="1" />`;
    tableHtml += `<rect x="${105 + colW + 4}" y="${ry}" width="${colW}" height="${rowH}" fill="${bg2}" stroke="#CE93D8" stroke-width="1" />`;
    tableHtml += renderWrappedSvgText(row[0] || '', 115, ry + 28, 20, 27, `font-family="${HW}" font-size="17" fill="#212121"`);
    tableHtml += renderWrappedSvgText(row[1] || '', 115 + colW + 4, ry + 28, 20, 27, `font-family="${HW}" font-size="17" fill="#212121"`);
  });
  // Outer border
  tableHtml += `<rect x="105" y="${s3StartY + 34}" width="${colW * 2 + 4}" height="${tableBodyH}" fill="none" stroke="#1565C0" stroke-width="2" />`;

  // ── Section 4: Terminology Cards ─────────────────────────────────
  const s4StartY = s3StartY + tableBodyH + 115;
  const terminology = (spec.terminology || []).slice(0, 4);
  const cardW = 200;
  const cardH = 148;
  const cBg = ['#E3F2FD', '#F3E5F5', '#E8F5E9', '#FFF8E1'];
  const cBd = ['#1565C0', '#6A1B9A', '#2E7D32', '#E65100'];
  const iconPaths = [
    // folder
    `<path d="M 10 14 L 10 30 L 46 30 L 46 14 Z M 10 14 L 20 7 L 34 7 L 34 14" fill="none" stroke="%%BD%%" stroke-width="2.5" stroke-linejoin="round" />`,
    // clipboard
    `<rect x="14" y="7" width="28" height="24" rx="2" fill="none" stroke="%%BD%%" stroke-width="2.5" /><line x1="14" y1="13" x2="42" y2="13" stroke="%%BD%%" stroke-width="2" /><circle cx="28" cy="7" r="4" fill="none" stroke="%%BD%%" stroke-width="2" />`,
    // branch
    `<circle cx="18" cy="10" r="5" fill="none" stroke="%%BD%%" stroke-width="2.5" /><circle cx="38" cy="27" r="5" fill="none" stroke="%%BD%%" stroke-width="2.5" /><path d="M 18 15 Q 18 27 38 27" fill="none" stroke="%%BD%%" stroke-width="2.5" />`,
    // cloud
    `<path d="M 12 24 Q 8 24 8 18 Q 8 12 16 12 Q 18 7 26 7 Q 36 7 36 16 Q 44 16 44 22 Q 44 28 36 28 L 12 28 Z" fill="none" stroke="%%BD%%" stroke-width="2.5" />`,
  ];
  const termSvg = terminology.map((term, i) => {
    const cx = 105 + i * (cardW + 18);
    const bd = cBd[i % 4];
    const bg = cBg[i % 4];
    const ico = iconPaths[i % 4].replace(/%%BD%%/g, bd);
    return `<g transform="translate(${cx}, ${s4StartY + 32})"><rect x="0" y="0" width="${cardW}" height="${cardH}" fill="${bg}" rx="10" stroke="${bd}" stroke-width="2.5" /><g transform="translate(8,6)">${ico}</g><text x="${cardW / 2}" y="52" text-anchor="middle" font-family="${HW}" font-size="17" font-weight="bold" fill="${bd}">${escapeXml(term.term)}</text><line x1="14" y1="60" x2="${cardW - 14}" y2="60" stroke="${bd}" stroke-width="1.5" stroke-dasharray="4,3" />${renderWrappedSvgText(term.definition, 10, 78, 22, 20, `font-family="${HW}" font-size="15" fill="#212121"`)}</g>`;
  }).join('');

  // ── Section 5: Workflow Steps ─────────────────────────────────────
  const s5StartY = s4StartY + cardH + 100;
  const wfSteps = (spec.workflowSteps || []).slice(0, 4);
  const stepW = 195;
  const stepH = 135;
  const sBg = ['#E3F2FD', '#E8F5E9', '#FFF9C4', '#FCE4EC'];
  const sBd = ['#1565C0', '#2E7D32', '#F9A825', '#C62828'];
  const wfSvg = wfSteps.map((step, i) => {
    const sx = 100 + i * (stepW + 28);
    const bg = sBg[i % 4];
    const bd = sBd[i % 4];
    const hasCmd = step.command && step.command.trim();
    let g = `<g transform="translate(${sx}, ${s5StartY + 32})"><rect x="0" y="0" width="${stepW}" height="${stepH}" fill="${bg}" rx="10" stroke="${bd}" stroke-width="2.5" /><circle cx="${stepW / 2}" cy="-12" r="14" fill="${bd}" /><text x="${stepW / 2}" y="-6" text-anchor="middle" font-family="${HW}" font-size="16" font-weight="bold" fill="#FFFFFF">${i + 1}</text><text x="${stepW / 2}" y="28" text-anchor="middle" font-family="${HW}" font-size="19" font-weight="bold" fill="${bd}">${escapeXml(step.title)}</text>${renderWrappedSvgText(step.desc, 10, 52, 22, 20, `font-family="${HW}" font-size="16" fill="#212121"`)}`;
    if (hasCmd) g += `<rect x="6" y="${stepH - 34}" width="${stepW - 12}" height="24" fill="#37474F" rx="4" /><text x="${stepW / 2}" y="${stepH - 17}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="#80DEEA">${escapeXml(step.command.slice(0, 26))}</text>`;
    if (i < wfSteps.length - 1) g += `<path d="M ${stepW + 4} ${stepH / 2} L ${stepW + 22} ${stepH / 2}" stroke="${bd}" stroke-width="3" stroke-linecap="round" /><polygon points="${stepW + 18},${stepH / 2 - 5} ${stepW + 28},${stepH / 2} ${stepW + 18},${stepH / 2 + 5}" fill="${bd}" />`;
    g += '</g>';
    return g;
  }).join('');

  // ── Section 6: Revision + Important Points ────────────────────────
  const s6StartY = s5StartY + stepH + 115;
  const revPts = (spec.revisionPoints || []).slice(0, 3);
  const impPts = (spec.importantPoints || []).slice(0, 4);

  let revSvg = '';
  revPts.forEach((r, i) => {
    revSvg += `<circle cx="18" cy="${55 + i * 54}" r="12" fill="#2E7D32" /><path d="M 12 ${55 + i * 54} L 16 ${59 + i * 54} L 24 ${51 + i * 54}" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
    revSvg += renderWrappedSvgText(r, 36, 59 + i * 54, 24, 24, `font-family="${HW}" font-size="17" fill="#212121"`);
  });

  let impSvg = '';
  impPts.forEach((p, i) => {
    impSvg += `<circle cx="496" cy="${64 + i * 46}" r="4" fill="#E65100" />`;
    impSvg += renderWrappedSvgText(p, 512, 68 + i * 46, 22, 22, `font-family="${HW}" font-size="17" fill="#212121"`);
  });

  const revBoxH = Math.max(170, revPts.length * 54 + 58);
  const impBoxH = Math.max(170, impPts.length * 46 + 62);
  const totalH = s6StartY + Math.max(revBoxH, impBoxH) + 85;

  // ── Assemble SVG ──────────────────────────────────────────────────
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1056 ${totalH}" width="1056" height="${totalH}">
  <defs>
    <filter id="shadow" x="-4%" y="-4%" width="108%" height="112%">
      <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#94A3B8" flood-opacity="0.18" />
    </filter>
  </defs>

  <!-- Paper base -->
  <rect x="0" y="0" width="1056" height="${totalH}" fill="#F9F9F7" />
  <rect x="20" y="20" width="1016" height="${totalH - 40}" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadow)" />

  <!-- Ruled lines -->
  <g>${ruledLines.join('')}</g>

  <!-- Red margin -->
  <line x1="90" y1="20" x2="90" y2="${totalH - 20}" stroke="#EF9A9A" stroke-width="2" opacity="0.9" />

  <!-- Spiral holes -->
  <g>${spiralHoles.join('')}</g>

  <!-- Sticky tape -->
  <rect x="920" y="10" width="90" height="22" fill="#FDD835" opacity="0.7" transform="rotate(15, 920, 10)" rx="3" />

  <!-- ═══ HEADER ══════════════════════════════════════════════ -->
  <g transform="translate(108, 42)">
    <rect x="0" y="0" width="162" height="30" rx="8" fill="#EDE7F6" stroke="#7B1FA2" stroke-width="1.8" />
    <text x="81" y="20" text-anchor="middle" font-family="${HW}" font-size="16" font-weight="bold" fill="#7B1FA2">Topic ${padNum} &#8211; Notes</text>
    <text x="200" y="16" font-family="${HW}" font-size="16" fill="#546E7A">Lecture : ${lectureName}</text>
    <text x="200" y="34" font-family="${HW}" font-size="15" fill="#90A4AE">Date : ___________</text>
  </g>

  <!-- ═══ TITLE ════════════════════════════════════════════════ -->
  <g transform="translate(108, 84)">
    <text x="2" y="56" font-family="${HW}" font-size="46" font-weight="bold" fill="#BBDEFB" opacity="0.7">${title}</text>
    <text x="0" y="54" font-family="${HW}" font-size="46" font-weight="bold" fill="#0D47A1">${title}</text>
    <path d="M 0 66 Q 200 74 440 66 T 880 68" fill="none" stroke="#1565C0" stroke-width="4" stroke-linecap="round" />
    <path d="M 10 74 Q 210 82 450 74 T 870 76" fill="none" stroke="#7B1FA2" stroke-width="2.5" stroke-linecap="round" />
  </g>

  <!-- ═══ SECTION 1 ════════════════════════════════════════════ -->
  <g transform="translate(108, 162)">
    ${sNCircle(16, 26, '1', '#FF8F00')}
    ${hlHead(s1.heading || 'What is this topic?', 40, 34, '#FFF9C4')}
    ${s1bSvg}
    ${s1box}
  </g>

  <!-- ═══ SECTION 2 ════════════════════════════════════════════ -->
  <g transform="translate(108, ${s2StartY - 162})">
    ${sNCircle(16, 26, '2', '#7B1FA2')}
    ${hlHead(s2.heading || 'Key Features', 40, 34, '#F3E5F5')}
    ${s2bSvg}
    ${s2box}
  </g>

  <!-- ═══ SECTION 3: Table ════════════════════════════════════ -->
  <g transform="translate(108, ${s3StartY - 162})">
    ${sNCircle(16, 26, '3', '#1565C0')}
    ${hlHead(ct.heading || 'Key Concepts &amp; Differences', 40, 34, '#E3F2FD')}
  </g>
  ${tableHtml}

  <!-- ═══ SECTION 4: Cards ════════════════════════════════════ -->
  <g transform="translate(108, ${s4StartY})">
    ${sNCircle(16, 20, '4', '#2E7D32')}
    ${hlHead('Key Terminology &amp; Concepts', 40, 28, '#E8F5E9')}
  </g>
  ${termSvg}

  <!-- ═══ SECTION 5: Workflow ═════════════════════════════════ -->
  <g transform="translate(108, ${s5StartY})">
    ${sNCircle(16, 20, '5', '#C62828')}
    ${hlHead('Basic Workflow (How it works ?)', 40, 28, '#FFEBEE')}
  </g>
  ${wfSvg}

  <!-- ═══ SECTION 6: Revision + Important ════════════════════ -->
  <g transform="translate(108, ${s6StartY})">
    ${sNCircle(16, 20, '6', '#00838F')}
    ${hlHead('Quick Revision Highlights', 40, 28, '#E0F7FA')}

    <!-- Green revision box -->
    <rect x="0" y="44" width="452" height="${revBoxH}" fill="#F1F8E9" rx="10" stroke="#388E3C" stroke-width="2.5" stroke-dasharray="9,5" />
    ${revSvg}

    <!-- Orange important points box -->
    <rect x="480" y="44" width="452" height="${impBoxH}" fill="#FFF8E1" rx="10" stroke="#E65100" stroke-width="2.5" stroke-dasharray="9,5" />
    <circle cx="508" cy="64" r="12" fill="#FFC107" />
    <text x="508" y="70" text-anchor="middle" font-family="${HW}" font-size="15" fill="#FFFFFF">!</text>
    <text x="528" y="69" font-family="${HW}" font-size="19" font-weight="bold" fill="#E65100">Important Points !</text>
    ${impSvg}
  </g>

  <!-- ═══ FOOTER ═══════════════════════════════════════════════ -->
  <g transform="translate(108, ${totalH - 28})">
    <line x1="0" y1="0" x2="880" y2="0" stroke="#CBD5E1" stroke-width="1.2" stroke-dasharray="5,4" />
    <text x="0" y="20" font-family="${HW}" font-size="15" fill="#94A3B8">Lecture Loop &#8226; Student Handwritten Study Notes</text>
    <text x="880" y="20" text-anchor="end" font-family="${HW}" font-size="15" fill="#94A3B8">Page 1 &#8226; Topic ${padNum}</text>
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function generateTopicInfographicImage({ topic, transcriptSlice, lectureTitle = '', forceMock = false }) {
  const openAIKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API || process.env['OPEN-AI-API'];
  const spec = await generateTopicNotesSpecification(topic, transcriptSlice, lectureTitle);
  const shouldTryOpenAI = !forceMock && Boolean(openAIKey) && process.env.OPENAI_MOCK_IMAGE !== 'true';

  if (shouldTryOpenAI) {
    const models = [process.env.OPENAI_IMAGE_MODEL, 'gpt-image-1', 'chatgpt-image-latest', 'gpt-image-1-mini', 'gpt-image-2', 'dall-e-3'].filter(Boolean);
    const openai = new OpenAI({ apiKey: openAIKey });
    const s1 = spec.section1 || {};
    const s2 = spec.section2 || {};
    const ct = spec.comparisonTable || {};
    const prompt = `Create a full-page handwritten student engineering notebook page for topic "${spec.topicTitle}". STYLE: Authentic A4 college notebook, white paper with light blue ruled lines and red left margin, spiral holes. All text handwritten in colored pens. LAYOUT: 1. Header badge "Topic ${String(topicIndex || 1).padStart(2,'0')} - Notes" purple outline. 2. Large bold navy title "${spec.topicTitle}" double wavy underline. 3. Orange circle "1" + yellow highlight heading "${s1.heading||''}" + bullets + green dashed callout ${(s1.sideBoxItems||[]).join(', ')}. 4. Purple circle "2" + "${s2.heading||''}" + bullets + purple dashed callout. 5. Blue circle "3" + comparison table "${ct.col1Header||''}" vs "${ct.col2Header||''}" with ${(ct.rows||[]).map((r) => r.join('|')).join('; ')}. 6. Green circle "4" + 4 colored terminology cards. 7. Red circle "5" + workflow boxes with arrows. 8. Teal circle "6" + green revision box + orange important points box. NEGATIVE: No typed text, no digital fonts, no corporate look. Must look like real physical notebook.`.slice(0, 3900);

    for (const model of models) {
      try {
        const response = await openai.images.generate({ model, prompt, size: '1024x1792', quality: 'standard', response_format: 'b64_json', n: 1 });
        const b64 = response.data?.[0]?.b64_json;
        if (b64) return { buffer: Buffer.from(b64, 'base64'), spec, format: 'png', width: 1024, height: 1792, model, version: 3 };
      } catch (e) { console.warn(`[Notes AI] Model ${model} notice:`, e.message); }
    }
  }

  const svg = generateHandwrittenInfographicSvg(spec, topic.index, lectureTitle);
  const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();
  return { buffer: pngBuffer, spec, format: 'png', width: 1056, height: 1820, model: 'handwritten-college-infographic-v3', version: 3 };
}
`;

fs.writeFileSync(dest, code, 'utf8');
console.log('Written', dest, 'bytes:', code.length);
