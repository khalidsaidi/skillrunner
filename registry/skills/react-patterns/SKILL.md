---
name: react-patterns
description: React best practices and patterns
version: "1.0.0"
tags: [react, patterns]
kind: knowledge
risk: low
---

# React Patterns

- **Composition**: Prefer composition over prop drilling; use context sparingly
- **State**: Lift state only as needed; use useReducer for complex state
- **Effects**: Keep effects minimal; extract logic to custom hooks
- **Keys**: Stable keys for lists; avoid index when order can change
- **Memoization**: React.memo, useMemo, useCallback only when profiling shows benefit
