#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { StorybookClient } from './utils/storybook-client.js';

import * as tools from './tools/index.js';

const toolHandlers = new Map<string, (input: any) => Promise<any>>([
  ['list_components', tools.handleListComponents],
  ['get_component_html', tools.handleGetComponentHTML],
  ['get_component_variants', tools.handleGetComponentVariants],
  ['search_components', tools.handleSearchComponents],
  ['get_component_props', tools.handleGetComponentProps],
  ['get_component_dependencies', tools.handleGetComponentDependencies],
  ['get_layout_components', tools.handleGetLayoutComponents],
  ['get_theme_info', tools.handleGetThemeInfo],
  ['get_component_by_purpose', tools.handleGetComponentByPurpose],
  ['get_component_composition_examples', tools.handleGetComponentCompositionExamples],
]);

const allTools = [
  tools.listComponentsTool,
  tools.getComponentHTMLTool,
  tools.getComponentVariantsTool,
  tools.searchComponentsTool,
  tools.getComponentPropsTool,
  tools.getComponentDependenciesTool,
  tools.getLayoutComponentsTool,
  tools.getThemeInfoTool,
  tools.getComponentByPurposeTool,
  tools.getComponentCompositionExamplesTool,
];

async function main() {
  try {
    const client = new StorybookClient();
    const isConnected = await client.testConnection();

    if (!isConnected) {
      console.error(`❌ Unable to connect to Storybook at ${client.getStorybookUrl()}`);
      console.error('Make sure Storybook is running and accessible');
      process.exit(1);
    }

    console.error(`✅ Connected to Storybook at ${client.getStorybookUrl()}`);
  } catch (error: any) {
    console.error('Connection Error:', error.message);
    process.exit(1);
  }

  const server = new Server(
    {
      name: 'design-system-extractor',
      version: '1.0.0',
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
