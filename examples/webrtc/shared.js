import { z } from 'zod';
import { defineService } from '@xtr-dev/zod-rpc';

export const chatService = defineService('chat', {
  sendMessage: {
    input: z.object({
      message: z.string().min(1).describe('Message content to send'),
      timestamp: z.number().describe('Unix timestamp when message was sent')
    }),
    output: z.object({
      success: z.boolean().describe('Whether the message was sent successfully'),
      messageId: z.string().describe('Unique identifier for the sent message')
    })
  },

  ping: {
    input: z.object({
      timestamp: z.number().describe('Unix timestamp of the ping')
    }),
    output: z.object({
      pong: z.number().describe('Unix timestamp of the pong response')
    })
  }
});

export const fileService = defineService('file', {
  transfer: {
    input: z.object({
      filename: z.string().describe('Name of the file being transferred'),
      size: z.number().describe('Size of the file in bytes'),
      chunk: z.string().describe('Base64 encoded file chunk'),
      chunkIndex: z.number().describe('Index of this chunk'),
      totalChunks: z.number().describe('Total number of chunks for this file')
    }),
    output: z.object({
      received: z.boolean().describe('Whether the chunk was received successfully'),
      nextChunk: z.number().describe('Index of the next expected chunk')
    })
  }
});