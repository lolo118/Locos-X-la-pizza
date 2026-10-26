#!/usr/bin/env node
// Lista las funciones declaradas en index.html (nombre y cantidad de definiciones).
//
//   node scripts/list-functions.mjs                  -> lista del index.html actual
//   node scripts/list-functions.mjs otro.html        -> lista de otro archivo
//   node scripts/list-functions.mjs --diff main      -> compara contra index.html en un commit/rama de git
//
// Sirve para verificar que un refactor no perdió ni agregó funciones por error.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function contarFunciones(src) {
    const counts = new Map();
    for (const m of src.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
        counts.set(m[1], (counts.get(m[1]) || 0) + 1);
    }
    return counts;
}

function imprimir(counts) {
    for (const name of [...counts.keys()].sort()) {
        const n = counts.get(name);
        console.log(n > 1 ? `${name}  (x${n})` : name);
    }
    console.log(`\n${counts.size} funciones distintas, ${[...counts.values()].reduce((a, b) => a + b, 0)} definiciones`);
}

const args = process.argv.slice(2);
const diffIdx = args.indexOf('--diff');

if (diffIdx === -1) {
    imprimir(contarFunciones(readFileSync(args[0] || 'index.html', 'utf8')));
} else {
    const ref = args[diffIdx + 1] || 'HEAD';
    const file = args.find((a, i) => i !== diffIdx && i !== diffIdx + 1) || 'index.html';
    const antes = contarFunciones(execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 64 << 20 }));
    const ahora = contarFunciones(readFileSync(file, 'utf8'));
    let cambios = 0;
    for (const name of [...new Set([...antes.keys(), ...ahora.keys()])].sort()) {
        const a = antes.get(name) || 0, b = ahora.get(name) || 0;
        if (a === b) continue;
        cambios++;
        const tag = a === 0 ? '+ nueva     ' : b === 0 ? '- eliminada ' : '~ copias    ';
        console.log(`${tag} ${name}  ${a} -> ${b}`);
    }
    console.log(cambios ? `\n${cambios} cambio(s) respecto de ${ref}` : `Sin cambios respecto de ${ref}`);
}
