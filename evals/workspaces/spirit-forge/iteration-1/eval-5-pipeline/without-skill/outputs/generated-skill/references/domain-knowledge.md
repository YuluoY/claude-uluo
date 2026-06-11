# Domain Knowledge: React, Redux, and Frontend Architecture

## React Hooks Deep Dive

### useEffect: The Synchronization Model

Forget `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`. They are NOT the mental model.

Every render captures its own:
- Props and state (constants in that render's scope)
- Event handlers (each "version" sees the state from its render)
- Effects (the function itself is different on every render)

The dependency array is a performance optimization, not a semantic tool. React compares each dependency with `Object.is` to decide whether to re-run. But logically: the effect should be able to run on every render and produce the same result. If it can't, your dependencies are wrong.

**The fundamental rule**: Every value from inside your component that's used by the effect MUST be in the dependency array. The `exhaustive-deps` lint rule catches this automatically. Don't suppress it without understanding exactly why.

**Stale closure example**:
```jsx
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // count is always 0 in this closure
    }, 1000);
    return () => clearInterval(id);
  }, []); // LIE: uses count but doesn't declare it
}
```

**Correct fixes** (choose one):
```jsx
// Option A: Declare the dependency
useEffect(() => { ... }, [count]);

// Option B: Functional updater (no dependency needed)
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

### useReducer as "Cheat Mode"

When your effect depends on multiple state values, `useReducer` decouples actions from dependencies:

```jsx
const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

useEffect(() => {
  const id = setInterval(() => {
    dispatch({ type: 'tick' }); // dispatch is stable
  }, 1000);
  return () => clearInterval(id);
}, []); // no state dependencies needed
```

`dispatch` is guaranteed stable across renders (like `setState` from `useState`). Reducers can access fresh props because they run during the next render, not inside the effect.

### useCallback: Making Functions Participate in Data Flow

Only needed when:
1. A function is passed as a prop to a memoized child, OR
2. A function is used by multiple effects

```jsx
const fetchData = useCallback((query) => {
  // ...
}, [query]); // changes when query changes

useEffect(() => {
  fetchData('react');
}, [fetchData]); // correctly depends on fetchData
```

### Race Condition Handling

Effects don't magically solve race conditions. Cleanup is the answer:

```jsx
useEffect(() => {
  let didCancel = false;

  async function fetchArticle() {
    const article = await API.fetchArticle(id);
    if (!didCancel) {
      setArticle(article);
    }
  }

  fetchArticle();
  return () => { didCancel = true; };
}, [id]);
```

## Component Design Principles (from "Writing Resilient Components")

### Principle 1: Don't Stop the Data Flow

Props and state can change at any time. Your component must handle those changes.

**Anti-pattern: Copying props into state**
```jsx
// WRONG
function Message({ color }) {
  const [localColor, setLocalColor] = useState(color);
  // ...
}
// Correct: rename prop to signal intent
function Message({ initialColor }) {
  const [color, setColor] = useState(initialColor);
}

// Or: fully controlled
function Message({ color, onChange }) {
  // ...
}
```

**Anti-pattern: Stale computed values**
```jsx
// WRONG: derived data in state that doesn't recalculate
const [fullName, setFullName] = useState(first + ' ' + last);

// CORRECT: compute during render or useMemo
const fullName = useMemo(() => first + ' ' + last, [first, last]);
```

**Anti-pattern: Ignoring prop changes in side effects**
```jsx
// WRONG: componentDidUpdate might miss state changes
componentDidUpdate(prevProps) {
  if (this.props.query !== prevProps.query) {
    this.fetchResults(); // but what about currentPage changes?
  }
}

// CORRECT: useEffect with explicit deps catches everything
useEffect(() => {
  fetchResults(query, currentPage);
}, [query, currentPage]);
```

### Principle 2: Always Be Ready to Render

There's no meaningful difference between initial render and updates. A component receiving new props is NOT a special event — it's just rendering.

**Stress test**: Add `setInterval(() => this.forceUpdate(), 100)` in the parent during development. If your component breaks, you have a bug.

**Anti-pattern: componentWillReceiveProps for syncing**
```jsx
// WRONG: relies on accidental timing
componentWillReceiveProps(nextProps) {
  this.setState({ color: nextProps.color }); // breaks if parent adds animation
}
```

### Principle 3: No Component Is a Singleton

Even if you only render a component once today, design as if there could be two.

**Anti-pattern: Global cleanup in unmount**
```jsx
// WRONG: resets Redux state when ANY instance unmounts
componentWillUnmount() {
  this.props.resetForm();
}
```

**Stress test**: Render `<MyApp />` twice in `ReactDOM.render` and check for crashes.

### Principle 4: Keep Local State Isolated

Ask: "If I rendered this component twice, should this interaction reflect in the other copy?" If no, the state is local.

**Local**: Input values, expanded/collapsed UI state, hover state, animation state
**Not local**: Post content (editing one should update the other), comment list (new comment should appear in both)

Moving state to its correct location is the single most impactful performance optimization in React.

## Before You memo()

### Pattern 1: Move State Down

```jsx
// BEFORE: SlowTree re-renders when color changes
function App() {
  const [color, setColor] = useState('white');
  return (
    <div style={{ color }}>
      <input value={color} onChange={e => setColor(e.target.value)} />
      <ExpensiveTree />
    </div>
  );
}

// AFTER: Extract stateful part into child
function Form() {
  const [color, setColor] = useState('white');
  return (
    <>
      <ColorInput color={color} onChange={setColor} />
      <ExpensiveTree /> {/* isolated from color state */}
    </>
  );
}
```

### Pattern 2: Lift Content Up

```jsx
// BEFORE: ExpensiveTree re-renders when color changes
function ColorPicker() {
  const [color, setColor] = useState('white');
  return (
    <div style={{ color }}>
      <ExpensiveTree />
    </div>
  );
}

// AFTER: Pass ExpensiveTree as children
function App() {
  return (
    <ColorPicker>
      <ExpensiveTree /> {/* same reference across re-renders */}
    </ColorPicker>
  );
}

function ColorPicker({ children }) {
  const [color, setColor] = useState('white');
  return <div style={{ color }}>{children}</div>;
}
```

When `ColorPicker` re-renders, `children` is the same React element reference from `App`, so React doesn't visit that subtree at all.

## React Server Components (RSC) Mental Model

### The Two Worlds

**Early world (Server)**: Runs first. Can read files, query databases. Produces the initial output tree.
**Late world (Client)**: Runs later. Handles interactivity. Receives the tree from the server.

Data flows one way: Early -> Late. Information that needs to go backward must be serializable.

### Components vs Primitives

| Components | Primitives |
|---|---|
| Capital-letter names (`<Post>`) | Lowercase names (`<p>`, `<div>`) |
| EMBED arguments without introspection | INTROSPECT arguments |
| Timeless — can run in any order | Must run in order (inside-out) |
| Can be split across server/client | Must run together at the end |
| Produce tags (potential function calls) | Perform actual operations |

This is the key insight: Components embed their children without inspecting them. A Component like `<PostLayout>` can wrap a Client Component `<LikeButton>` on the server — it doesn't need to execute the function, just reference it.

### Two-Phase Execution

```
interpret (Server): Components -> Primitives + Late Component Refs
  (outside-in: resolves Components down to "atoms")

perform (Client): Primitives -> DOM / Native Views
  (inside-out: executes the actual operations)
```

The server's `interpret` function dissolves Components into their Primitives and Late Component references. It ships this "plan" to the client, which then executes it.

### The "closure over the network" pattern

A function that returns * the rest of itself * as serializable data:

```js
function greeting() {
  const name = prompt('Who are you?');
  return function resume() {
    alert('Hello, ' + name);
  };
}
// Split across machines: server runs first part,
// ships the second part (a serialized function reference + data) to client
```

## Redux Architecture

### Reducer Composition

Reducers are just functions: `(state, action) => state`. They compose via `combineReducers`:

```js
const todoApp = combineReducers({
  todos,
  visibilityFilter,
});
```

Each reducer manages its own slice. The parent delegates actions to children and reassembles the state object.

### Middleware Signature

Middleware wraps dispatch: `({ dispatch, getState }) => (next) => (action) => { ... }`

- `dispatch` and `getState` are store-level
- `next` is the next middleware in the chain (or the original dispatch)
- Return value flows backward through the chain

### Action Design

Actions are plain objects with a `type` field. They describe "what happened," not "what to do":

```js
// Good: describes an event
{ type: 'ARTICLE_LIKED', articleId: 42 }

// Bad: describes an imperative command
{ type: 'UPDATE_LIKE_COUNT', articleId: 42 }
```

### When to Use Redux (Dan's Heuristic)

1. You have a lot of state that changes over time
2. The update logic is complex (not simple setState)
3. The state is shared across many components
4. You need middleware for side effects, persistence, etc.
5. You benefit from devtools (time-travel debugging)

If you only have #3, consider lifting state up to a common ancestor first. Redux adds indirection — only add it when the benefits outweigh the costs.

## Build Tooling Philosophy

Dan's approach to build tools (from Create React App):
- **Zero config by default** — make it work out of the box
- **One dependency** — hide Webpack, Babel, ESLint behind a single package
- **Eject as escape hatch** — let users take control when they outgrow defaults
- **Convention over configuration** — prescribe a project structure that works for 80% of use cases
- **The tooling should be boring** — app developers shouldn't think about Webpack configs

## Gotchas Reference

1. **Dev mode is slow**: Development builds are intentionally slower, sometimes by an order of magnitude. Always verify performance in production builds.
2. **Stale closures**: The most common useEffect bug. Always caused by lying about dependencies.
3. **Accidental global state**: Moving state to Redux that should be local creates coupling between unrelated components.
4. **@@INIT in Redux**: Never handle this action. It fires on every hot reload. Your initial state transformation should happen in the reducer default case or before passing to createStore.
5. **useEffect infinite loops**: Caused by: (a) missing deps causing stale reads and unintended updates, or (b) a dependency that changes identity on every render (objects, arrays, functions). Solution: stabilize with useMemo/useCallback, or restructure.
6. **Custom comparators are dangerous**: `React.memo` with a custom comparator easily misses function prop changes. Default shallow comparison is safer.
7. **Props in state**: If you absolutely must, rename the prop to `initialX` or `defaultX` to signal that subsequent updates are ignored.
