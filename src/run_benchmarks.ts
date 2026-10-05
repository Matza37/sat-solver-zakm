import fs from 'fs';
import path from 'path';
// Importujeme ze stejné složky (bez src/)
import { parseDIMACS } from './parser.ts';
import { DPLLSolver } from './dpll.ts';
import { randomSelector, dlisSelector, jeroslowWangSelector } from './heuristics.ts';

// Cesty (process.cwd() ukazuje do hlavní složky projektu)
const BENCH_DIR = path.join(process.cwd(), 'src', 'benchmarks');
const OUT_CSV = path.join(process.cwd(), 'results.csv');

// Definice testovaných heuristik
const heuristics = [
    { name: 'Random', selector: randomSelector },
    { name: 'DLIS', selector: dlisSelector },
    { name: 'Jeroslow-Wang', selector: jeroslowWangSelector }
];

function run() {
    if (!fs.existsSync(BENCH_DIR)) {
        console.error(`Složka neexistuje na cestě: ${BENCH_DIR}`);
        return;
    }

    const files = fs.readdirSync(BENCH_DIR).filter(f => f.endsWith('.cnf'));
    if (files.length === 0) {
        console.error("Nebyly nalezeny žádné .cnf soubory.");
        return;
    }

    let csvContent = "Filename,Ratio,Heuristic,Satisfiable,TimeMs,Decisions,Propagations,Backtracks\n";
    console.log(`Nalezeno ${files.length} souborů. Spouštím benchmarky...`);

    for (const file of files) {
        const filePath = path.join(BENCH_DIR, file);
        const dimacsData = fs.readFileSync(filePath, 'utf-8');
        
        const ratioMatch = file.match(/ratio([0-9.]+)/);
        const ratio = ratioMatch ? ratioMatch[1] : "unknown";
        const parsed = parseDIMACS(dimacsData);

        for (const { name, selector } of heuristics) {
            const solver = new DPLLSolver(parsed, selector);
            const result = solver.solve();
            csvContent += `${file},${ratio},${name},${result.satisfiable},${result.metrics.timeMs.toFixed(2)},${result.metrics.decisions},${result.metrics.propagations},${result.metrics.backtracks}\n`;
        }
    }

    fs.writeFileSync(OUT_CSV, csvContent);
    console.log(`Hotovo! Výsledky byly uloženy do: ${OUT_CSV}`);
}

run();