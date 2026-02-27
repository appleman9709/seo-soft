import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('generation run is queued and completes with persisted status', async () => {
  const port = 3100;
  const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit'
  });

  await sleep(500);

  const enqueueResponse = await fetch(`http://localhost:${port}/projects/p1/generate`, { method: 'POST' });
  assert.equal(enqueueResponse.status, 202);
  const enqueueBody = await enqueueResponse.json();
  assert.ok(enqueueBody.generationRunId);

  let status = 'queued';
  let run;
  for (let i = 0; i < 15; i += 1) {
    await sleep(1000);
    const statusResponse = await fetch(`http://localhost:${port}/generation-runs/${enqueueBody.generationRunId}`);
    run = await statusResponse.json();
    status = run.status;
    if (['completed', 'completed_with_errors', 'failed'].includes(status)) {
      break;
    }
  }

  assert.ok(run);
  assert.ok(['completed', 'completed_with_errors'].includes(run.status));
  assert.equal(run.progress, run.totals);
  assert.ok(run.finishedAt);

  server.kill('SIGTERM');
});
