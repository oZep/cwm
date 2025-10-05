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

/**
 * Return unified problem details with optional language-specific starter code.
 * Tries common shapes: problem.code[lang], problem.codes[lang], problem.snippets[lang],
 * problem.starterCode[lang], problem.starters[lang], or problem[lang].
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
    title: problem.title ?? problem.name ?? problem.slug ?? `Problem ${problem.id}`,
    content: problem.content ?? problem.prompt ?? problem.description ?? '',
    code: null,
  };

  if (language) {
    const lang =
      (problem.code && problem.code[language]) ||
      (problem.codes && problem.codes[language]) ||
      (problem.snippets && problem.snippets[language]) ||
      (problem.starterCode && problem.starterCode[language]) ||
      (problem.starters && problem.starters[language]) ||
      problem[language];

    if (lang) {
      result.code = lang;
    } else {
      result.code = {
        error: `Starter code in '${language}' not available for problem ID: ${result.id}.`,
      };
    }
  }

  return result;
}