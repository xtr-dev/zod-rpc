import { z } from 'zod';
import { ServiceDefinition } from '../service';

export interface ServiceDocumentation {
  name: string;
  description?: string;
  methods: {
    [methodName: string]: {
      description?: string;
      input: any; // JSON Schema
      output: any; // JSON Schema
    };
  };
}

export function generateServiceDocs<T extends Record<string, any>>(
  service: ServiceDefinition<T>
): ServiceDocumentation {
  const docs: ServiceDocumentation = {
    name: service.id,
    description: (service as any)._def?.description,
    methods: {}
  };

  for (const [methodName, methodDef] of Object.entries(service.methods)) {
    docs.methods[methodName] = {
      description: (methodDef as any).description,
      input: convertZodToJsonSchema(methodDef.input),
      output: convertZodToJsonSchema(methodDef.output)
    };
  }

  return docs;
}

function convertZodToJsonSchema(schema: z.ZodSchema): any {
  // Use Zod v4's native JSON Schema generation
  return z.toJSONSchema(schema);
}

