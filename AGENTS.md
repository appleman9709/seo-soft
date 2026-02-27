# AGENTS.md

## Purpose
This repository is intentionally minimal right now. Use this guide to keep contributions consistent as the project grows.

## Repo structure overview
- `/` (repo root): project-level docs and configuration.
- `AGENTS.md`: instructions for Codex agents working in this repo.
- `CONTRIBUTING.md`: contributor guidance for humans.

> As source code is added, keep this section updated with a high-level map (for example: `src/`, `tests/`, `scripts/`, `docs/`).

## How to run tests and lint
There is currently no application code or test/lint tooling committed.
When bootstrapping or updating tooling, standardize on explicit scripts so both humans and agents can run the same commands.

Expected conventions once tooling exists:
- Test command: `npm test`
- Lint command: `npm run lint`
- Format check command: `npm run format:check`
- Type-check command: `npm run typecheck`

If you introduce a different stack, update this section and `CONTRIBUTING.md` in the same PR.

## Coding conventions
Apply these conventions for all new TypeScript code unless a deeper-scoped `AGENTS.md` overrides them:
- TypeScript must run in **strict mode** (`"strict": true` in `tsconfig`).
- Avoid `any`; prefer explicit types, generics, and narrowed unions.
- Use a consistent formatter (prefer Prettier) and ensure formatting checks pass before merge.
- Naming:
  - `PascalCase` for types, interfaces, classes, and React components.
  - `camelCase` for variables, functions, and object keys unless external API contracts require otherwise.
  - `UPPER_SNAKE_CASE` for true constants and environment variable names.
  - File and folder names should use one project-wide convention (recommend `kebab-case`) and stay consistent.

## Where to add new endpoints and types
No runtime framework is defined yet. Follow this placement policy when code structure is introduced:
- API endpoints: add under a dedicated API surface such as `src/api/` or framework-equivalent route directory.
- Shared/domain types: add under `src/types/` (or closest domain module) and export through a central barrel if used.
- Keep request/response schemas close to endpoints, and reuse shared types for domain models.
- When adding a new module layout, document it in this file immediately.

## Definition of Done (DoD) checklist for PRs
A PR is ready when all of the following are true:
- [ ] Scope is clear and limited to the stated change.
- [ ] New or changed behavior is covered by tests (or a written rationale is provided if tests are not possible).
- [ ] Lint, format, and type-check pass locally.
- [ ] Documentation is updated (including this file and `CONTRIBUTING.md` when conventions/process change).
- [ ] Backward compatibility, migration impact, and config/env changes are documented.
- [ ] Commit messages are clear and atomic.
- [ ] PR description includes summary, validation steps, and any follow-up work.

## Agent workflow notes
- Prefer small, reviewable commits.
- Run relevant checks before committing.
- If tooling is missing, clearly state what could not be validated and why.
