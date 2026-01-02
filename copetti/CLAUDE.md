# Copetti Charts

## Project Overview

Modern TypeScript charting library built with:
- **Bun** - Fast JavaScript runtime and package manager
- **React 19** - UI framework
- **Radix UI** - Accessible component primitives
- **Tailwind CSS 4** - Utility-first CSS
- **RxJS** - Reactive extensions
- **Vitest** - Testing framework

## Architecture

```
src/
├── core/                 # Core functionality
│   ├── events/          # Event bus system
│   ├── canvas/          # Canvas management
│   ├── model/           # Data models (scale, viewport)
│   └── animation/       # Animation utilities
├── chart/               # Chart-specific code
│   ├── components/      # Chart sub-components
│   ├── drawers/         # Canvas drawing logic
│   └── utils/           # Chart utilities
├── components/          # React components
│   └── ui/              # UI components (Radix-based)
├── types/               # TypeScript type definitions
├── utils/               # General utilities
└── styles/              # CSS styles (Tailwind)
```

## Design Principles

Following the **Code Style Guide**:

1. **Safety First** - Assertions, explicit types, bounded operations
2. **Performance** - Batching, efficient canvas rendering
3. **Developer Experience** - Clear naming, explicit control flow

### Key Patterns

- **Guard Clauses** - Early exit for invalid states
- **State Machines** - Explicit state management
- **Explicit Types** - No implicit any
- **Bounded Operations** - Limits on loops, queues

## Commands

```bash
# Development
bun run dev          # Start dev server (Vite)
bun run build        # Build for production
bun run preview      # Preview production build

# Testing
bun run test         # Run tests in watch mode
bun run test:run     # Run tests once
bun run test:coverage # Run with coverage

# Code Quality
bun run lint         # Run ESLint
bun run format       # Format with Prettier
bun run typecheck    # TypeScript type checking
```

## Code Style Requirements

- **Maximum 3 levels of nesting**
- **Maximum 80 lines per function**
- **Minimum 2 assertions per function**
- **Always use braces** for if/for/while
- **No magic numbers** - use constants
- **Explicit return types** on all functions

## Legacy Code

The original DXCharts Lite codebase is preserved in `/legacy/`.
