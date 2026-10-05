import type { Formula, Literal } from './types';

export type VariableSelector = (assignment: (boolean | null)[], formula: Formula) => Literal | null;

/**
 * Baseline: První dostupná proměnná (fallback)
 */
export const firstAvailableSelector: VariableSelector = (assignment) => {
    for (let i = 1; i < assignment.length; i++) {
        if (assignment[i] === null) {
            return i;
        }
    }
    return null;
};

/**
 * 1. Náhodný výběr
 */
export const randomSelector: VariableSelector = (assignment) => {
    const unassigned: number[] = [];
    for (let i = 1; i < assignment.length; i++) {
        if (assignment[i] === null) {
            unassigned.push(i);
        }
    }
    
    if (unassigned.length === 0) return null;
    
    const chosenIndex = Math.floor(Math.random() * unassigned.length);
    const chosenVar = unassigned[chosenIndex];
    
    // Náhodně zvolíme i polaritu (true/false)
    return Math.random() > 0.5 ? chosenVar : -chosenVar;
};

/**
 * 2. DLIS (Dynamic Largest Individual Sum)
 * Vybírá literál, který se nejčastěji vyskytuje v dosud nesplněných klauzulích.
 */
export const dlisSelector: VariableSelector = (assignment, formula) => {
    const scores = new Map<number, number>();

    for (const clause of formula) {
        let isSatisfied = false;

        // Kontrola, zda už klauzule není splněná
        for (const literal of clause) {
            const varIndex = Math.abs(literal);
            const val = assignment[varIndex];
            if (val !== null && val === (literal > 0)) {
                isSatisfied = true;
                break;
            }
        }

        if (isSatisfied) continue;

        // Přičtení bodů volným literálům
        for (const literal of clause) {
            const varIndex = Math.abs(literal);
            if (assignment[varIndex] === null) {
                scores.set(literal, (scores.get(literal) || 0) + 1);
            }
        }
    }

    let bestLiteral: Literal | null = null;
    let maxScore = -1;

    for (const [literal, score] of scores.entries()) {
        if (score > maxScore) {
            maxScore = score;
            bestLiteral = literal;
        }
    }

    // Pokud už zbývají jen splněné klauzule, ale stále jsou nepřiřazené proměnné,
    // použijeme fallback.
    return bestLiteral !== null ? bestLiteral : firstAvailableSelector(assignment, formula);
};

/**
 * 3. Jeroslow-Wang (Dynamická verze)
 * Preferuje literály vyskytující se v krátkých nesplněných klauzulích.
 * Skóre literálu roste o 2^(-délka_klauzule).
 */
export const jeroslowWangSelector: VariableSelector = (assignment, formula) => {
    const scores = new Map<number, number>();

    for (const clause of formula) {
        let isSatisfied = false;
        let unassignedCount = 0;

        // Kontrola stavu klauzule a zjištění počtu zbývajících literálů
        for (const literal of clause) {
            const varIndex = Math.abs(literal);
            const val = assignment[varIndex];
            if (val !== null) {
                if (val === (literal > 0)) {
                    isSatisfied = true;
                    break;
                }
            } else {
                unassignedCount++;
            }
        }

        if (isSatisfied) continue;

        // Váha závisí na počtu zbývajících volných literálů v této klauzuli
        const weight = Math.pow(2, -unassignedCount);

        for (const literal of clause) {
            const varIndex = Math.abs(literal);
            if (assignment[varIndex] === null) {
                scores.set(literal, (scores.get(literal) || 0) + weight);
            }
        }
    }

    let bestLiteral: Literal | null = null;
    let maxScore = -1;

    for (const [literal, score] of scores.entries()) {
        if (score > maxScore) {
            maxScore = score;
            bestLiteral = literal;
        }
    }

    return bestLiteral !== null ? bestLiteral : firstAvailableSelector(assignment, formula);
};