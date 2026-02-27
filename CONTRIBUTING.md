# Contributing

Thanks for contributing!

This repository is currently lightweight. Please follow the conventions below so contributors can onboard quickly and keep quality consistent.

## Project onboarding
- Read `AGENTS.md` for project workflow and conventions used by automation.
- Keep docs and structure notes updated as code is added.

## Development workflow
1. Create a focused branch/commit for a single concern.
2. Implement changes with explicit typing and consistent formatting.
3. Run tests and quality checks.
4. Update documentation when behavior, structure, or conventions change.

## Tests and lint
Tooling is not yet bootstrapped in this repo. Once available, contributors should use standard scripts:
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run typecheck`

If you add or change tooling, update these commands in both `AGENTS.md` and this file.

## Coding conventions
- TypeScript strict mode is required (`"strict": true`).
- Prefer explicit and narrow types; avoid `any` unless unavoidable and documented.
- Use a single formatter (prefer Prettier) and keep formatting clean.
- Naming conventions:
  - `PascalCase`: types, interfaces, classes, components.
  - `camelCase`: variables, functions, and most object keys.
  - `UPPER_SNAKE_CASE`: constants/env variable names.
  - Use consistent file naming across the project (recommend `kebab-case`).

## Where to add new endpoints and types
When structure is established:
- Add endpoints under `src/api/` (or the framework's route directory).
- Add shared/domain types under `src/types/` or nearest domain module.
- Keep endpoint schemas close to handlers and reuse shared domain types.
- Reflect any structural updates in docs.

## Definition of Done (DoD)
Before opening or merging a PR, ensure:
- [ ] Scope is clear and limited to the stated change.
- [ ] New or changed behavior is covered by tests (or a rationale is documented when tests are not possible).
- [ ] Lint, format, and type-check pass locally.
- [ ] Documentation is updated (including `AGENTS.md` and this file when process/conventions change).
- [ ] Backward compatibility, migration impact, and config/env changes are documented.
- [ ] Commits are clear and atomic.
- [ ] PR description includes summary, validation steps, and follow-up items.
