// A Literal is a non-zero integer. Positive means true, negative means false.
export type Literal = number;

// A Clause is a disjunction (OR) of literals.
export type Clause = Literal[];

// A Formula is a conjunction (AND) of clauses (Conjunctive Normal Form).
export type Formula = Clause[];

// Structure to hold the parsed DIMACS data
export interface ParsedDIMACS {
    numVars: number;
    numClauses: number;
    formula: Formula;
}

// Metrics we need to track for your assignment evaluation
export interface SolverMetrics {
    decisions: number;
    propagations: number;
    backtracks: number;
    timeMs: number;
}