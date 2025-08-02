import { z } from 'zod';
import { defineService } from '@xtr-dev/zod-rpc';

export const userService = defineService('user', {
  get: {
    input: z.object({
      userId: z.string().min(1).describe('Unique identifier for the user to retrieve'),
    }),
    output: z.object({
      id: z.string().describe('Unique user identifier'),
      name: z.string().describe('Full name of the user'),
      email: z.string().email().describe('Email address of the user'),
      age: z.number().min(0).max(120).describe('Age of the user in years'),
    }),
  },

  create: {
    input: z.object({
      name: z.string().min(1).describe('Full name of the new user'),
      email: z.string().email().describe('Email address for the new user'),
      age: z.number().min(0).max(120).describe('Age of the user in years'),
    }),
    output: z.object({
      id: z.string().describe('Unique identifier assigned to the new user'),
      success: z.boolean().describe('Whether the user was created successfully'),
    }),
  },

  list: {
    input: z.object({
      page: z.number().min(1).default(1).describe('Page number for pagination (starts at 1)'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(10)
        .describe('Maximum number of users to return per page'),
    }),
    output: z.object({
      users: z
        .array(
          z.object({
            id: z.string().describe('Unique user identifier'),
            name: z.string().describe('Full name of the user'),
            email: z.string().describe('Email address of the user'),
          }),
        )
        .describe('Array of user objects'),
      total: z.number().describe('Total number of users in the system'),
      hasMore: z.boolean().describe('Whether there are more users available on subsequent pages'),
    }),
  },
});

export const mathService = defineService('math', {
  add: {
    input: z.object({
      a: z.number().describe('First number to add'),
      b: z.number().describe('Second number to add'),
    }),
    output: z.object({
      result: z.number().describe('Sum of the two input numbers'),
    }),
  },

  calculate: {
    input: z.object({
      expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 3 * 4")'),
      precision: z
        .number()
        .min(0)
        .max(10)
        .default(2)
        .describe('Number of decimal places to round the result to'),
    }),
    output: z.object({
      result: z.number().describe('Calculated result of the mathematical expression'),
      expression: z.string().describe('Original expression that was evaluated'),
    }),
  },
});
