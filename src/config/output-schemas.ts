/**
 * `outputSchema` declarations for every tool.
 *
 * A tool that declares one must return `structuredContent` matching it, which
 * lets a client consume the result as data instead of re-parsing the JSON we
 * happen to have embedded in the text block. The text block is unchanged, so
 * clients that never look at `structuredContent` see exactly what they saw
 * before.
 *
 * Schemas are JSON Schema 2020-12, as the MCP specification requires.
 */

const PAGINATION = {
  type: 'object',
  description: 'Where the returned slice sits in the full result set.',
  properties: {
    page: { type: 'number' },
    pageSize: { type: 'number' },
    totalItems: { type: 'number' },
    totalPages: { type: 'number' },
  },
  required: ['page', 'pageSize', 'totalItems', 'totalPages'],
} as const;

const COMPONENT = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Component id, e.g. "components-button"' },
    name: { type: 'string', description: 'Component name, e.g. "Button"' },
    title: { type: 'string', description: 'Full Storybook path, e.g. "Components/Button"' },
    category: { type: 'string', description: 'Path above the component name; absent at top level' },
    variantCount: { type: 'number', description: 'Number of stories; compact responses only' },
    stories: {
      type: 'array',
      description: 'The raw stories; full responses only (compact=false)',
      items: { type: 'object' },
    },
  },
  required: ['id', 'name', 'title'],
} as const;

const TOKEN_MAP = {
  type: 'object',
  additionalProperties: { type: 'string' },
} as const;

const THEME = {
  type: 'object',
  properties: {
    colors: TOKEN_MAP,
    spacing: TOKEN_MAP,
    typography: TOKEN_MAP,
    breakpoints: TOKEN_MAP,
    shadows: TOKEN_MAP,
    radii: TOKEN_MAP,
    other: TOKEN_MAP,
  },
  required: ['colors', 'spacing', 'typography', 'breakpoints', 'shadows', 'radii'],
} as const;

const JOB_SUMMARY = {
  type: 'object',
  properties: {
    job_id: { type: 'string' },
    status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed', 'cancelled'] },
    component_id: { type: 'string' },
    created_at: { type: 'number' },
    started_at: { type: 'number' },
  },
  required: ['job_id', 'status', 'component_id', 'created_at'],
} as const;

export const OUTPUT_SCHEMAS: Record<string, object> = {
  list_components: {
    type: 'object',
    properties: {
      components: { type: 'array', items: COMPONENT },
      pagination: PAGINATION,
    },
    required: ['components', 'pagination'],
  },

  search_components: {
    type: 'object',
    properties: {
      components: { type: 'array', items: COMPONENT },
      description: {
        type: 'string',
        description: 'What the matched purpose covers; present only for a purpose search',
      },
      pagination: PAGINATION,
    },
    required: ['components', 'pagination'],
  },

  // Three shapes behind one tool: a variant list, a queued job, or the
  // extracted markup. Which one you get depends on variantsOnly and async.
  get_component_html: {
    type: 'object',
    properties: {
      componentId: { type: 'string', description: 'variantsOnly mode' },
      variants: { type: 'array', items: { type: 'string' }, description: 'variantsOnly mode' },
      job_id: { type: 'string', description: 'async mode' },
      status: { type: 'string', description: 'async mode' },
      component_id: { type: 'string', description: 'async mode' },
      storyId: { type: 'string', description: 'sync mode' },
      html: { type: 'string', description: 'sync mode' },
      classes: { type: 'array', items: { type: 'string' }, description: 'sync mode' },
      styles: {
        type: 'array',
        items: { type: 'string' },
        description: 'sync mode with includeStyles=true; Storybook boilerplate is filtered out',
      },
    },
  },

  get_component_dependencies: {
    type: 'object',
    properties: {
      storyId: { type: 'string' },
      dependencies: { type: 'array', items: { type: 'string' } },
      internalComponents: { type: 'array', items: { type: 'string' } },
      externalComponents: {
        type: 'array',
        items: { type: 'string' },
        description: 'Components matching a known library prefix (Mui, Ant, Bootstrap, ...)',
      },
    },
    required: ['storyId', 'dependencies', 'internalComponents', 'externalComponents'],
  },

  get_theme_info: {
    type: 'object',
    properties: {
      theme: THEME,
      totalTokens: { type: 'number' },
      sourceStoryId: {
        type: 'string',
        description: 'The story the tokens were read from',
      },
    },
    required: ['theme', 'totalTokens', 'sourceStoryId'],
  },

  get_external_css: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The absolute URL that was fetched' },
      originalUrl: { type: 'string', description: 'The URL as supplied by the caller' },
      fileSize: { type: 'number' },
      fileSizeFormatted: { type: 'string' },
      analysis: {
        type: 'object',
        properties: {
          totalRules: { type: 'number' },
          customProperties: { type: 'number' },
          mediaQueries: { type: 'number' },
          selectors: { type: 'number' },
          declarations: { type: 'number' },
        },
        required: ['totalRules', 'customProperties', 'mediaQueries', 'selectors', 'declarations'],
      },
      tokensExtracted: { type: 'boolean' },
      tokenCount: { type: 'number' },
      tokens: { ...THEME, description: 'null when extractTokens=false' },
      content: { type: 'string', description: 'Only when includeFullCSS=true' },
      truncated: { type: 'boolean' },
      displayedSize: { type: 'number' },
      truncationWarning: { type: 'string' },
    },
    required: ['url', 'originalUrl', 'fileSize', 'analysis', 'tokensExtracted', 'tokenCount'],
  },

  job_status: {
    type: 'object',
    properties: {
      job_id: { type: 'string' },
      status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed', 'cancelled'] },
      result: { type: 'object', description: 'Present once the job completes' },
      error: { type: 'string', description: 'Present when the job failed' },
      created_at: { type: 'number' },
      started_at: { type: 'number' },
      completed_at: { type: 'number' },
    },
    required: ['job_id', 'status', 'created_at'],
  },

  job_list: {
    type: 'object',
    properties: {
      jobs: { type: 'array', items: JOB_SUMMARY },
      stats: {
        type: 'object',
        properties: {
          queued: { type: 'number' },
          running: { type: 'number' },
          completed: { type: 'number' },
          failed: { type: 'number', description: 'Includes cancelled jobs' },
        },
        required: ['queued', 'running', 'completed', 'failed'],
      },
    },
    required: ['jobs', 'stats'],
  },

  job_cancel: {
    type: 'object',
    properties: {
      job_id: { type: 'string' },
      cancelled: {
        type: 'boolean',
        description: 'False when the job was unknown or had already finished',
      },
    },
    required: ['job_id', 'cancelled'],
  },
};
