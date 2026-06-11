# Research Notes: Dan Abramov (gaearon)

## Sources Consulted

### Primary
- Overreacted.io (57 blog posts, full catalog retrieved)
- GitHub profile: github.com/gaearon
- Overreacted.io source repository: github.com/gaearon/overreacted.io

### Blog Posts Fetched & Analyzed
1. A Complete Guide to useEffect
2. Writing Resilient Components
3. What Are the React Team Principles?
4. Before You memo()
5. Goodbye, Clean Code
6. The WET Codebase
7. The Elements of UI Engineering
8. Things I Don't Know As of 2018
9. Algebraic Effects for the Rest of Us
10. The Bug-O Notation
11. npm audit: Broken by Design
12. How to Fix Any Bug
13. The Two Reacts (via search results)
14. React for Two Computers
15. How Imports Work in RSC
16. Why Do React Hooks Rely on Call Order?
17. Making setInterval Declarative with React Hooks
18. React as a UI Runtime
19. Why Do React Elements Have a $$typeof Property?

### Podcasts & Interviews
- Kent C. Dodds: "Realigning Your Model of React After Hooks With Dan Abramov"
- devtools.fm: "Dan Abramov - Bluesky, Core React Team, RSC, Strict Dom"
- PodRocket: "JSX over the wire with Dan Abramov"
- PodRocket: "Web without walls with Dan Abramov"
- Software Engineering Unlocked: "Bad Tests Are Worse Than Product Issues"
- JS Party #311 transcript

### Other
- Just JavaScript course analysis (with Maggie Appleton)
- Redux Three Principles documentation
- Multiple web searches for his expertise, gotchas, philosophy, communication style
- Bluesky / AT Protocol / Open Social advocacy content

---

## Biographical Context

- **Name:** Dan Abramov
- **GitHub:** gaearon (90.8k followers)
- **Website:** danabra.mov
- **Roles held:** React Core Team (Meta, 2015-2023), Bluesky developer (2023-2025), Independent consultant (2025-present)
- **Notable projects:** Co-author of Redux, Create React App, React Hot Loader, React DevTools
- **Education:** Self-taught; dropped out of university
- **Current focus:** UI engineering consulting, AT Protocol ecosystem, open social advocacy

---

## Core Philosophical Beliefs

### 1. UI is a Function of State
The foundational mental model: UI = f(state). Every UI is a computation over current state, like frames in a movie. React lets you write an `if` per state rather than managing transitions between states manually.

### 2. Understand the Types of State (Not Libraries)
The most important question is WHAT KIND of state, not WHICH LIBRARY:
- **UI State** (form inputs, focus, selected tabs) -> useState/useContext. No external library.
- **Server Cache** (API data) -> React Query, Apollo, Relay. These are data synchronization problems, not state management.

### 3. Developer Experience IS User Experience
False dichotomy. Better DX leads to better products. Drove Redux (debugging), React Hot Loader (live editing), CRA (accessibility), DevTools.

### 4. Prefer Direct Code Over Indirection
Evolution from mixins -> HOCs -> render props -> Hooks reflects reducing indirection. "Write code that you can read and understand without mental gymnastics."

### 5. React is "Functional-Lite" — Not Strictly FP
Borrows FP ideas (composability, immutability) but code looks like normal JavaScript. "If you need a loop, you write a loop."

### 6. Framework Over Manual Configuration
Recommends Next.js over raw React — framework handles data fetching, routing, SSR, code splitting in a unified paradigm.

### 7. Understand the "Why" Before the "How"
Read GitHub issues like a blog. Build fluency from commits, issues, PRs. "Most new things are iterations on existing ideas."

---

## Key Technical Expertise Areas

### useEffect Mental Model
- **Synchronization, not lifecycle.** Effects sync React tree with outside systems based on current props/state.
- **Each render has its own everything:** props, state, event handlers, effects are all constants captured by closures.
- **Be honest about dependencies.** Every value from component scope used inside effect belongs in deps array. Omitting = "lying to React."
- **Strategies for honest deps:**
  1. Functional updates: `setCount(c => c + 1)` (eliminates state-reading deps)
  2. `useReducer`: decouples action descriptions from state transitions. dispatch is stable.
  3. Move functions inside effects (makes deps explicit)
  4. `useCallback` for functions that must stay in component
- **Race conditions:** Use cleanup flag (`didCancel`) for async effects.
- **Cleanup runs AFTER re-render and paint**, not before. Each cleanup captures its own render's scope.
- **Skipping deps is NEVER the fix for infinite loops.** Address root cause (function recreation, missing useCallback).

### Component Design Principles
1. **Don't stop the data flow:** Never copy props into state. Props must flow through rendering, side effects, and optimizations.
2. **Always be ready to render:** Parent re-renders shouldn't break children. Avoid derived state from props.
3. **No component is a singleton:** Test by rendering app twice; global state cleanup on mount/unmount is fragile.
4. **Keep local state isolated:** "If this component was rendered twice, should this interaction reflect in the other copy?" — answer determines where state lives.
5. **Before reaching for memo(), restructure first:** Move state down, lift content up via `children`. These improve data flow; perf is "a cherry on top."

### RSC Mental Model (The Two Reacts)
- **Two paradigms:** `UI = f(state)` (client interactivity) and `UI = f(data)` (server data access). RSC unifies: `UI = f(data, state)`.
- **Components vs. Primitives:** Components (capitalized) are "brains" — they embed children without introspecting. Primitives (lowercase) are "muscles" — they introspect arguments and must run last.
- **Two-phase execution:** 1) Interpret (run Components outside-in, dissolve to Primitives), 2) Perform (run Primitives inside-out).
- **`import tag`** is the "door" between worlds — provides a reference to code without bringing it in.
- **A closure over the network:** A single function spanning two computers, the second part can see the first part's values, but data flows strictly forward.
- **Poison pills** (`server-only`/`client-only`) propagate transitively, preventing code from reaching wrong environment.
- **Directives** (`'use client'`/`'use server'`) create crossing points. Don't put on all modules — only boundary modules.
- **Build failures are a feature** — they force architectural decisions about where code belongs.

### Redux Principles
1. **Single source of truth:** Whole app state in one store object tree. Enables undo/redo and SSR.
2. **State is read-only:** Only changed by dispatching actions. Centralized, ordered, no race conditions.
3. **Changes made with pure reducers:** `(prevState, action) => nextState`. Pure functions, no mutations, no side effects.

### Performance Philosophy
- Don't reach for `memo()`/`useMemo()` first. Restructure first: move state down, lift content up via `children`.
- Verify you're on production build before profiling.
- Use React DevTools Profiler to identify expensive re-renders, then sprinkle `memo()`.
- Framework overhead is ~2-10% vs application code. Real gains come from architecture.

### Debugging Methodology
1. **A repro is non-negotiable.** Reliable, specific: what to do, what's expected, what actually happens.
2. **Systematic deletion (bisection):** Remove things one at a time while bug persists. At every step, bug still reproduces. Keep reducing surface area.
3. **Verify new repros correlate with original.** Test that a known fix works on both.
4. **Don't chase theories — stay grounded.** Forming isolated test cases that no longer exhibit the bug is a trap. Always return to original repro.
5. **Progress guaranteed.** Like well-founded recursion, you must always make incremental progress and the repro must keep getting smaller.
6. **The end state:** Either you've isolated your own bug, or you've found a dependency bug.

### Code Organization Philosophy
- **Clean code is a heuristic, not a goal.** "Let clean code guide you. Then let it go."
- **DRY can be harmful.** "Strict adherence to removing all duplication inevitably leads to software we can't understand."
- **Abstraction trades flexibility for reduced duplication** — that trade can be a net loss.
- **Code should be optimized for CHANGE, not for looking clean.** Think about how it evolves with a team over time.
- **WET codebases:** Some intentional duplication is better than opaque abstractions.

---

## Communication & Teaching Style

### Metaphor-Driven
Uses vivid, memorable metaphors to explain abstract concepts:
- UI = frames in a movie (each render is a snapshot)
- Variables = wires (not boxes) pointing to values
- Primitives = immutable stars, Objects = mutable planets
- Components = brains (embed), Primitives = muscles (do)
- Tags = blueprints, Functions = recipes
- Effects = synchronization with data flow
- Hooks = variables in the UI programming language

### Meta-Cognitive Approach
- Teaches you to think ABOUT how you think. Draws on Kahneman's "slow vs fast thinking."
- Focuses on rebuilding mental models, not teaching syntax.
- "A misunderstanding that could be fixed in ten minutes can cause problems for years."

### Intellectual Honesty
- Famous post: "Things I Don't Know As of 2018" — lists 24+ topics he admits ignorance about.
- Normalizes incompleteness for senior engineers.
- Values transferable meta-skills (learning how to learn) over breadth.
- Knowledge gaps are neutral, not shameful: "I can fill them in later if I become curious."

### Writing Voice
- Conversational, accessible, patient.
- Uses first-person narrative and personal stories (late-night refactoring, boss asking to revert).
- Self-deprecating humor.
- Starts with concrete examples, builds to abstract principles.
- Each post has ONE core thesis, explored deeply.
- "Bug-O" notation framework: invents simple conceptual tools for evaluating tools/APIs.

---

## Gotchas & Warnings (Dan Abramov Canon)

### useEffect Gotchas
1. `useEffect(fn, [])` !== `componentDidMount`. They capture different things.
2. Lying about dependencies leads to stale closures.
3. Don't think of useEffect as "after render" like componentDidUpdate.
4. Removing dependencies is never the fix for infinite loops.
5. Functions defined in component change on every render.

### Component Design Gotchas
1. Never copy props into state (causes staleness).
2. Custom `shouldComponentUpdate` or `React.memo` comparisons often forget function props.
3. `componentWillReceiveProps` creates brittle components relying on accidental timing.
4. Global state cleanup on mount/unmount — breaks with multiple component instances.
5. Hoisting state higher than necessary causes surprising cross-component synchronization.

### RSC Gotchas
1. Server components cannot provide instant interactivity.
2. Pure-client components can't use server-only APIs.
3. You shouldn't put `'use client'` in ALL frontend modules or `'use server'` in ALL backend modules.
4. `frontend/` and `backend/` directories can be misleading — boundaries are in modules, not folders.
5. Direct manipulation needs zero roundtrips (elevator button vs. door handle).

### Performance Gotchas
1. Development builds are intentionally slower — sometimes 10x.
2. Not checking state placement before profiling.
3. Custom comparison functions becoming stale when new props are added.

### General Gotchas
1. Rewriting code without discussion damages trust — even if the change is "better."
2. Abstractions pulled "out of thin air" in response to repetition can be harmful.
3. Tests should test public APIs, not internal implementation details. Bad tests are worse than product issues.
4. npm audit produces overwhelming false positives for front-end tooling — context-blind scanning.

---

## Notable Shifts in His Thinking

| Earlier Position | Later Refinement |
|---|---|
| Container/Presentational pattern (2015) | Walked back — too rigid; boundaries should be based on interfaces and customization needs |
| Redux for all state | Use React built-ins for UI state; dedicated cache libraries for server data |
| Concurrent Mode as separate mode | Evolved into mechanism (transitions, lanes) — opt-in per update, not global |
| Clean code as goal | Let clean code guide you. Then let it go. |

---

## Threads Across All His Work

1. **Local reasoning:** APIs should let developers work on code with only local knowledge. Deleting/changing should be safe and predictable.
2. **Progressive complexity:** Avoid fork-in-the-road designs. Simple implementations should structurally resemble complex ones.
3. **Absorb complexity internally:** Libraries should take on complexity so users don't have to.
4. **Hacks then idioms:** Provide escape hatches, observe what hacks emerge, eventually build idiomatic solutions.
5. **Trust the theory:** If another approach makes more sense in theory, invest in it long-term, even if it takes years.
6. **Contain the damage:** When standards slip, limit negative effects. Users pay for features they use.
7. **UI before API:** Start with desired UX, work backward to abstraction.
