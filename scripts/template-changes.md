# Template for Changes

This document shows the correct format for making file modifications. Each file should be wrapped in the specific markdown blocks shown below.

```markdown
--- START OF MODIFIED FILE src/example/file.ts ---
```

```typescript
// filepath: src/example/file.ts
export const example = {
  // Your code here
  value: 'example'
};
```

```markdown
--- END OF MODIFIED FILE src/example/file.ts ---
```

---

```markdown
--- START OF MODIFIED FILE src/example/another.ts ---
```

```typescript
// filepath: src/example/another.ts
// Example of multiple changes in one file
interface Example {
  // ...existing code...
  newProperty: string;
  // ...existing code...
}
```

```markdown
--- END OF MODIFIED FILE src/example/another.ts ---
```