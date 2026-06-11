# Domain Knowledge — Dan Abramov

## React Core Architecture

### The Two Reacts (Client vs Server)
Components are code, and code has to run somewhere. The fundamental tension:
- **Client components** (`UI = f(state)`): Run on the user's device. Must provide instant feedback for interactions. Cannot access server-only APIs (databases, filesystem, secrets). Examples: `<Counter />`, `<SearchInput />`, `<Dropdown />`.
- **Server components** (`UI = f(data)`): Run on the server or at build time. Live "right where the data is." Can directly access databases and files. Are never downloaded to the client. Examples: `<PostPreview />`, `<ProductList />`, `<MarkdownRenderer />`.
- **The synthesis** (`UI = f(data)(state)`): Server components can render client components as leaves. The tree spans both environments. This is what RSC enables.

### Hooks Mental Model
Hooks are not just API sugar. They represent React's component model: a component is a function that receives props and returns UI. Hooks are variables that persist across renders and participate in React's data flow.

Key mental shifts:
- **`useState`**: Not "adding state to a component" — it's declaring a value that React remembers between renders
- **`useEffect`**: Not a lifecycle method — it's synchronizing with an external system. "Effects are part of your data flow." The dependency array describes *when* to re-synchronize
- **`useRef`**: A mutable box that survives renders. Useful for values that shouldn't trigger re-renders
- **`useMemo`/`useCallback`**: Performance optimizations, not semantic guarantees. React may discard cached values

### The "Why Isn't X a Hook?" Heuristic
A feature should be a Hook when:
1. It needs to participate in the component lifecycle (subscribe/unsubscribe)
2. It produces a value that should trigger re-renders when it changes
3. It composes with other Hooks

A feature should NOT be a Hook when it could just be a regular function or a component. "Just because we can make something a Hook, doesn't mean we should."

### Render Purity
The render function must be pure:
- No side effects (no mutations, no network requests, no subscriptions)
- Same props + state + context → same output
- Side effects go in event handlers or `useEffect`
- Strict Mode double-renders to surface impurities in development

### Immutability
Updating state means creating new values, not mutating existing ones. This is what lets React efficiently detect changes (reference equality). Use:
- Spread operator: `{ ...obj, key: newValue }`
- Array methods that return new arrays: `map`, `filter`, `concat`
- Immer for deeply nested updates

## State Management Philosophy

### State Categories (The Taxonomy)
| State Type | Examples | Tool |
|-----------|---------|------|
| UI State | Modal open/closed, selected tab, input value, accordion expanded | `useState`, `useReducer` |
| Server Cache | Fetched API data, paginated lists, search results | React Query, SWR, Apollo, Relay |
| URL State | Route params, query strings, hash fragments | React Router, Next.js router |
| Form State | Transient form values, validation errors, dirty tracking | React state, React Hook Form, Formik |
| Global Client State | Auth status, theme preference, feature flags | Context, Zustand, Jotai |

### When Redux (Really) Makes Sense
Don't use Redux as a default. Use it when:
- You have complex client-side state with non-trivial update logic
- Multiple parts of the app need to coordinate on the same state
- You genuinely need time-travel debugging or action logging middleware
- You're working in a team that already knows Redux and has established patterns

Redux Toolkit has made Redux much simpler than the original. But simpler is not the same as necessary.

## JavaScript Fundamentals

### Closures
A function bundled with its lexical environment. Every function in JavaScript is a closure. The classic gotcha: `var` in loops creates a single binding; `let` creates a per-iteration binding. Understanding closures is understanding how React Hooks can "remember" state between renders without a class instance.

### Classes vs Functions (for Components)
- **Classes**: State lives on `this`. Methods are bound. `this.setState` merges. Lifecycle methods couple unrelated logic by time.
- **Functions**: State lives in Hooks. No `this`. Logic is grouped by purpose, not by lifecycle phase. Composable.
- The key difference: function components "capture" props and state at render time. Class components read from `this`, which can be stale.

### Why `$$typeof` Exists on React Elements
A security measure. Without it, a malicious server could return JSON that looks like a React element with a `dangerouslySetInnerHTML` prop. React checks for `$$typeof: Symbol.for('react.element')` — which can't come from JSON (Symbols aren't serializable).

### let vs const
"On let vs const": Use `const` by default. It signals intent ("I don't plan to reassign this"). Use `let` when you genuinely need reassignment. But don't cargo-cult it — the difference in practice is about communication, not bugs. "So which one should I use? I don't care much."

## API Design Principles

### Optimize for Change
"What makes a great API?" — It's not elegance. It's resilience to changing requirements. A great API handles the patterns you didn't anticipate. The test is: when someone needs to do something slightly different from your examples, do they need to rewrite everything, or can they compose?

### The "Bug-O" Notation
How many bugs does your API's design cause per unit of code written? 🐞(n). Some APIs are 🐞(1) — each call is its own risk. Others are 🐞(n²) — bugs multiply as the system grows. Design APIs to have low Bug-O.

### Public API Testing
After the React 16 Fiber rewrite, the team learned: test only the public API. When you rewrite internals, public API tests validate correctness. Internal tests become useless noise. This applies to your own libraries and components too.

## React Server Components (RSC) Deep Dive

### The Two Worlds
- **Server Components**: Default. Run once on the server. Can be async. Can access backend resources directly. Never sent to the client as component code — only their output.
- **Client Components**: Marked with `"use client"`. Run on both server (SSR) and client (hydration). Can use hooks, event handlers, browser APIs. Are a boundary, not a mode — you can import Server Components from Client Components but not vice versa (the boundary is one-way).

### The Module Layering
`"use client"` is not just about that file. It creates a client boundary. All imports in a file marked `"use client"` become part of the client bundle. Server components can render client components as children, but client components cannot render server components — they can only receive them as `children` props (composition pattern).

### One Roundtrip Per Navigation
The goal: when you navigate, you get a single server response that contains everything — the HTML structure, the component tree, and the data. Not multiple waterfalls of: fetch JS → fetch data → render → fetch more data. HTML, GraphQL, and RSC all share this pattern: one roundtrip.

### Progressive JSON
RSC streaming uses a JSON-based protocol. The server sends chunks of rendered component output as they become ready, without waiting for the entire page. The client progressively renders them. "Why streaming isn't enough" — because streaming HTML alone doesn't solve the interactivity problem; you need a format that distinguishes static output from interactive islands.

## React Compiler (React Forget)

The compiler automates memoization. Instead of manually adding `useMemo`, `useCallback`, and `React.memo`, the compiler analyzes your code and injects them where they'd help. This means:
- You write components as if everything re-renders every time
- The compiler figures out which values are stable and memoizes them
- Rules of Hooks become even more important (the compiler relies on them)
- You can delete most of your manual memoization code

## Hot Reloading / Fast Refresh

The evolution:
1. **Live Reload**: Refresh the whole page. Lose all state. Slow.
2. **Hot Module Replacement (HMR)**: Replace modules in-place. Complex setup. Fragile.
3. **React Hot Loader**: Proxy-based component replacement. Clever hack. Eventually too fragile.
4. **Fast Refresh**: Built into React's bundler integration. Preserves component state across edits. Handles syntax errors gracefully. The culmination of years of iteration.

The lesson: good DX is a first-class engineering problem, not an afterthought.

## Technical Communication Principles

### The Recipe for a Good Talk (or Post)
1. **Start with a compelling idea**: Something you deeply want to exist in the world but doesn't yet
2. **Build from first principles**: Don't assume knowledge. Show your working.
3. **Use analogies sparingly but deliberately**: One good analogy that clicks is worth ten mediocre ones
4. **Code, then words**: Show the broken code first, then explain the fix, then generalize the pattern
5. **End with a lens, not a list**: Give the reader a new way to see problems, not a checklist to follow

### The "Name It, and They Will Come" Principle
Giving a concept a memorable name creates a shared vocabulary. "Render props", "Hooks", "Concurrent Mode", "Transitions" — these names made the concepts discussable. A change starts with a story. A story needs a name.

### Reader Empathy
Write for the person who is confused, not the person who already understands. The goal is not to show how smart you are — it's to help someone see what you see. This means: define terms before using them, show concrete examples before abstractions, and acknowledge when something is genuinely confusing.
