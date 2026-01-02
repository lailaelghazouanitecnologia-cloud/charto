# @copetti/charts

Modern TypeScript charting library for financial data visualization.

## Features

- 📊 Canvas-based rendering for optimal performance
- ⚛️ React 19 integration with Radix UI components
- 🎨 Tailwind CSS 4 for styling
- 📈 Multiple chart types (candlestick, line, area, etc.)
- 🔍 Zoom and pan support
- 📱 Responsive design
- 🌙 Dark/light theme support

## Installation

```bash
bun add @copetti/charts
```

## Quick Start

```tsx
import { Chart } from "@copetti/charts";

function App() {
    const data = [
        { id: "1", timestamp: 1704067200000, open: 100, high: 105, low: 98, close: 103, volume: 1000 },
        { id: "2", timestamp: 1704153600000, open: 103, high: 108, low: 101, close: 106, volume: 1200 },
        // ... more candles
    ];

    return (
        <Chart
            data={data}
            width={800}
            height={400}
            config={{
                autoScale: true,
                showGrid: true,
                showCrosshair: true,
            }}
        />
    );
}
```

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test

# Build for production
bun run build
```

## Architecture

The library follows a modular architecture with clear separation of concerns:

- **Core** - Event bus, canvas management, models
- **Chart** - Drawing logic, components, utilities
- **Components** - React components
- **Types** - TypeScript type definitions

## Design Principles

This project adheres to strict coding standards for safety, performance, and developer experience:

- Explicit types everywhere
- Bounded operations (no unbounded loops)
- Minimum 2 assertions per function
- Maximum 80 lines per function
- No magic numbers

## License

MPL-2.0
