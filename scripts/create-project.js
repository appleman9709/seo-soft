import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createProject } from '../src/project/createProject.js';

function parseArgs(argv) {
  const options = { name: '', addStarterTemplates: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--name') {
      options.name = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--add-starter-templates') {
      options.addStarterTemplates = true;
    } else if (arg === '--no-add-starter-templates') {
      options.addStarterTemplates = false;
    }
  }

  return options;
}

async function askWithCheckbox() {
  const rl = readline.createInterface({ input, output });

  try {
    const name = await rl.question('Project name: ');
    const checkboxAnswer = await rl.question('[ ] Add starter templates (y/N): ');

    return {
      name: name.trim(),
      addStarterTemplates: /^(y|yes)$/i.test(checkboxAnswer.trim())
    };
  } finally {
    rl.close();
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const canPrompt = input.isTTY && output.isTTY;

  const options = parsed.name
    ? {
        name: parsed.name.trim(),
        addStarterTemplates: parsed.addStarterTemplates ?? false
      }
    : canPrompt
      ? await askWithCheckbox()
      : {
          name: '',
          addStarterTemplates: false
        };

  if (!options.name) {
    throw new Error('Project name is required. Use --name <project-name> in non-interactive mode.');
  }

  const { projectDir } = await createProject(options);

  console.log(`Project created at ${projectDir}`);
  if (options.addStarterTemplates) {
    console.log('Starter templates were added.');
  } else {
    console.log('Starter templates were skipped.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
