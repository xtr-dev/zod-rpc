import { z } from 'zod';
import { defineContract } from '../../src';

// Shared method contracts that can be used by both client and server
// These define the API interface without implementation details

export const userContracts = {
  getUser: defineContract({
    id: 'user.get',
    input: z.object({ 
      userId: z.string().min(1) 
    }),
    output: z.object({ 
      id: z.string(),
      name: z.string(), 
      email: z.string().email(),
      age: z.number().min(0).max(120)
    })
  }),

  createUser: defineContract({
    id: 'user.create',
    input: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0).max(120)
    }),
    output: z.object({
      id: z.string(),
      success: z.boolean()
    })
  }),

  listUsers: defineContract({
    id: 'user.list',
    input: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10)
    }),
    output: z.object({
      users: z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      })),
      total: z.number(),
      hasMore: z.boolean()
    })
  })
};

export const mathContracts = {
  add: defineContract({
    id: 'math.add',
    input: z.object({
      a: z.number(),
      b: z.number()
    }),
    output: z.object({
      result: z.number()
    })
  }),

  calculate: defineContract({
    id: 'math.calculate',
    input: z.object({
      expression: z.string(),
      precision: z.number().min(0).max(10).default(2)
    }),
    output: z.object({
      result: z.number(),
      expression: z.string()
    })
  })
};