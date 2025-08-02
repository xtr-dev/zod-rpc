#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { execSync } = require('child_process');

program
  .name('zod-rpc-export-schemas')
  .description('Export Zod RPC schemas as individual JSON Schema files')
  .version('1.0.0')
  .requiredOption('-s, --source <path>', 'Source file containing service definitions')
  .option('-d, --dest <path>', 'Destination directory for exported schemas', './schemas')
  .option('--flat', 'Export all schemas to flat directory instead of service subdirectories')
  .option('--prefix <prefix>', 'Prefix for schema filenames')
  .parse();

const options = program.opts();

async function exportSchemas() {
  try {
    const sourceFile = path.resolve(options.source);
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Source file not found: ${sourceFile}`);
      process.exit(1);
    }

    console.log(`📤 Exporting schemas from: ${sourceFile}`);
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
    
    // Load Zod
    const { z } = await import('zod');
    
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
    
    let totalExported = 0;
    
    // Export schemas for each service
    for (const service of services) {
      console.log(\`\\n🔄 Processing service: \${service.id}\`);
      
      // Create service directory if not flat export
      const serviceDir = ${options.flat} 
        ? '${options.dest}' 
        : path.join('${options.dest}', service.id);
      
      if (!${options.flat} && !fs.existsSync(serviceDir)) {
        fs.mkdirSync(serviceDir, { recursive: true });
      }
      
      // Export each method's input and output schemas
      for (const [methodName, methodDef] of Object.entries(service.methods)) {
        // Export input schema
        const inputSchema = z.toJSONSchema(methodDef.input);
        const inputFilename = ${options.flat} 
          ? \`${options.prefix || ''}\${service.id}.\${methodName}.input.json\`
          : \`\${methodName}.input.json\`;
        const inputPath = path.join(serviceDir, inputFilename);
        
        fs.writeFileSync(inputPath, JSON.stringify(inputSchema, null, 2));
        console.log(\`  ✅ \${service.id}.\${methodName}.input → \${path.relative('${options.dest}', inputPath)}\`);
        totalExported++;
        
        // Export output schema
        const outputSchema = z.toJSONSchema(methodDef.output);
        const outputFilename = ${options.flat} 
          ? \`${options.prefix || ''}\${service.id}.\${methodName}.output.json\`
          : \`\${methodName}.output.json\`;
        const outputPath = path.join(serviceDir, outputFilename);
        
        fs.writeFileSync(outputPath, JSON.stringify(outputSchema, null, 2));
        console.log(\`  ✅ \${service.id}.\${methodName}.output → \${path.relative('${options.dest}', outputPath)}\`);
        totalExported++;
      }
    }
    
    // Export service index file
    const indexData = {
      generator: 'zod-rpc-export-schemas',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      services: services.map(service => ({
        id: service.id,
        methods: Object.keys(service.methods),
        schemas: Object.keys(service.methods).flatMap(methodName => [
          \`\${service.id}.\${methodName}.input\`,
          \`\${service.id}.\${methodName}.output\`
        ])
      })),
      totalSchemas: totalExported,
      structure: ${options.flat} ? 'flat' : 'hierarchical'
    };
    
    fs.writeFileSync(
      path.join('${options.dest}', 'index.json'),
      JSON.stringify(indexData, null, 2)
    );
    
    console.log(\`\\n🎉 Schema export complete!\`);
    console.log(\`📊 Exported \${totalExported} schemas from \${services.length} services\`);
    console.log(\`📄 Created index file: index.json\`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
`;

    // Write and execute runner script with tsx
    const runnerPath = path.join(__dirname, 'schema-runner.mjs');
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
    console.error('❌ Error exporting schemas:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('💡 Make sure to build the project first: npm run build');
    }
    process.exit(1);
  }
}

exportSchemas();