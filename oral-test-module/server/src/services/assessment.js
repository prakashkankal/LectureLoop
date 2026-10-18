import { randomUUID } from 'node:crypto';

const defaultFillers = ['um', 'uh', 'actually', 'basically', 'you know', 'like'];
const simpleDefinitions = {
  'functional dependency': 'A rule that says one group of data values determines another.',
  'candidate key': 'The smallest set of columns that can uniquely identify a row.',
  superkey: 'Any set of columns that uniquely identifies a row, possibly with extra columns.',
  'partial dependency': 'When a non-key value depends on only part of a multi-column key.',
  'transitive dependency': 'When one non-key value determines another non-key value indirectly.',
  '1nf': 'A table form where each cell holds one atomic value.',
  '2nf': 'First normal form plus no partial dependency on part of a composite key.',
  '3nf': 'Second normal form plus no transitive dependency on a key.',
  bcnf: 'A stricter normal form where every determinant is a candidate key.',
  anomaly: 'An insertion, update, or deletion problem caused by redundant data.',
  'turnaround time': 'The time from a process arriving until it finishes.',
  'waiting time': 'The total time a process spends waiting in the ready queue.',
  'response time': 'The time from arrival until a process first gets CPU time.',
  'round robin': 'A scheduler that gives each ready process a short turn in rotation.',
  'time quantum': 'The maximum time slice a process gets in one Round Robin turn.',
  starvation: 'An indefinite wait because other work keeps being chosen first.',
  preemption: 'Pausing one running process so another can use the CPU.',
};

const words = (text) => text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
const explainTerm = (term) => simpleDefinitions[term.toLowerCase()] || `A key term from the supplied notes: ${term}. Review its definition there and use it to explain the concept.`;

export function analyzeFillers(text) {
  const configured = process.env.FILLER_EXPRESSIONS
    ? process.env.FILLER_EXPRESSIONS.split(',').map((phrase) => phrase.trim().toLowerCase()).filter(Boolean)
    : defaultFillers;
  const found = configured.flatMap((phrase) => {
    if (phrase === 'like') {
      const positions = [...text.matchAll(/\blike\b/gi)];
      const count = positions.filter((match) => {
        const before = text.slice(0, match.index).trimEnd();
        const after = text.slice(match.index + match[0].length).trimStart();
        return !before && Boolean(after) || /[,;:]$/.test(before) || /^(?:um|uh|you know)\b/i.test(after);
      }).length;
      return count ? [{ phrase: 'like (possible filler)', count }] : [];
    }
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = [...text.matchAll(new RegExp(`\\b${escaped}\\b`, 'gi'))].length;
    return count ? [{ phrase, count }] : [];
  });
  return found;
}

function localQuestionSet(material, difficulty, count) {
  const sentences = material.notes.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 35) || [];
  if (!sentences.length && material.notes.trim()) sentences.push(material.notes.trim());
  const selected = sentences.slice(0, count);
  return selected.map((sentence, index) => ({
    id: randomUUID(),
    question: index === 0
      ? `Explain the central idea in ${material.topic}.`
      : `Explain ${sentence.replace(/ is one of the concepts covered in .+\.?$/i, '').replace(/[.!?]+$/, '')} in your own words.`,
    focus: sentence,
    modelAnswer: sentence,
    keyTerms: (material.keyTerms || []).filter((term) => sentence.toLowerCase().includes(term.toLowerCase())),
    difficulty,
  }));
}

export async function generateQuestions(material, difficulty, count = 5) {
  return { questions: localQuestionSet(material, difficulty, count), provider: 'local' };
}

function localEvaluation({ answer, question, material, durationSeconds }) {
  const answerWords = words(answer);
  const evidenceWords = new Set(words(`${question.focus} ${question.modelAnswer} ${material.keyTerms.join(' ')}`));
  const matched = [...new Set(answerWords.filter((word) => word.length > 3 && evidenceWords.has(word)))];
  const coverage = Math.min(1, matched.length / Math.max(5, Math.min(15, evidenceWords.size * 0.45)));
  const content = Math.round(coverage * 10 * 10) / 10;
  const completeSentences = (answer.match(/[.!?](?:\s|$)/g) || []).length;
  const language = Math.max(1, Math.min(10, Math.round((5 + Math.min(3, completeSentences) + (answerWords.length >= 12 ? 1 : 0) - (answerWords.length < 4 ? 3 : 0)) * 10) / 10));
  const answerTerms = (material.keyTerms || []).filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(answer));
  const missingTerms = (material.keyTerms || []).filter((term) => !answerTerms.includes(term)).slice(0, 6);
  const counts = analyzeFillers(answer);
  const duration = Number(durationSeconds) || 0;
  const pace = duration ? Math.round((answerWords.length / duration) * 60) : 0;
  return {
    contentScore: content,
    languageScore: language,
    scoreReasons: {
      content: 'Local estimate based on overlap with the supplied note concepts. It is not a full semantic judgment.',
      language: 'Local estimate based on answer length and sentence punctuation, not a grammar or accent assessment.',
    },
    correctedEnglish: answer,
    modelAnswer: question.modelAnswer,
    differences: matched.length ? [`Concepts recognized from the notes: ${matched.slice(0, 8).join(', ')}.`, 'Compare the explanation with the source-based model answer for missing detail.'] : ['The response did not clearly match key ideas in the supplied notes.'],
    grammarCorrections: [],
    claritySuggestions: answerWords.length < 12 ? ['Add a complete sentence that explains how or why the concept works.'] : ['Organize the explanation as definition, mechanism, then an example.'],
    vocabulary: {
      correct: answerTerms.map((term) => ({ term, explanation: explainTerm(term) })),
      missing: missingTerms.map((term) => ({ term, explanation: explainTerm(term) })),
      incorrect: [],
      coverage: material.keyTerms.length ? Math.round((answerTerms.length / material.keyTerms.length) * 100) : 0,
    },
    fillers: counts,
    paceWpm: pace,
    paceLabel: duration ? 'Approximate pace based on total answer duration; pauses cannot be reliably excluded.' : 'Not measured for a typed answer because speaking duration is unavailable.',
    speakingSuggestion: counts.length ? 'Pause briefly instead of filling thinking time with repeated expressions.' : 'Keep a steady pace and pause between key ideas.',
    overallScore: Math.round(((content + language) / 2) * 10) / 10,
    evaluationMode: 'local heuristic',
  };
}

export async function evaluateAnswer(input) {
  const { answer, material } = input;
  const evaluation = localEvaluation(input);
  evaluation.overallScore = Math.round(((evaluation.contentScore + evaluation.languageScore) / 2) * 10) / 10;
  evaluation.evaluationMode ||= input.mode;
  if (!input.durationSeconds) {
    evaluation.paceWpm = 0;
    evaluation.paceLabel = 'Not measured for a typed answer because speaking duration is unavailable.';
  } else {
    evaluation.paceWpm = Number.isFinite(evaluation.paceWpm) ? evaluation.paceWpm : 0;
    evaluation.paceLabel ||= 'Approximate pace based on total answer duration; pauses cannot be reliably excluded.';
  }
  evaluation.fillers = Array.isArray(evaluation.fillers) ? evaluation.fillers : analyzeFillers(answer);
  evaluation.vocabulary ||= { correct: [], missing: [], incorrect: [], coverage: 0 };
  const knownTerms = new Set((material.keyTerms || []).map((term) => term.toLowerCase()));
  const correctlyUsedTerms = new Set(evaluation.vocabulary.correct.map((item) => item.term.toLowerCase()).filter((term) => knownTerms.has(term)));
  evaluation.vocabulary.coverage = knownTerms.size ? Math.round((correctlyUsedTerms.size / knownTerms.size) * 100) : 0;
  return evaluation;
}