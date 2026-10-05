// generator.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'benchmarks');

// Vytvoříme složku pro benchmarky, pokud neexistuje
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR);
}

/**
 * Vygeneruje náhodnou 3-SAT formuli
 * @param {number} numVars Počet proměnných
 * @param {number} numClauses Počet klauzulí
 */
function generate3SAT(numVars, numClauses) {
    let dimacs = `c Random 3-SAT (V=${numVars}, C=${numClauses})\n`;
    dimacs += `p cnf ${numVars} ${numClauses}\n`;

    for (let c = 0; c < numClauses; c++) {
        const clauseVars = new Set();
        
        // Chceme přesně 3 unikátní proměnné v klauzuli
        while (clauseVars.size < 3) {
            const v = Math.floor(Math.random() * numVars) + 1;
            clauseVars.add(v);
        }

        const clause = Array.from(clauseVars).map(v => {
            // Náhodně určíme, zda bude literál pozitivní nebo negativní
            const isPositive = Math.random() > 0.5;
            return isPositive ? v : -v;
        });

        dimacs += `${clause.join(' ')} 0\n`;
    }

    return dimacs;
}

// BATCH GENEROVÁNÍ PRO EXPERIMENTY
// Nastavíme pevný počet proměnných, např. V=50. 
// Fázový přechod pro V=50 je kolem C = 50 * 4.26 = 213 klauzulí.
const V = 50;
const ratios = [3.0, 3.5, 4.0, 4.26, 4.5, 5.0, 6.0];
const SAMPLES_PER_RATIO = 10; // Pro každý poměr vygenerujeme 10 instancí

console.log('Začínám generovat DIMACS soubory...');

ratios.forEach(ratio => {
    const C = Math.round(V * ratio);
    
    for (let i = 1; i <= SAMPLES_PER_RATIO; i++) {
        const dimacsData = generate3SAT(V, C);
        const filename = `3sat_V${V}_C${C}_ratio${ratio}_${i}.cnf`;
        fs.writeFileSync(path.join(OUT_DIR, filename), dimacsData);
    }
    console.log(`Vygenerováno ${SAMPLES_PER_RATIO} instancí pro poměr ${ratio} (V=${V}, C=${C})`);
});

console.log(`\nHotovo! Všechny soubory jsou ve složce ${OUT_DIR}`);