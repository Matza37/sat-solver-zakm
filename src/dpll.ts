import type { ParsedDIMACS, SolverMetrics, Formula, Literal } from './types';
import type { VariableSelector } from './heuristics';

export class DPLLSolver {
    private formula: Formula;
    private assignment: (boolean | null)[];
    private metrics: SolverMetrics;
    private selectVariable: VariableSelector;

    constructor(parsed: ParsedDIMACS, selector: VariableSelector) {
        this.formula = parsed.formula;
        // Index 0 is unused. Variables are 1-indexed.
        this.assignment = new Array(parsed.numVars + 1).fill(null);
        this.selectVariable = selector;
        this.metrics = {
            decisions: 0,
            propagations: 0,
            backtracks: 0,
            timeMs: 0
        };
    }

    public solve(): { satisfiable: boolean; assignment: (boolean | null)[]; metrics: SolverMetrics } {
        const startTime = performance.now();
        const satisfiable = this.dpll();
        this.metrics.timeMs = performance.now() - startTime;
        
        return {
            satisfiable,
            assignment: this.assignment,
            metrics: this.metrics
        };
    }

    private dpll(): boolean {
        // Keep track of assignments made in THIS specific recursive call 
        // so we can undo them if we need to backtrack.
        const assignedInThisCall: number[] = [];

        // 1. Unit Propagation phase
        const noConflict = this.unitPropagate(assignedInThisCall);
        if (!noConflict) {
            // Conflict found! Undo propagations and return false to trigger backtracking
            this.undoAssignments(assignedInThisCall);
            return false;
        }

        // 2. Decision phase
        const decisionLiteral = this.selectVariable(this.assignment, this.formula);
        
        if (decisionLiteral === null) {
            // No variables left to assign, and no conflicts found -> SAT!
            return true; 
        }

        this.metrics.decisions++;
        const varIndex = Math.abs(decisionLiteral);
        const varValue = decisionLiteral > 0;

        // Try Branch A (Heuristic's suggestion)
        this.assignment[varIndex] = varValue;
        assignedInThisCall.push(varIndex);

        if (this.dpll()) {
            return true; // Found a solution down this branch
        }

        // Branch A failed. We must backtrack!
        this.metrics.backtracks++;
        this.undoAssignments(assignedInThisCall);
        
        // Prepare tracking for Branch B
        const assignedInBranchB: number[] = [];
        
        // Try Branch B (The opposite boolean value)
        this.assignment[varIndex] = !varValue;
        assignedInBranchB.push(varIndex);

        if (this.dpll()) {
            return true;
        }

        // Both branches failed. Undo Branch B and return false to parent
        this.undoAssignments(assignedInBranchB);
        return false;
    }

    private unitPropagate(localAssignments: number[]): boolean {
        let changed = true;
        
        // Loop until a full pass finds no new unit clauses
        while (changed) {
            changed = false;
            
            for (const clause of this.formula) {
                let unassignedLiteral: Literal | null = null;
                let isClauseSatisfied = false;
                let falseCount = 0;

                for (const literal of clause) {
                    const varIndex = Math.abs(literal);
                    const val = this.assignment[varIndex];
                    const isPositive = literal > 0;

                    if (val === null) {
                        unassignedLiteral = literal;
                    } else if (val === isPositive) {
                        isClauseSatisfied = true;
                        break; 
                    } else {
                        falseCount++;
                    }
                }

                if (isClauseSatisfied) continue;

                // If all literals are false, we have an empty clause (Conflict)
                if (falseCount === clause.length) {
                    return false; 
                }

                // If all but one are false, it's a Unit Clause
                if (falseCount === clause.length - 1 && unassignedLiteral !== null) {
                    this.metrics.propagations++;
                    const varIndex = Math.abs(unassignedLiteral);
                    this.assignment[varIndex] = unassignedLiteral > 0;
                    localAssignments.push(varIndex);
                    changed = true; // We changed the state, must re-check all clauses
                }
            }
        }
        return true; // Propagated successfully without conflicts
    }

    private undoAssignments(varsToUndo: number[]): void {
        for (const varIndex of varsToUndo) {
            this.assignment[varIndex] = null;
        }
    }
}