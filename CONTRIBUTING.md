# Contributing to HexaScale

## Development Setup
```bash
npm install
npm run dev    # http://localhost:3000
```

## Project Conventions

### File Organization
- **hooks/** — Custom React hooks that own state. One hook per domain.
- **views/** — Top-level page components rendered conditionally in App.tsx.
- **components/** — Reusable UI components. Each component in its own file.
- **services/** — Pure logic (no React). Geospatial processing, column inference.
- **utils/** — Small utilities: constants, error types, color scales, config serialization.
- **tests/** — Vitest test files mirroring the service/util they test.

### Error Handling
- Services throw `AppError` or accumulate into `ProcessingWarnings`
- Hooks catch errors and expose them via state
- Views display errors via toast (fatal) or warning banner (non-fatal)
- Never use empty `catch(e) {}` — always log to warnings accumulator

### Testing
- Tests live in `tests/` directory
- Run with `npm test`
- Focus on services and utils (pure logic)
- Use fixtures in `tests/fixtures/` for test data
- Column inference tests must include false positive regression cases

### Naming
- React components: PascalCase files and exports
- Hooks: camelCase with `use` prefix
- Services/utils: camelCase files
- Constants: UPPER_SNAKE_CASE
- Types/interfaces: PascalCase
- Enums: PascalCase with PascalCase values

### Code Style
- TypeScript strict mode
- Functional components with hooks
- `useCallback` and `useMemo` for performance-sensitive paths
- Named exports (no default exports except App.tsx)
