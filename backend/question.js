const fs = require('fs');
const path = require('path');

const problemsFilePath = path.join(__dirname, 'leetcode-train.jsonl');
let allProblems = [];

try {
    const data = fs.readFileSync(problemsFilePath, 'utf8');
    // .jsonl files are newline-delimited JSON
    allProblems = data
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    console.log(`Loaded ${allProblems.length} problems from file.`);
} catch (err) {
    console.error('Failed to load problems:', err);
    process.exit(1); 
}

function getProblemDetails(id = null, language = null) {
    // randomly select a problem or by id
    if (id) {
        const problem = allProblems.find(p => p.id === id);
        if (!problem) {
            return null;
        }
    } else {
        const randomIndex = Math.floor(Math.random() * allProblems.length);
        id = allProblems[randomIndex].id;
    }
    const result = {
        id: problem.id,
        title: problem.title,
        content: problem.content,
        code: null,
    };

    if (language && problem[language]) {
        result.code = problem.language
    } else if (language) {
        result.code = {
             error: `Starter code in '${language}' not available for problem ID: ${problem.id}.`
        };
    }

    return result;
}

export { getProblemDetails };