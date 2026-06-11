# Research Notes: Dan Abramov (gaearon)

## Sources Consulted

- https://overreacted.io/ (primary blog)
- GitHub: https://github.com/gaearon
- Web searches for interviews, podcast appearances, conference talks
- "A Complete Guide to useEffect" (overreacted.io)
- "Writing Resilient Components" (overreacted.io)
- "Before You memo()" (overreacted.io)
- "Algebraic Effects for the Rest of Us" (overreacted.io)
- "Goodbye, Clean Code" (overreacted.io)
- "What Are the React Team Principles?" (overreacted.io)
- "The Two Reacts" (overreacted.io / Frontend Masters summary)
- "React for Two Computers" (ReactConf 2024 talk)
- Podcast appearances: PodRocket, How About Tomorrow?, Devtools.fm, Chats with Kent
- Chinese community translations and analyses
- Sebastian De Deyne's interpretation of "The Two Reacts"

---

## Biography

- **Born and raised in Russia.** Started programming at ~12 after discovering Visual Basic inside Microsoft PowerPoint.
- Attended university in 2009 but **dropped out after first year** — found courses uninteresting.
- First job: $18k/year as software developer; then volunteered on a project to learn Git, Python, Django, CSS, JavaScript.
- ~2012: Worked at **Stampsy** in Moscow ($30k/year), building iPad apps.
- 2014: Discovered React while converting an iPad app to the web; began contributing.
- 2014: Co-created **Redux** with Andrew Clark, demoed at ReactConf.
- 2015-2023: **React Core Team at Meta** (Facebook), London office. Described role as "community glue."
- 2016: Created **Create React App**.
- 2017: Shipped **React 16**.
- 2023: Left Meta (~July 2023), continued on React team as Independent Engineer.
- ~2023-2025: Joined **Bluesky** to build the open social network client apps with React/React Native.
- ~Summer 2025: Left Bluesky, now works as an independent **UI engineering consultant**.

## Key Contributions

1. **Redux** — co-creator. Defined predictable state management for React ecosystem.
2. **Create React App** — zero-config React project bootstrapper (now deprecated in favor of frameworks).
3. **React Core Team** — 7 years, shipped React 16, React 18, Hooks, Concurrent Mode/Suspense.
4. **React Documentation Rewrite** — led the react.dev rewrite with modern, hook-centric docs.
5. **Overreacted.io** — technical blog that defined the mental model for hooks, effects, and React philosophy.
6. **React Hot Loader** — early hot module replacement pioneer.
7. **Redux DevTools** — time-travel debugging.

## Writing Style & Voice

Dan's writing is characterized by:
- **Deep "why" orientation**: He always explains the rationale, never just the API.
- **Mental model focus**: He builds new mental models rather than just listing facts.
- **Conversational and honest**: Admits mistakes, shows personal journey (e.g., "Goodbye, Clean Code").
- **Uses vivid metaphors**: "Algebraic effects are resumable try/catch", "UI is a calculation", "the dependency array is a promise."
- **Patient and thorough**: Goes step-by-step, assumes reader intelligence but not prior knowledge.
- **Pragmatic over dogmatic**: Rejects "clean code" as a dogma, values evolution over aesthetics.
- **Self-deprecating humor**: Calls things "a stretch," admits when he's still learning.

---

## Core Philosophy & Mental Models

### 1. "UI is a Calculation" (Rendering Should Be Pure)
UI = f(state). A component render is a computation of what the UI should look like. No side effects in render. Render is not the right place for mutations, subscriptions, timers, etc.

### 2. React as a Pseudo-Language
Components ≈ functions in a programming language. Hooks ≈ variables — they let functions record state and behavior. Thinking this way makes the component model intuitive.

### 3. "Functional-Lite" (Not Strict FP)
React borrows FP ideas (composition, immutability) but you write normal JavaScript. No monads, no category theory. Prefers direct, readable code over fancy FP abstractions.

### 4. Hooks as a Replacement for Render Props / HOCs
- Mixins → naming clashes
- HOCs → untraceable props, indirection
- Render Props → nesting pyramids ("wrapper hell")
- Hooks → direct, composable, no false hierarchy

### 5. Distinguish State Types Before Choosing Tools
| State Type | Tool |
|---|---|
| UI State (toggles, inputs, tabs) | useState + useContext |
| Server Cache (API data) | React Query, Apollo, Relay |
| Complex Client State | Redux (only if genuinely needed) |

### 6. Developer Experience (DX) is User Experience
Great DX is not a luxury — it directly impacts what gets built and how fast. Created Redux DevTools, React Hot Loader, and Create React App based on this principle.

### 7. Prefer Direct Code Over Indirection
Code should be readable without mental gymnastics. Avoid excessive HOC wrapping. Prefer explicit composition. Every prop's origin should be traceable.

### 8. Systems Over Point Solutions
React solves related problems with a unified theoretical approach — data fetching, code splitting, animations are treated as interconnected, not isolated concerns.

### 9. Frameworks > Manual Configuration
Use Next.js or similar frameworks. They handle routing, data fetching, SSR, code splitting. Developers should focus on components, not boilerplate.

### 10. The Two Reacts (Server + Client)
- **Client React**: UI = f(state) — mutable, interactive state in the browser.
- **Server React**: UI = f(data) — immutable server data transformed into UI.
- Server Components run exclusively server-side, access databases directly, send only rendered output.
- "React for Two Computers" — unidirectional server-to-client flow.

### 11. Concurrency is Default
Concurrent features (transitions, batching, Suspense) are not opt-in modes — they're the runtime becoming inherently async. Enables non-blocking rendering and background state updates.

### 12. Stability Over Hype
React doesn't need to "stay competitive" against Svelte/Solid — the component model is durable. Virtual DOM is about feature enablement (server component merging, animation interpolation), not raw performance.

---

## useEffect Knowledge (from "A Complete Guide to useEffect")

### Core Mental Model
**Effects are synchronization, not lifecycle.** Forget componentDidMount/Update/Unmount. useEffect synchronizes your component with external systems based on props and state.

### "Each Render Has Its Own Everything"
Every render gets its own isolated: count, event handlers, effect functions. A function "captures" the props/state of the render that defined it. This is why stale closures exist — and why class components (which mutate this.state) behave differently and often buggier.

### The Dependency Array is a Promise
- Dependencies tell React what the effect uses from render scope.
- Must include EVERY reactive value used.
- Lying about deps causes stale closures and silent bugs.
- eslint-plugin-react-hooks with exhaustive-deps is ESSENTIAL, not optional.

### Dependency Reduction Strategies (Do NOT lie about deps)
1. **Functional state updates**: `setCount(c => c + 1)` removes need for `count` in deps.
2. **useReducer**: `dispatch` is stable; "cheat mode of Hooks."
3. **Move functions inside the effect** so they don't introduce external deps.
4. **Hoist functions outside component** if they use no props/state.
5. **useCallback** for functions shared across places or passed as props.

### Race Conditions
Class-based async fetching inherently race-condition-prone. Effects don't fix this magically. Use a cancel boolean in cleanup: `let cancelled = false;` then `return () => { cancelled = true; };`.

### Cleanup Functions See "Old" Values
The cleanup runs after new render commits to DOM but BEFORE new effect runs. It sees the props/state from the render that defined it — correct and intentional for cleanup.

### Final Advice on useEffect
- useEffect is a low-level primitive. Community will build higher-level hooks on it.
- Goal: "think in effects" — synchronization reacting to changing props/state, not one-off lifecycle actions.
- Ask: "what state does this effect need to synchronize with?" not "when should this effect run?"

---

## Resilient Component Design (from "Writing Resilient Components")

### 1. Don't Stop the Data Flow
- Never copy props into state — creates stale values. Read props directly.
- Side effects must re-run when deps change. useEffect makes this explicit.
- Optimizations (memo, shouldComponentUpdate) must not silently break updates.

### 2. Always Be Ready to Render
- Components should not introduce timing assumptions.
- Don't treat "receiving props" as a special event.
- Stress test: `setInterval(() => forceUpdate(), 100)` on parent — child shouldn't break.

### 3. No Component is a Singleton
- Assume multiple instances will exist.
- Don't reset global state in componentWillUnmount (or useEffect cleanups).
- Stress test: render the app twice. Unmounting one shouldn't break the other.

### 4. Keep Local State Isolated
- Litmus test: "If this component rendered twice, should interaction reflect in the other copy?"
- Local: expanded/collapsed states, input values.
- Not local: post content, comment lists — belong in cache or state manager.

---

## Performance Philosophy (from "Before You memo()")

### BEFORE reaching for memo/useMemo:
1. **Move state down** — extract state-dependent parts into their own component. Isolates re-renders to only the subtree that needs them.
2. **Lift content up** — pass expensive non-changing subtrees as `children`. Same children prop reference = no re-render.
3. Only THEN use Profiler and sprinkle memo's.

Both structural approaches simplify data flow as a side effect. The performance gain is a "cherry on top."

---

## React Team Principles (from Dec 2019)

1. **UI Before API** — Start with desired UX, work backward to the abstraction.
2. **Absorb the Complexity** — Make internals complex so product code stays simple.
3. **Hacks, Then Idioms** — Provide escape hatches, observe usage, eventually build idioms.
4. **Enable Local Reasoning** — Changes should be safe with only local knowledge.
5. **Progressive Complexity** — Complex thing shouldn't require different structure than simple thing.
6. **Contain the Damage** — When things go wrong, React should limit the blast radius.
7. **Trust the Theory** — If an approach is fundamentally limited, pivot early even if it takes years.

---

## Software Craft Philosophy (from "Goodbye, Clean Code")

- Dogmatic "clean code" often stems from insecurity — attaching self-worth to measurable traits.
- Abstraction can trade flexibility for DRYness — bad trade when requirements change frequently.
- Don't rewrite teammates' code without discussion — destroys trust.
- Focus on how code EVOLVES with a "team of squishy humans," not how it LOOKS in isolation.
- "Let clean code guide you. Then let it go."

---

## Algebraic Effects & React

- Algebraic effects = "resumable try/catch." Perform an effect, handler above catches it, resumes with a value.
- Advantage over async/await: no "function color" problem — intermediate functions don't need to know about the effect.
- **Suspense**: read() throws a Promise when data is not cached. React catches and retries. Intermediate components don't know about async loading.
- **Hooks**: conceptually echo algebraic effects. useState() is like a state effect handled by React above.
- Both Suspense and Hooks leverage React's idempotent rendering model.

---

## Key Gotchas & Anti-Patterns (Compiled from multiple sources)

### useState Gotchas
- Copying props into state creates stale values — prefer reading props directly or using derived state.
- State updates are batched in React 18+ event handlers — don't rely on synchronous reads of just-set state.
- Functional updates (`s => s + 1`) are safer when new state depends on old.
- Don't store derived values in state — compute at render time or use useMemo.

### useEffect Gotchas
- Empty `[]` deps as "run once" lying about dependencies causes stale closures.
- setInterval with stale count: use functional update or useReducer.
- Async race conditions: use cancel flag in cleanup.
- Cleanup sees "old" props — not a bug, it's by design.
- eslint-plugin-react-hooks/exhaustive-deps is mandatory.

### Performance Gotchas
- React.memo wrapping a component that receives inline functions/objects as props is wasted — the props change every render.
- useMemo/useCallback don't come free — they have allocation cost. Only use for expensive computation or reference stability.
- Moving state down / lifting content up often solves performance issues better than memo.

### Architecture Gotchas
- Making local state global causes surprising synchronization and unnecessary re-renders.
- Components that can't handle multiple instances are fragile.
- Timing-dependent code breaks when React's rendering schedule changes.
- Over-abstraction for DRYness can make the codebase harder to evolve.

### State Management Gotchas
- Using Redux for server cache state — use React Query/Apollo/Relay instead.
- Using Redux for simple UI state — useState is sufficient.
- Each state category has a natural home. Don't fight the categories.

---

## Dan's Current Views (2024-2025)

- **React Server Components are a genuine paradigm shift**, not just SSR rebranded.
- **Full-stack React** as the 2025 norm — frameworks like Next.js App Router and TanStack Start lead.
- Two implementation paths: Next.js (server-first) vs TanStack Start (client-first with server features).
- Works at the intersection of product engineering and framework design — now dogfooding React at Bluesky (formerly).
- Deeply interested in open social protocols (AT Protocol / Bluesky).
- **JSX over the wire** — APIs returning JSX components directly, inverting traditional data flow.
- **Strict Dom** — applying React mental model to CSS/styling.
