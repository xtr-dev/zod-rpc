#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { execSync } = require('child_process');

program
  .name('zod-rpc-docs')
  .description('Generate documentation for Zod RPC services')
  .version('1.0.0')
  .requiredOption('-s, --source <path>', 'Source file containing service definitions')
  .option('-d, --dest <path>', 'Destination directory for generated docs', './docs')
  .option('-f, --format <type>', 'Documentation format: markdown, html, or all', 'all')
  .parse();

const options = program.opts();

async function generateDocs() {
  try {
    const sourceFile = path.resolve(options.source);
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Source file not found: ${sourceFile}`);
      process.exit(1);
    }

    console.log(`📖 Generating documentation from: ${sourceFile}`);
    console.log(`📁 Output directory: ${path.resolve(options.dest)}`);

    // Ensure destination directory exists
    if (!fs.existsSync(options.dest)) {
      fs.mkdirSync(options.dest, { recursive: true });
    }

    // Create a runner script that uses tsx to load both .ts and .js files
    const runnerScript = `
import path from 'path';
import fs from 'fs';

async function run() {
  try {
    // Load the source file (works with both .js and .ts)
    const sourceModule = await import('${sourceFile}');
    
    // Load our doc generators
    const { generateAllServiceDocs } = await import('${path.resolve(__dirname, '../dist/src/docs/markdown-docs.js')}');
    const { generateHTMLDocs } = await import('${path.resolve(__dirname, '../dist/src/docs/html-docs.js')}');
    
    // Extract services
    const services = [];
    for (const [key, value] of Object.entries(sourceModule)) {
      if (value && typeof value === 'object' && value.id && value.methods) {
        services.push(value);
        console.log(\`📦 Found service: \${value.id}\`);
      }
    }
    
    if (services.length === 0) {
      console.error('❌ No service definitions found in source file');
      process.exit(1);
    }
    
    // Generate docs
    if ('${options.format}' === 'all' || '${options.format}' === 'markdown') {
      console.log('📝 Generating Markdown documentation...');
      const markdownDocs = generateAllServiceDocs(services);
      fs.writeFileSync('${path.join(options.dest, 'api.md')}', markdownDocs);
      console.log('✅ Generated: api.md');
    }
    
    if ('${options.format}' === 'all' || '${options.format}' === 'html') {
      console.log('🌐 Generating HTML documentation...');
      const htmlDocs = generateHTMLDocs(services);
      fs.writeFileSync('${path.join(options.dest, 'api.html')}', htmlDocs);
      console.log('✅ Generated: api.html');
    }
    
    console.log('🎉 Documentation generation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
`;

    // Write and execute runner script with tsx
    const runnerPath = path.join(__dirname, 'docs-runner.mjs');
    fs.writeFileSync(runnerPath, runnerScript);

    try {
      execSync(`npx tsx "${runnerPath}"`, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
    } finally {
      // Clean up
      if (fs.existsSync(runnerPath)) {
        fs.unlinkSync(runnerPath);
      }
    }

  } catch (error) {
    console.error('❌ Error generating documentation:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('💡 Make sure to build the project first: npm run build');
    }
    process.exit(1);
  }
}

generateDocs();