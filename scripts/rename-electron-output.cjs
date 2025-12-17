/**
 * Post-build script to rename .js files to .cjs in dist-electron directory
 * and update require/import statements to use .cjs extension.
 * 
 * This is necessary because package.json has "type": "module" which treats
 * .js files as ES modules, but our Electron backend uses CommonJS.
 */

const fs = require('fs');
const path = require('path');

const distElectronDir = path.join(__dirname, '../dist-electron');

function updateRequireStatements(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Update require statements to use .cjs extension
    // Matches: require("./path") or require('./path')
    content = content.replace(/require\(["'](\.[^"']+)["']\)/g, (match, importPath) => {
        // Don't add extension if it already has one or if it's a node module
        if (!importPath.startsWith('.')) return match;
        if (importPath.endsWith('.cjs') || importPath.endsWith('.js')) return match;
        return `require("${importPath}.cjs")`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
}

function renameJsToCjs(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            renameJsToCjs(filePath);
        } else if (file.endsWith('.js')) {
            // First update require statements while still .js
            updateRequireStatements(filePath);

            // Then rename to .cjs
            const newPath = filePath.replace(/\.js$/, '.cjs');
            fs.renameSync(filePath, newPath);
            console.log(`Renamed: ${file} -> ${file.replace(/\.js$/, '.cjs')}`);
        }
    });
}

console.log('Renaming .js files to .cjs and updating require statements...');
renameJsToCjs(distElectronDir);
console.log('Rename and update complete.');
