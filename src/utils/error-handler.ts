import { ToolResponse } from '../types/tools.js';

export function handleError(error: unknown): ToolResponse {
  let message = 'An unknown error occurred';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
  };
}

export function formatSuccessResponse(data: any, message?: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: message
          ? `${message}\n\n${JSON.stringify(data, null, 2)}`
          : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function formatTextResponse(text: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}
