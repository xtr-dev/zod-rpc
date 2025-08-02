import { ServiceDefinition } from '../service';
import { generateAllServiceDocs } from './markdown-docs';
import { marked } from 'marked';

export function generateHTMLDocs(services: ServiceDefinition<any>[]): string {
  // First generate markdown documentation
  const markdownContent = generateAllServiceDocs(services);
  
  // Convert markdown to HTML
  const htmlContent = convertMarkdownToHTML(markdownContent);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RPC API Documentation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
            color: #24292e;
        }
        h1 { 
            color: #0366d6; 
            border-bottom: 2px solid #e1e5e9; 
            padding-bottom: 10px;
        }
        h2 { 
            color: #0366d6; 
            border-bottom: 1px solid #e1e5e9; 
            padding-bottom: 8px;
            margin-top: 40px;
        }
        h3 { 
            color: #6f42c1;
            margin-top: 30px;
        }
        pre {
            background: #f8f9fa; 
            border: 1px solid #e9ecef;
            border-radius: 6px; 
            padding: 16px; 
            margin: 16px 0;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 14px;
            overflow-x: auto;
        }
        code {
            background: #f3f4f6;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 14px;
        }
        pre code {
            background: none;
            padding: 0;
        }
        ul, ol { margin: 16px 0; padding-left: 32px; }
        li { margin: 8px 0; }
        p { margin: 16px 0; }
        strong { color: #0366d6; }
        hr {
            border: none;
            height: 1px;
            background: #e1e5e9;
            margin: 32px 0;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
}

function convertMarkdownToHTML(markdown: string): string {
  // Use marked library for proper markdown-to-HTML conversion
  const result = marked.parse(markdown);
  return typeof result === 'string' ? result : '';
}