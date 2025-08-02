import { ServiceDefinition } from '../service';
import { generateServiceDocs } from './docs';

export function generateMarkdownDocs<T extends Record<string, any>>(
  service: ServiceDefinition<T>
): string {
  const serviceDocs = generateServiceDocs(service);
  let markdown = `# ${serviceDocs.name} Service\n\n`;
  
  // Add service description if available
  if (serviceDocs.description) {
    markdown += `${serviceDocs.description}\n\n`;
  }

  markdown += `## Methods\n\n`;

  for (const [methodName, methodDoc] of Object.entries(serviceDocs.methods)) {
    markdown += `### ${methodName}\n\n`;
    
    // Method description
    if (methodDoc.description) {
      markdown += `${methodDoc.description}\n\n`;
    }

    // Input schema
    markdown += `**Input:**\n\n`;
    markdown += generateSchemaMarkdown(methodDoc.input, 'input');
    markdown += `\n\n`;

    // Output schema  
    markdown += `**Output:**\n\n`;
    markdown += generateSchemaMarkdown(methodDoc.output, 'output');
    markdown += `\n\n`;

    // Example usage
    markdown += `**Example:**\n\n`;
    markdown += `\`\`\`typescript\n`;
    markdown += `const result = await client.${serviceDocs.name}.${methodName}({\n`;
    markdown += generateExampleInput(methodDoc.input, 2);
    markdown += `});\n`;
    markdown += `\`\`\`\n\n`;
    
    markdown += `---\n\n`;
  }

  return markdown;
}

function generateSchemaMarkdown(jsonSchema: any, name: string): string {
  let markdown = `\`\`\`typescript\n`;
  markdown += generateTypeScriptFromJsonSchema(jsonSchema, name, 0);
  markdown += `\`\`\`\n`;
  
  return markdown;
}

function generateTypeScriptFromJsonSchema(jsonSchema: any, name: string, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    let result = `${spaces}interface ${capitalize(name)} {\n`;
    
    const required = jsonSchema.required || [];
    for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
      const prop = propSchema as any;
      const optional = !required.includes(key) ? '?' : '';
      
      if (prop.description) {
        result += `${spaces}  /** ${prop.description} */\n`;
      }
      
      result += `${spaces}  ${key}${optional}: ${getTypeNameFromJsonSchema(prop)};\n`;
    }
    
    result += `${spaces}}\n`;
    return result;
  }
  
  return `${spaces}type ${capitalize(name)} = ${getTypeNameFromJsonSchema(jsonSchema)};\n`;
}

function getTypeNameFromJsonSchema(jsonSchema: any): string {
  if (jsonSchema.type === 'string') return 'string';
  if (jsonSchema.type === 'number' || jsonSchema.type === 'integer') return 'number';
  if (jsonSchema.type === 'boolean') return 'boolean';
  if (jsonSchema.type === 'array') {
    return `${getTypeNameFromJsonSchema(jsonSchema.items)}[]`;
  }
  if (jsonSchema.type === 'object') return 'object';
  if (jsonSchema.anyOf || jsonSchema.oneOf) {
    const options = jsonSchema.anyOf || jsonSchema.oneOf;
    return options.map((opt: any) => getTypeNameFromJsonSchema(opt)).join(' | ');
  }
  
  return 'unknown';
}

function generateExampleInput(jsonSchema: any, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    let result = '';
    const required = jsonSchema.required || [];
    const entries = Object.entries(jsonSchema.properties);
    
    entries.forEach(([key, propSchema], index) => {
      if (required.includes(key)) {
        result += `${spaces}${key}: ${generateExampleValueFromJsonSchema(propSchema as any)}`;
        if (index < entries.length - 1) result += ',';
        result += '\n';
      }
    });
    
    return result;
  }
  
  return `${spaces}${generateExampleValueFromJsonSchema(jsonSchema)}\n`;
}

function generateExampleValueFromJsonSchema(jsonSchema: any): string {
  if (jsonSchema.type === 'string') return '"example"';
  if (jsonSchema.type === 'number' || jsonSchema.type === 'integer') return '42';
  if (jsonSchema.type === 'boolean') return 'true';
  if (jsonSchema.type === 'array') return '[]';
  if (jsonSchema.type === 'object') return '{}';
  
  return '{}';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateAllServiceDocs(services: ServiceDefinition<any>[]): string {
  let allDocs = `# API Documentation\n\n`;
  allDocs += `Auto-generated documentation for RPC services.\n\n`;
  allDocs += `## Services\n\n`;
  
  for (const service of services) {
    allDocs += `- [${service.id}](#${service.id.toLowerCase()}-service)\n`;
  }
  
  allDocs += `\n`;
  
  for (const service of services) {
    allDocs += generateMarkdownDocs(service);
  }
  
  return allDocs;
}