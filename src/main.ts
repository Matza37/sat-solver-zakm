// src/main.ts
import './style.css';
import { parseDIMACS } from './parser';
import { DPLLSolver } from './dpll';
import { randomSelector, dlisSelector, jeroslowWangSelector } from './heuristics';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// --- HTML ELEMENTY PRO JEDNOTLIVÉ ŘEŠENÍ ---
const inputArea = document.getElementById('dimacs-input') as HTMLTextAreaElement;
const heuristicSelect = document.getElementById('heuristic-select') as HTMLSelectElement;
const solveBtn = document.getElementById('solve-btn') as HTMLButtonElement;
const outputSection = document.getElementById('output-section') as HTMLDivElement;
const statusSpan = document.getElementById('status') as HTMLSpanElement;
const assignmentOutput = document.getElementById('assignment-output') as HTMLDivElement;

const metricTime = document.getElementById('metric-time') as HTMLSpanElement;
const metricDec = document.getElementById('metric-decisions') as HTMLSpanElement;
const metricProp = document.getElementById('metric-propagations') as HTMLSpanElement;
const metricBack = document.getElementById('metric-backtracks') as HTMLSpanElement;

// --- JEDNODUCHÉ ŘEŠENÍ JEDNÉ FORMULE ---
solveBtn.addEventListener('click', () => {
    const dimacsText = inputArea.value;
    const parsedData = parseDIMACS(dimacsText);
    
    if (parsedData.formula.length === 0) {
        alert("Nepodařilo se načíst žádné klauzule. Zkontrolujte formát DIMACS.");
        return;
    }

    let selector = randomSelector;
    if (heuristicSelect.value === 'dlis') {
        selector = dlisSelector;
    } else if (heuristicSelect.value === 'jw') {
        selector = jeroslowWangSelector;
    }

    // Dynamický mikro-benchmarking pro maximální přesnost času
    const minBenchTimeMs = 50; 
    let iterations = 0;
    
    const firstSolver = new DPLLSolver(parsedData, selector);
    let finalResult = firstSolver.solve(); 
    
    const t0 = performance.now();
    let elapsed = 0;
    
    do {
        const solver = new DPLLSolver(parsedData, selector);
        finalResult = solver.solve();
        iterations++;
        elapsed = performance.now() - t0;
    } while (elapsed < minBenchTimeMs);
    
    finalResult.metrics.timeMs = elapsed / iterations;
    const result = finalResult;

    // Vykreslení výsledků
    outputSection.classList.remove('hidden');
    
    if (result.satisfiable) {
        statusSpan.textContent = "SAT (Splnitelné)";
        statusSpan.className = "sat";
        
        const trueVars = [];
        const falseVars = [];
        for (let i = 1; i < result.assignment.length; i++) {
            if (result.assignment[i] === true) trueVars.push(i);
            if (result.assignment[i] === false) falseVars.push(i);
        }
        
        assignmentOutput.innerHTML = `
            <p><strong>Pravdivé (True):</strong> ${trueVars.join(', ') || 'Žádné'}</p>
            <p><strong>Nepravdivé (False):</strong> ${falseVars.join(', ') || 'Žádné'}</p>
        `;
    } else {
        statusSpan.textContent = "UNSAT (Nesplnitelné)";
        statusSpan.className = "unsat";
        assignmentOutput.innerHTML = "<p>Formule nemá řešení.</p>";
    }

    metricTime.textContent = `${result.metrics.timeMs.toFixed(4)} ms`;
    metricDec.textContent = result.metrics.decisions.toString();
    metricProp.textContent = result.metrics.propagations.toString();
    metricBack.textContent = result.metrics.backtracks.toString();
});


// --- LOGIKA PRO IN-BROWSER BENCHMARK & GRAFY ---
const benchVarsInput = document.getElementById('bench-vars') as HTMLInputElement;
const benchSamplesInput = document.getElementById('bench-samples') as HTMLInputElement;
const benchBtn = document.getElementById('run-bench-btn') as HTMLButtonElement;
const benchStatus = document.getElementById('bench-status') as HTMLParagraphElement;
const downloadCsv = document.getElementById('download-csv') as HTMLAnchorElement;
const csvUpload = document.getElementById('csv-upload') as HTMLInputElement;
const chartsSection = document.getElementById('charts-section') as HTMLDivElement;

let timeChartInstance: Chart | null = null;
let backtrackChartInstance: Chart | null = null;
let decisionChartInstance: Chart | null = null;
let propagationChartInstance: Chart | null = null;

// Generátor 3-SAT v paměti
function generate3SAT(numVars: number, numClauses: number): string {
    let dimacs = `c Random 3-SAT (V=${numVars}, C=${numClauses})\n`;
    dimacs += `p cnf ${numVars} ${numClauses}\n`;
    for (let c = 0; c < numClauses; c++) {
        const clauseVars = new Set<number>();
        while (clauseVars.size < 3) {
            const v = Math.floor(Math.random() * numVars) + 1;
            clauseVars.add(v);
        }
        const clause = Array.from(clauseVars).map(v => Math.random() > 0.5 ? v : -v);
        dimacs += `${clause.join(' ')} 0\n`;
    }
    return dimacs;
}

benchBtn.addEventListener('click', () => {
    benchStatus.classList.remove('hidden');
    benchStatus.textContent = 'Generuji a počítám, čekejte prosím...';
    benchBtn.disabled = true;
    
    setTimeout(() => {
        runBrowserBenchmark();
    }, 200);
});

function runBrowserBenchmark() {
    const V = parseInt(benchVarsInput.value, 10) || 20;
    const samples = parseInt(benchSamplesInput.value, 10) || 5;
    const ratios = [3.0, 3.5, 4.0, 4.26, 4.5, 5.0, 6.0];
    
    const heuristics = [
        { name: 'Random', selector: randomSelector },
        { name: 'DLIS', selector: dlisSelector },
        { name: 'Jeroslow-Wang', selector: jeroslowWangSelector }
    ];

    let csvContent = "Filename,Ratio,Heuristic,Satisfiable,TimeMs,Decisions,Propagations,Backtracks\n";

    for (const ratio of ratios) {
        const C = Math.round(V * ratio);
        for (let i = 1; i <= samples; i++) {
            const dimacsData = generate3SAT(V, C);
            const filename = `3sat_V${V}_C${C}_ratio${ratio}_${i}.cnf`;
            const parsed = parseDIMACS(dimacsData);
            
            for (const { name, selector } of heuristics) {
                const solver = new DPLLSolver(parsed, selector);
                const result = solver.solve();
                csvContent += `${filename},${ratio},${name},${result.satisfiable},${result.metrics.timeMs.toFixed(4)},${result.metrics.decisions},${result.metrics.propagations},${result.metrics.backtracks}\n`;
            }
        }
    }

    processCSVAndDrawCharts(csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    downloadCsv.href = url;
    downloadCsv.classList.remove('hidden');
    
    benchStatus.textContent = 'Benchmark úspěšně dokončen! Všechny 4 grafy byly vykresleny.';
    benchStatus.style.color = '#28a745';
    benchBtn.disabled = false;
}

// Zpracování nahraného CSV souboru
csvUpload.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        processCSVAndDrawCharts(text);
    };
    reader.readAsText(file);
});

// Hlavní funkce pro zpracování dat a vykreslení 2x2 gridu grafů
function processCSVAndDrawCharts(csvText: string) {
    const lines = csvText.trim().split('\n');
    const dataLines = lines.slice(1);

    const grouped: Record<string, Record<string, { times: number[], backtracks: number[], decisions: number[], propagations: number[] }>> = {};

    for (const line of dataLines) {
        if (!line.trim()) continue;
        
        const parts = line.split(',');
        const ratio = parts[1];
        const heuristic = parts[2];
        const time = parseFloat(parts[4]);
        const decisions = parseInt(parts[5], 10);
        const propagations = parseInt(parts[6], 10);
        const backtracks = parseInt(parts[7], 10);

        if (!grouped[ratio]) grouped[ratio] = {};
        if (!grouped[ratio][heuristic]) grouped[ratio][heuristic] = { times: [], backtracks: [], decisions: [], propagations: [] };

        grouped[ratio][heuristic].times.push(time);
        grouped[ratio][heuristic].decisions.push(decisions);
        grouped[ratio][heuristic].propagations.push(propagations);
        grouped[ratio][heuristic].backtracks.push(backtracks);
    }

    const ratios = Object.keys(grouped).sort((a, b) => parseFloat(a) - parseFloat(b));
    const heuristics = Array.from(new Set(dataLines.filter(l => l.trim()).map(l => l.split(',')[2])));
    const colors = ['#ff6384', '#36a2eb', '#4bc0c0']; 

    const getAvg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const datasets = (metricKey: 'times' | 'decisions' | 'propagations' | 'backtracks') => 
        heuristics.map((h, i) => ({
            label: h,
            data: ratios.map(r => getAvg(grouped[r][h]?.[metricKey] || [])),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length],
            tension: 0.3
        }));

    chartsSection.classList.remove('hidden');

    if (timeChartInstance) timeChartInstance.destroy();
    if (backtrackChartInstance) backtrackChartInstance.destroy();
    if (decisionChartInstance) decisionChartInstance.destroy();
    if (propagationChartInstance) propagationChartInstance.destroy();

    // 1. Čas
    timeChartInstance = new Chart(document.getElementById('timeChart') as HTMLCanvasElement, {
        type: 'line',
        data: { labels: ratios, datasets: datasets('times') },
        options: { responsive: true, scales: { x: { title: { display: true, text: 'Poměr C/V' } }, y: { title: { display: true, text: 'Čas (ms)' } } } }
    });

    // 2. Rozhodnutí
    decisionChartInstance = new Chart(document.getElementById('decisionChart') as HTMLCanvasElement, {
        type: 'line',
        data: { labels: ratios, datasets: datasets('decisions') },
        options: { responsive: true, scales: { x: { title: { display: true, text: 'Poměr C/V' } }, y: { title: { display: true, text: 'Počet rozhodnutí' } } } }
    });

    // 3. Propagace
    propagationChartInstance = new Chart(document.getElementById('propagationChart') as HTMLCanvasElement, {
        type: 'line',
        data: { labels: ratios, datasets: datasets('propagations') },
        options: { responsive: true, scales: { x: { title: { display: true, text: 'Poměr C/V' } }, y: { title: { display: true, text: 'Počet propagací' } } } }
    });

    // 4. Backtracks
    backtrackChartInstance = new Chart(document.getElementById('backtrackChart') as HTMLCanvasElement, {
        type: 'line',
        data: { labels: ratios, datasets: datasets('backtracks') },
        options: { responsive: true, scales: { x: { title: { display: true, text: 'Poměr C/V' } }, y: { title: { display: true, text: 'Počet návratů (Backtracks)' } } } }
    });
}