import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createStorybookClientStub,
  delegatingClient,
  parseToolResponse,
  responseText,
  type StorybookClientStub,
} from '../../helpers/storybook-fixture.js';

let stub: StorybookClientStub;

vi.mock('../../../src/utils/storybook-client.js', () => ({
  StorybookClient: vi.fn(function () {
    return delegatingClient(() => stub);
  }),
}));

const { handleJobStatus } = await import('../../../src/tools/job-status.js');
const { handleJobList } = await import('../../../src/tools/job-list.js');
const { handleJobCancel } = await import('../../../src/tools/job-cancel.js');
const { jobQueue } = await import('../../../src/services/job-queue.js');

const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('job_status', () => {
  it('reports a finished job with its result', async () => {
    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    const response = await handleJobStatus({ job_id: jobId });

    expect(responseText(response)).toContain('Job completed successfully');
    expect(parseToolResponse(response).result.classes).toEqual(['btn', 'btn--primary']);
  });

  it('reports a failed job with its error', async () => {
    stub.fetchComponentHTML.mockRejectedValue(new Error('Navigation timeout'));
    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    const response = await handleJobStatus({ job_id: jobId });

    expect(responseText(response)).toContain('Job failed');
    expect(parseToolResponse(response).error).toBe('Navigation timeout');
  });

  it('reports an unknown job id as an error', async () => {
    const text = responseText(await handleJobStatus({ job_id: 'job_missing' }));

    expect(text).toMatch(/^Error:/);
    expect(text).toContain('Job not found: job_missing');
  });

  it('requires job_id', async () => {
    expect(responseText(await handleJobStatus({}))).toMatch(/^Error:/);
  });
});

describe('job_cancel', () => {
  it('cancels a queued job', async () => {
    const jobId = jobQueue.enqueue('get_component_html', { componentId: 'alert--danger' });

    const data = parseToolResponse(await handleJobCancel({ job_id: jobId }));

    expect(data).toEqual({ job_id: jobId, cancelled: true });
    expect(jobQueue.getStatus(jobId)!.status).toBe('cancelled');
    await settle();
  });

  it('reports a job it could not cancel without failing the call', async () => {
    const response = await handleJobCancel({ job_id: 'job_missing' });

    expect(responseText(response)).not.toMatch(/^Error:/);
    expect(parseToolResponse(response).cancelled).toBe(false);
  });

  it('requires job_id', async () => {
    expect(responseText(await handleJobCancel({}))).toMatch(/^Error:/);
  });
});

describe('job_list', () => {
  it('lists jobs with queue statistics', async () => {
    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    const response = await handleJobList({});
    const data = parseToolResponse(response);

    expect(data.jobs.map((j: any) => j.job_id)).toContain(jobId);
    expect(data.stats).toEqual({
      queued: expect.any(Number),
      running: expect.any(Number),
      completed: expect.any(Number),
      failed: expect.any(Number),
    });
    expect(responseText(response)).toMatch(/^Found \d+ jobs/);
  });

  it('defaults to all jobs when called with no arguments', async () => {
    const all = parseToolResponse(await handleJobList({})).jobs.length;

    expect(parseToolResponse(await handleJobList(undefined)).jobs).toHaveLength(all);
  });

  it('filters to completed jobs only', async () => {
    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    const active = parseToolResponse(await handleJobList({ status: 'active' })).jobs;
    const completed = parseToolResponse(await handleJobList({ status: 'completed' })).jobs;

    expect(completed.map((j: any) => j.job_id)).toContain(jobId);
    expect(active.map((j: any) => j.job_id)).not.toContain(jobId);
  });

  it('rejects an unknown status filter', async () => {
    expect(responseText(await handleJobList({ status: 'pending' }))).toMatch(/^Error:/);
  });
});
