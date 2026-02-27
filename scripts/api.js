import { seedModule1 } from './seed-module1.js';

const [, , command] = process.argv;

async function run() {
  switch (command) {
    case 'seed:module1':
      await seedModule1();
      console.log('Done: module1 starter templates seeded.');
      break;
    default:
      console.error(`Unknown API command: ${command ?? '(none)'}`);
      console.error('Usage: pnpm api seed:module1');
      process.exitCode = 1;
  }
}

run();
