# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Vite dev server with hot reload
- **Build**: `npm run build` - Creates production build using Vite
- **Lint**: `npm run lint` - Runs ESLint with React-specific rules
- **Preview**: `npm run preview` - Preview production build locally

## Architecture Overview

This is a React + Vite application that demonstrates custom shape creation in tldraw, a collaborative drawing canvas library. The project creates two custom card shapes with different UI implementations.

### Core Structure

- **Main App** (`src/App.tsx`): Wraps Tldraw component with MantineProvider, configures custom shapes and tools
- **Custom Shapes**: Two implementations of card shapes:
  - `CardShape*` files: Basic HTML-based card with inline styles
  - `MantineCardShape*` files: Mantine UI-based card with consistent design system

### Custom Shape Pattern

Each custom shape requires 4 files:
1. **ShapeUtil** (`*ShapeUtil.tsx`): Core shape behavior, rendering, and event handling
2. **ShapeTool** (`*ShapeTool.tsx`): Tool for creating shapes (extends BaseBoxShapeTool)
3. **Types** (`card-shape-types.ts`): TypeScript definitions for shape props
4. **Props/Migrations**: Validation schemas and version migration logic

### Key Integration Points

- **Shape Registration**: Custom shapes/tools arrays passed to Tldraw component
- **Mantine Integration**: Uses `@mantine/core` components within HTMLContainer for styled UI

### Dependencies

- **tldraw**: ^3.15.0 - Core drawing canvas library
- **@mantine/core**: ^8.2.2 - UI component library
- **React**: ^19.1.0 - Component framework
- **Vite**: ^7.0.4 - Build tool and dev server

### Development Notes

- Custom shapes use HTMLContainer for HTML/React content within tldraw
- State management in shape components uses standard React hooks
- Event propagation requires explicit stopPropagation() calls
- ESLint configured for React hooks and JSX


### Claude steering prompts
- When an instruction is unclear, ask clarifying question to be sure you have all the information to carry out the task. Err on the side of asking too many questions rather than too little.