import type { ParsedDIMACS, Clause, Formula } from './types';

export function parseDIMACS(input: string): ParsedDIMACS {
    const lines = input.split('\n');
    let numVars = 0;
    let expectedClauses = 0;
    const formula: Formula = [];
    let currentClause: Clause = [];

    for (const line of lines) {
        // Remove leading/trailing whitespace
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (trimmed === '' || trimmed.startsWith('c')) {
            continue;
        }

        // Parse the problem definition line: "p cnf <variables> <clauses>"
        if (trimmed.startsWith('p cnf')) {
            // Split by any amount of whitespace
            const parts = trimmed.split(/\s+/); 
            numVars = parseInt(parts[2], 10);
            expectedClauses = parseInt(parts[3], 10);
            continue;
        }

        // Parse literals
        const tokens = trimmed.split(/\s+/);
        for (const token of tokens) {
            const num = parseInt(token, 10);
            if (isNaN(num)) continue;

            if (num === 0) {
                // 0 marks the end of a clause in DIMACS
                formula.push(currentClause);
                currentClause = [];
            } else {
                currentClause.push(num);
            }
        }
    }

    // Safety net: if the file didn't end with a 0 but had a pending clause
    if (currentClause.length > 0) {
        formula.push(currentClause);
    }

    if (formula.length !== expectedClauses) {
        console.warn(`DIMACS warning: Header specified ${expectedClauses} clauses, but found ${formula.length}.`);
    }

    return {
        numVars,
        numClauses: formula.length,
        formula
    };
}