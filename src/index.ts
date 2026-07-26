#!/usr/bin/env node

declare const __PKG_VERSION__: string;

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

import * as tools from './tools/index.js';
import { jobQueue } from './services/job-queue.js';

const toolHandlers = new Map<string, (input: any) => Promise<any>>([
  ['list_components', tools.handleListComponents],
  ['get_component_html', tools.handleGetComponentHTML],
  ['search_components', tools.handleSearchComponents],
  ['get_component_dependencies', tools.handleGetComponentDependencies],
  ['get_theme_info', tools.handleGetThemeInfo],
  ['get_external_css', tools.handleGetExternalCSS],
  ['job_status', tools.handleJobStatus],
  ['job_cancel', tools.handleJobCancel],
  ['job_list', tools.handleJobList],
]);

const allTools = [
  tools.listComponentsTool,
  tools.getComponentHTMLTool,
  tools.searchComponentsTool,
  tools.getComponentDependenciesTool,
  tools.getThemeInfoTool,
  tools.getExternalCSSTool,
  tools.jobStatusTool,
  tools.jobCancelTool,
  tools.jobListTool,
];

async function main() {
  // Start the background job processor for async operations
  jobQueue.startProcessor();

  const server = new Server(
    {
      name: 'design-system-extractor',
      version: __PKG_VERSION__,
      description:
        'Extract and use components from your Storybook design system. Find UI components like modals, dialogs, buttons, forms, and more. Helps integrate design system components into your projects.',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    const handler = toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler(args);
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async () => {
    throw new Error('Resource reading not implemented');
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Storybook Design System Extractor MCP server running on stdio');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
