import { updateGenerationRun } from './generationRunStore.js';

const queue = [];
let processing = false;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function processRun(runId) {
  const totals = 10;
  const errors = [];

  updateGenerationRun(runId, {
    status: 'running',
    totals,
    progress: 0,
    startedAt: new Date().toISOString(),
    error: null,
    errors
  });

  for (let i = 1; i <= totals; i += 1) {
    await sleep(500);

    // Simulate occasional per-item failures while the overall run can continue.
    if (i % 4 === 0) {
      errors.push(`Item ${i}: failed to generate due to simulated upstream timeout`);
    }

    updateGenerationRun(runId, {
      progress: i,
      errors
    });
  }

  updateGenerationRun(runId, {
    status: errors.length > 0 ? 'completed_with_errors' : 'completed',
    finishedAt: new Date().toISOString(),
    error: null,
    errors
  });
}

async function flushQueue() {
  if (processing) {
    return;
  }

  processing = true;

  while (queue.length > 0) {
    const runId = queue.shift();
    try {
      await processRun(runId);
    } catch (error) {
      updateGenerationRun(runId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  processing = false;
}

export function enqueueGenerationRun(runId) {
  queue.push(runId);
  void flushQueue();
}
