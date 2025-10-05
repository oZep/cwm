import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const problemsFilePath = path.join(__dirname, 'leetcode-train.jsonl');
let allProblems = [];

// Load JSONL safely
try {
  const raw = fs.readFileSync(problemsFilePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      parsed.push(JSON.parse(lines[i]));
    } catch (e) {
      console.warn(`Skipping invalid JSON on line ${i + 1}: ${e.message}`);
    }
  }
  allProblems = parsed;
  console.log(`Loaded ${allProblems.length} problems from file.`);
} catch (err) {
  console.error('Failed to load problems:', err);
  process.exit(1);
}

// Map from generic 'cpp' to JSONL key 'c++'
function langKey(lang) {
  if (lang === 'cpp') return 'c++';
  return lang;
}

// Extract first fenced code block from a markdown-ish string
function extractCodeBlock(str) {
  if (!str) return null;
  const m = String(str).match(/```[a-zA-Z0-9+]*\s*([\s\S]*?)```/);
  if (m && m[1]) return m[1].trim();
  // No fence found: return as-is
  return String(str).trim();
}

export function getProblemRaw(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;
  return allProblems.find((p) => Number(p.id) === numericId) || null;
}

/**
 * Return unified problem details with optional language-specific starter code.
 */
export function getProblemDetails(id = null, language = null) {
  if (!allProblems.length) return null;

  const numericId = id != null ? Number(id) : null;
  let problem;
  if (numericId != null && !Number.isNaN(numericId)) {
    problem = allProblems.find((p) => Number(p.id) === numericId);
    if (!problem) return null;
  } else {
    const randomIndex = Math.floor(Math.random() * allProblems.length);
    problem = allProblems[randomIndex];
  }

  const result = {
    id: Number(problem.id),
    slug: problem.slug,
    title: problem.title ?? problem.name ?? problem.slug ?? `Problem ${problem.id}`,
    difficulty: problem.difficulty || '',
    content: problem.content ?? problem.prompt ?? problem.description ?? '',
    code: null,
  };

  if (language) {
    const key = langKey(language);
    const snippetRaw = problem[key];
    if (snippetRaw) {
      result.code = extractCodeBlock(snippetRaw);
    } else {
      result.code = { error: `Starter code in '${language}' not available for problem ID: ${result.id}.` };
    }
  }

  return result;
}

export function getSolutionCode(problemRaw, language) {
  if (!problemRaw || !language) return null;
  const key = langKey(language);
  const snippetRaw = problemRaw[key];
  if (!snippetRaw) return null;
  return extractCodeBlock(snippetRaw);
}

// Try to obtain an entry function name
export function getEntryName(problemRaw, language) {
  if (!problemRaw) return null;

  // If JSONL provides an entry mapping or string
  if (typeof problemRaw.entry === 'string') return problemRaw.entry;
  if (problemRaw.entry && typeof problemRaw.entry === 'object') {
    const key = langKey(language);
    if (problemRaw.entry[key]) return problemRaw.entry[key];
  }

  // Heuristics: derive from code
  const code = getSolutionCode(problemRaw, language) || '';
  if (language === 'javascript') {
    // function NAME( ... ) or const NAME = ( ... ) =>
    let m = code.match(/function\s+([A-Za-z_]\w*)\s*KATEX_INLINE_OPEN/);
    if (m) return m[1];
    m = code.match(/const\s+([A-Za-z_]\w*)\s*=\s*KATEX_INLINE_OPEN/);
    if (m) return m[1];
  }
  if (language === 'python') {
    const m = code.match(/def\s+([A-Za-z_]\w*)\s*KATEX_INLINE_OPEN/);
    if (m) return m[1];
  }

  // Fallback by slug for some known problems
  if (problemRaw.slug === 'two-sum') return language === 'python' ? 'twoSum' : 'twoSum';
  if (problemRaw.slug === 'reverse-string') return language === 'python' ? 'reverse_string' : 'reverseString';
  if (problemRaw.slug === 'valid-parentheses') return language === 'python' ? 'is_valid' : 'isValid';

  return null;
}

// Tests: prefer problem.tests if present; otherwise provide defaults for some slugs
export function getTests(problemRaw) {
  if (!problemRaw) return null;

  if (Array.isArray(problemRaw.tests)) return problemRaw.tests;

  // Default tests for known problems
  if (problemRaw.slug === 'two-sum') {
    return [
      [[2,7,11,15], 9],
      [[3,2,4], 6],
      [[3,3], 6],
    ];
  }
  return null;
}