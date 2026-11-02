# Contributing to LRE

Thank you for your interest in contributing to LRE! This document outlines the coding standards and style guidelines enforced in this project.

## Prerequisites

- Use **yarn** for package management (not npm)
- Run `yarn checkcode` to validate TypeScript files

## Code Style

This project uses [Prettier](https://prettier.io/) for code formatting and [ESLint](https://eslint.org/) with TypeScript support for linting.

### Formatting Rules (Prettier)

| Rule            | Value   | Description                                  |
| --------------- | ------- | -------------------------------------------- |
| `trailingComma` | `all`   | Add trailing commas wherever possible (ES5+) |
| `tabWidth`      | `2`     | Use 2 spaces for indentation                 |
| `semi`          | `true`  | Always use semicolons                        |
| `singleQuote`   | `false` | Use double quotes `"` for strings            |
| `printWidth`    | `80`    | Maximum line length of 80 characters         |

### TypeScript Rules (ESLint)

#### Return Types

**Explicit return types are required** for all functions.

```typescript
// ✅ Good
function calculateSum(a: number, b: number): number {
  return a + b;
}

// ❌ Bad - missing return type
function calculateSum(a: number, b: number) {
  return a + b;
}
```

Note: Expressions (like callbacks in array methods) are exempt from this rule.

#### Unused Variables

Unused variables must be prefixed with `_` to indicate they are intentionally unused.

```typescript
// ✅ Good - unused parameter prefixed with _
function handler(_event: Event, data: Data): void {
  console.log(data);
}

// ❌ Bad - unused parameter without prefix
function handler(event: Event, data: Data): void {
  console.log(data);
}
```

This applies to:

- Function arguments (`argsIgnorePattern: "^_"`)
- Variables (`varsIgnorePattern: "^_"`)
- Caught errors (`caughtErrorsIgnorePattern: "^_"`)

#### Blank Lines & Spacing

**Between statements:** Always add a blank line before and after block-like statements (if, for, while, etc.) and functions.

```typescript
// ✅ Good
const x = 1;

if (x > 0) {
  doSomething();
}

const y = 2;
```

```typescript
// ❌ Bad - missing blank lines
const x = 1;
if (x > 0) {
  doSomething();
}
const y = 2;
```

**Between class members:** Always add a blank line before and after methods.

```typescript
// ✅ Good
class MyClass {
  private value: number;

  constructor() {
    this.value = 0;
  }

  getValue(): number {
    return this.value;
  }

  setValue(v: number): void {
    this.value = v;
  }
}
```

#### Empty Blocks

Empty blocks are not allowed, **except for catch blocks**.

```typescript
// ✅ Good - empty catch is allowed
try {
  riskyOperation();
} catch {
  // Intentionally empty
}

// ❌ Bad - empty if block
if (condition) {
}
```

#### Short-Circuit & Ternary Expressions

Short-circuit (`&&`, `||`) and ternary expressions are allowed as statements.

```typescript
// ✅ Good
condition && doSomething();
isValid ? process() : skip();
```

### Test Rules (Vitest)

#### Unique Test Titles

All test titles must be unique within their suite.

```typescript
// ✅ Good
it("should handle empty input", () => {});
it("should handle null input", () => {});

// ❌ Bad - duplicate titles
it("should work", () => {});
it("should work", () => {});
```

#### Test Padding

Always add blank lines around test blocks (`describe`, `it`, `test`, `beforeEach`, etc.).

```typescript
// ✅ Good
describe("MyComponent", () => {
  beforeEach(() => {
    setup();
  });

  it("should render", () => {
    expect(true).toBe(true);
  });

  it("should update", () => {
    expect(true).toBe(true);
  });
});
```

## Allowed Practices

The following are explicitly **allowed** in this codebase:

- Using `any` type (`@typescript-eslint/no-explicit-any` is off)
- Using `arguments` object (`prefer-rest-params` is off)
- Using `Function.apply` with arrays (`prefer-spread` is off)

## Testing

**⚠️ CRITICAL: Tests are MANDATORY, not optional.**

This project uses [Vitest](https://vitest.dev/) for testing. All code contributions must include comprehensive tests.

### Testing Philosophy

The goal is **confidence**: every function, API, and intended behavior should be automatically tested so code changes never cause unexpected regressions.

**Workflow**: Code → Tests → Documentation → Review. Never skip the tests step.

### Requirements

1. **Cover all cases** - This is the most important requirement. Every possible scenario must be tested:
   - All user inputs and possible values
   - Edge cases and corner cases
   - Error scenarios and invalid states
   - Boundary conditions

2. **Maximize code coverage** - Strive for exhaustive, high-coverage tests while focusing on correctness.

3. **Test all public APIs** - For any public method or exported function/class, create targeted tests.

### Best Practices

| Practice                 | Description                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| **Small, focused tests** | Prefer smaller test cases to isolate failures and speed up runs           |
| **Parameterized tests**  | Use parameterized or property-based tests to cover many cases efficiently |
| **Shared setups**        | Use helper functions or shared setups to avoid duplication                |
| **Coverage reports**     | Use coverage reports to discover untested branches                        |
| **Skip trivial code**    | Avoid over-testing simple getters/setters unless they contain logic       |
| **Maintain tests**       | Refactor tests when code changes to keep them relevant                    |

### Example Structure

```typescript
describe("MyComponent", () => {
  describe("myMethod", () => {
    it("should handle normal input", () => {
      // Test the happy path
    });

    it("should handle empty input", () => {
      // Edge case
    });

    it("should handle null/undefined", () => {
      // Error case
    });

    it("should handle boundary values", () => {
      // Boundary case
    });

    it.each([
      [input1, expected1],
      [input2, expected2],
      [input3, expected3],
    ])("should transform %s to %s", (input, expected) => {
      // Parameterized test for multiple cases
    });
  });
});
```

### Before Submitting

Ask yourself: **"What tests need to be created or updated?"**

- Did I test all the new code paths?
- Did I cover all edge cases?
- Did I test error scenarios?
- Are my tests focused and readable?

## Before Committing

**⚠️ MANDATORY: Run `yarn checkall` before every commit. It must pass with zero errors.**

```bash
yarn checkall
```

This command runs all quality checks:

- **ts-unused-exports** - Detects unused exports
- **cspell** - Spell checking
- **tsc** - TypeScript type checking
- **eslint** - Linting and formatting
- **vitest** - All tests

❌ **Do not commit if `yarn checkall` fails.** Fix all issues first.

## Running Checks

```bash
# Full check (REQUIRED before commit)
yarn checkall

# Code checks only (no tests)
yarn checkcode

# Run tests
yarn test

# Run tests with coverage
yarn test --coverage
```

## Ignored Directories

The following directories are excluded from linting:

- `out/`
- `build/`
- `coverage/`
- `assemble/`
- `lre*.js` files in root
