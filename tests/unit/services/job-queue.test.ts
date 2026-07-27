import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createStorybookClientStub,
  delegatingClient,
  COMPONENT_HTML,
  type StorybookClientStub,
} from '../../helpers/storybook-fixture.js';

let stub: StorybookClientStub;

vi.mock('../../../src/utils/storybook-client.js', () => ({
  StorybookClient: vi.fn(function () {
    return delegatingClient(() => stub);
  }),
}));

const { jobQueue } = await import('../../../src/services/job-queue.js');

/** Let the queue's fire-and-forget processing settle. */
const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('jobQueue.enqueue', () => {
  it('returns a unique id and starts the job queued', () => {
    const first = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    const second = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });

    expect(first).not.toBe(second);
    expect(first).toMatch(/^job_\d+_[a-z0-9]+$/);
  });

  it('runs the job and stores the result', async () => {
    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    const status = jobQueue.getStatus(jobId)!;
    expect(status.status).toBe('completed');
    expect(status.result.html).toBe(COMPONENT_HTML.html);
    expect(status.started_at).toBeDefined();
    expect(status.completed_at).toBeDefined();
  });

  it('records the failure message instead of throwing', async () => {
    stub.fetchComponentHTML.mockRejectedValue(new Error('Navigation timeout'));

    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    const status = jobQueue.getStatus(jobId)!;
    expect(status.status).toBe('failed');
    expect(status.error).toBe('Navigation timeout');
  });

  it('fails a job for an unknown tool', async () => {
    const jobId = jobQueue.enqueue('does_not_exist', { componentId: 'x' });
    await settle();

    expect(jobQueue.getStatus(jobId)!.error).toBe('Unknown tool: does_not_exist');
  });
});

describe('jobQueue.getStatus', () => {
  it('returns null for an unknown id', () => {
    expect(jobQueue.getStatus('job_nope')).toBeNull();
  });

  it('omits result and error until there is one', () => {
    const jobId = jobQueue.enqueue('get_component_html', { componentId: 'alert--danger' });
    const status = jobQueue.getStatus(jobId)!;

    expect(status.job_id).toBe(jobId);
    expect(status).not.toHaveProperty('result');
    expect(status).not.toHaveProperty('error');
  });
});

describe('jobQueue.cancel', () => {
  it('reports false for an unknown id', () => {
    expect(jobQueue.cancel('job_nope')).toBe(false);
  });

  it('reports false for a job that already finished', async () => {
    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    expect(jobQueue.getStatus(jobId)!.status).toBe('completed');
    expect(jobQueue.cancel(jobId)).toBe(false);
  });

  it('discards the result of a job cancelled mid-flight', async () => {
    let release: (value: unknown) => void = () => {};
    stub.fetchComponentHTML.mockReturnValue(
      new Promise(resolve => {
        release = resolve;
      })
    );

    const jobId = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();
    expect(jobQueue.getStatus(jobId)!.status).toBe('running');

    expect(jobQueue.cancel(jobId)).toBe(true);
    release(COMPONENT_HTML);
    await settle();

    const status = jobQueue.getStatus(jobId)!;
    expect(status.status).toBe('cancelled');
    expect(status).not.toHaveProperty('result');
  });
});

describe('jobQueue.runSync', () => {
  it('resolves the component id to a story before fetching', async () => {
    const result = await jobQueue.runSync('get_component_html', {
      componentId: 'components-button',
    });

    expect(stub.fetchComponentHTML).toHaveBeenCalledWith('components-button--default');
    expect(result.storyId).toBe(COMPONENT_HTML.storyId);
  });

  it('rejects an unknown tool', async () => {
    await expect(jobQueue.runSync('nope', {})).rejects.toThrow('Unknown tool: nope');
  });

  it('times out a fetch that never resolves', async () => {
    vi.useFakeTimers();
    stub.fetchComponentHTML.mockReturnValue(new Promise(() => {}));

    const pending = jobQueue.runSync('get_component_html', {
      componentId: 'components-button--primary',
      timeout: 5000,
    });
    const assertion = expect(pending).rejects.toThrow('Operation timed out after 5000ms');

    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
    vi.useRealTimers();
  });
});

describe('jobQueue.listJobs and getStats', () => {
  it('filters by lifecycle state', async () => {
    const done = jobQueue.enqueue('get_component_html', {
      componentId: 'components-button--primary',
    });
    await settle();

    const completed = jobQueue.listJobs('completed').map(j => j.job_id);
    expect(completed).toContain(done);
    expect(jobQueue.listJobs('active').map(j => j.job_id)).not.toContain(done);
    expect(jobQueue.listJobs('all').map(j => j.job_id)).toContain(done);
  });

  it('reports the component each job is working on', async () => {
    const jobId = jobQueue.enqueue('get_component_html', { componentId: 'alert--danger' });
    await settle();

    expect(jobQueue.listJobs('all').find(j => j.job_id === jobId)!.component_id).toBe(
      'alert--danger'
    );
  });

  it('counts cancelled jobs as failed in the stats', async () => {
    const before = jobQueue.getStats();
    const jobId = jobQueue.enqueue('get_component_html', { componentId: 'alert--danger' });
    jobQueue.cancel(jobId);
    await settle();

    expect(jobQueue.getStats().failed).toBe(before.failed + 1);
  });
});
