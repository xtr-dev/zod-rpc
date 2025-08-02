#!/usr/bin/env node

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEsmDir = join(__dirname, 'dist-esm');

async function isDirectory(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fixImports(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await fixImports(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const content = await readFile(fullPath, 'utf8');
      
      // Fix relative imports to include .js extension or /index.js for directories
      let fixedContent = content;
      
      // Handle single quotes - relative imports
      fixedContent = await fixImportPaths(fixedContent, /'\.\/([^']+)'/g, dir);
      fixedContent = await fixImportPaths(fixedContent, /'\.\.\/([^']+)'/g, dirname(dir));
      // Handle double quotes - relative imports
      fixedContent = await fixImportPaths(fixedContent, /"\.\/([^"]+)"/g, dir);
      fixedContent = await fixImportPaths(fixedContent, /"\.\.\/([^"]+)"/g, dirname(dir));
      
      if (fixedContent !== content) {
        await writeFile(fullPath, fixedContent, 'utf8');
        console.log(`Fixed imports in ${fullPath}`);
      }
    }
  }
}

async function fixImportPaths(content, regex, currentDir) {
  let result = content;
  const matches = [...content.matchAll(regex)];
  
  for (const match of matches) {
    const [fullMatch, path] = match;
    
    if (path.endsWith('.js')) continue; // Already has extension
    
    const absolutePath = join(currentDir, path);
    const isDir = await isDirectory(absolutePath);
    
    let newPath;
    if (isDir) {
      newPath = fullMatch.replace(path, `${path}/index.js`);
    } else {
      newPath = fullMatch.replace(path, `${path}.js`);
    }
    
    result = result.replace(fullMatch, newPath);
  }
  
  return result;
}

fixImports(distEsmDir).catch(console.error);