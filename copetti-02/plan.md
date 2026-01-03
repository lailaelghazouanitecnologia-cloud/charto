# MoonBucks CMS Architecture Plan

> **Status**: Future Development Concept
> **Priority**: Low (Documentation Only)

---

## Overview

A modular CMS architecture inspired by professional tools like Blender, enabling flexible layouts, specialized widgets, and a marketplace ecosystem.

---

## Directory Structure

```
src/
├── layout/                    # Layout management system
│   ├── types.ts              # Layout types and interfaces
│   ├── LayoutEngine.ts       # Core layout engine
│   ├── DynamicLayout.tsx     # Blender-style draggable panels
│   ├── StaticLayout.tsx      # Fixed grid layouts
│   ├── LayoutSerializer.ts   # Save/load layouts
│   └── presets/              # Pre-built layout templates
│       ├── trading.json
│       ├── analytics.json
│       └── research.json
│
├── widgets/                   # Lightweight, focused components
│   ├── registry.ts           # Widget registration system
│   ├── Widget.tsx            # Base widget wrapper
│   ├── WidgetMarketplace.tsx # Browse/install widgets
│   └── catalog/              # Built-in widgets
│       ├── PriceWidget/
│       ├── ChartWidget/
│       ├── WatchlistWidget/
│       ├── NewsWidget/
│       ├── AlertsWidget/
│       └── ...
│
├── capsules/                  # Complex, project-level editors
│   ├── registry.ts           # Capsule registration
│   ├── Capsule.tsx           # Base capsule container
│   └── catalog/
│       ├── ScriptingCapsule/     # Full IDE-like editor
│       │   ├── Editor.tsx
│       │   ├── Console.tsx
│       │   ├── FileExplorer.tsx
│       │   ├── Debugger.tsx
│       │   └── ...
│       ├── StrategyBuilderCapsule/
│       │   ├── Canvas.tsx
│       │   ├── NodeEditor.tsx
│       │   ├── Backtester.tsx
│       │   └── ...
│       ├── PortfolioManagerCapsule/
│       └── ...
│
├── ui/                        # Design system primitives
│   ├── primitives/           # Atomic components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── ...
│   ├── composites/           # Compound components
│   │   ├── DataTable.tsx
│   │   ├── Modal.tsx
│   │   ├── Tabs.tsx
│   │   └── ...
│   ├── charts/               # Chart primitives
│   └── theme/                # Theming system
│
└── marketplace/              # Widget/Capsule marketplace
    ├── MarketplaceAPI.ts
    ├── MarketplaceBrowser.tsx
    ├── PackageManager.ts
    └── VersionManager.ts
```

---

## Core Concepts

### 1. Layout System

Two layout modes:

#### Dynamic Layout (Blender-style)
- Drag-to-split panels (horizontal/vertical)
- Resize by dragging borders
- Swap panel contents via dropdown
- Save/load workspace configurations
- Floating windows support

```typescript
interface DynamicPanel {
    id: string;
    type: "container" | "leaf";
    direction?: "horizontal" | "vertical";
    children?: DynamicPanel[];
    ratio?: number[];
    content?: WidgetId | CapsuleId;
}
```

#### Static Layout
- Predefined grid zones
- Responsive breakpoints
- Simpler for basic users

```typescript
interface StaticLayout {
    id: string;
    name: string;
    zones: {
        id: string;
        area: string; // CSS grid-area
        allowedTypes: ("widget" | "capsule")[];
    }[];
}
```

---

### 2. Widgets

Lightweight, single-purpose components.

```typescript
interface WidgetDefinition {
    id: string;
    name: string;
    version: string;
    author: string;
    category: WidgetCategory;

    // Size constraints
    minWidth: number;
    minHeight: number;
    defaultSize: { width: number; height: number };

    // Capabilities
    capabilities: {
        resizable: boolean;
        configurable: boolean;
        realtime: boolean;
    };

    // Component
    component: React.ComponentType<WidgetProps>;

    // Optional
    settings?: WidgetSettings[];
    dependencies?: string[];
}
```

**Widget Categories:**
- `data` - Price, volume, market data
- `chart` - Visualization widgets
- `news` - News feeds, social
- `trading` - Order entry, positions
- `analysis` - Technical analysis tools
- `utility` - Calculators, converters

---

### 3. Capsules

Complex, self-contained applications within the CMS.

```typescript
interface CapsuleDefinition {
    id: string;
    name: string;
    version: string;
    author: string;

    // Capsules are always large
    minWidth: 600;
    minHeight: 400;

    // Internal layout
    internalLayout: CapsuleLayout;

    // State management
    stateSchema: JSONSchema;

    // Component ecosystem
    components: {
        main: React.ComponentType;
        toolbar?: React.ComponentType;
        sidebar?: React.ComponentType;
        statusbar?: React.ComponentType;
    };

    // Services
    services?: CapsuleService[];
}
```

**Capsule Examples:**

| Capsule | Description | Complexity |
|---------|-------------|------------|
| ScriptingIDE | Full code editor with debugging | ⭐⭐⭐⭐⭐ |
| StrategyBuilder | Visual node-based strategy | ⭐⭐⭐⭐ |
| Backtester | Historical strategy testing | ⭐⭐⭐⭐ |
| PortfolioManager | Multi-account management | ⭐⭐⭐ |
| JournalEditor | Trade journaling system | ⭐⭐⭐ |
| ScannerBuilder | Custom screener builder | ⭐⭐⭐ |

---

### 4. Marketplace

Discover, install, and manage widgets/capsules.

```typescript
interface MarketplaceItem {
    id: string;
    type: "widget" | "capsule";
    name: string;
    description: string;
    author: AuthorInfo;
    version: string;

    // Metadata
    downloads: number;
    rating: number;
    reviews: Review[];
    screenshots: string[];

    // Pricing
    pricing: "free" | "paid" | "subscription";
    price?: number;

    // Technical
    dependencies: Dependency[];
    permissions: Permission[];
    bundle: {
        size: number;
        url: string;
        hash: string;
    };
}
```

**Marketplace Features:**
- Browse by category
- Search with filters
- Install/uninstall
- Auto-updates
- User reviews & ratings
- Developer portal for submissions

---

## Implementation Phases

### Phase 1: Foundation
- [ ] UI primitives library
- [ ] Basic widget system
- [ ] Static layout engine

### Phase 2: Dynamic Layouts
- [ ] Panel splitting/merging
- [ ] Drag resize
- [ ] Layout persistence

### Phase 3: Capsules
- [ ] Capsule container
- [ ] ScriptingIDE capsule
- [ ] Internal state management

### Phase 4: Marketplace
- [ ] Package format specification
- [ ] Marketplace API
- [ ] Developer submission flow

---

## Technical Considerations

### State Management
- Widgets: Local state + optional global sync
- Capsules: Internal state machine with persistence
- Layout: Serializable configuration

### Communication
```
┌─────────────────────────────────────────────┐
│                  Event Bus                   │
├─────────────────────────────────────────────┤
│  Widget A ←→ Widget B ←→ Capsule X          │
│      ↓           ↓           ↓              │
│  [price.update] [symbol.change] [trade.new] │
└─────────────────────────────────────────────┘
```

### Security
- Sandboxed widget execution
- Permission system for API access
- Code signing for marketplace items

---

## Notes

This is a **conceptual architecture** for future development. The current implementation focuses on the core trading features. This plan serves as a reference for the long-term vision of creating a fully modular, extensible trading platform.

---

*Last updated: 2026-01-03*
