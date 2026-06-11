# Dan Abramov (gaearon) Research Notes

## Biography & Career

- **Full name**: Dan Abramov
- **GitHub**: gaearon (id: 810438), 58 public repos
- **Blog**: overreacted.io
- **Origin**: Russian-born, later moved to UK, now based in US
- **Self-taught**: Started with PowerPoint/VB6, moved through C#/.NET, landed in JavaScript
- **Dropped out** of formal education, found paid work more motivating

### Career Timeline
- **2014**: Created react-hot-loader (12.2k stars), react-document-title
- **2015**: Created Redux (with Andrew Clark), joined React core team at Meta
- **2016**: Co-created Create React App; passed Redux maintainership to Mark Erikson/Tim Dorr
- **2015-2023**: React core team (~8 years) — shipped React 16 (Fiber), Hooks (16.8), Suspense, RSC
- **2023**: Left Meta after ~8 years
- **2024**: Joined Bluesky — building with React (web) and React Native (mobile), first production React Native experience
- **2025**: Continued Bluesky work; occasional React open source PRs; wrote about RSC architecture

## Technical Expertise

### React Core Contributions
- **React 16**: Fiber architecture rewrite
- **Hooks** (useState, useEffect, useReducer, useCallback, useMemo, useRef, useContext)
- **Suspense** and concurrent rendering
- **React Server Components (RSC)**: paradigm shift enabling server-client composability
- **Create React App**: standardized React project bootstrapping
- **React Hot Loader**: hot module replacement for React (now deprecated in favor of Fast Refresh)

### Redux
- Co-created the most popular state management library for React
- Key design decisions: single store, reducer functions, middleware pattern, combineReducers
- Authored foundational issues: algebraic effects for side effects, simplified middleware signature, shape-agnostic combineReducers, ImmutableJS integration

### Other Notable Projects
- **rscexplorer** (1.1k stars, 2025): Tool for exploring RSC protocol
- **whatthefuck.is** (3k stars): Opinionated CS glossary for front-end devs
- **subliminal** (624 stars): Minimal VS Code theme
- **react-side-effect**, **react-proxy**, **react-pure-render**: utility libraries
- **suspense-experimental-github-demo**: Render-as-you-fetch with Suspense

## Core Philosophy

### Anti-Dogma Pragmatism
- **"Goodbye, Clean Code"**: Argues that over-refactoring for DRY leads to brittle abstractions that resist change. Clean code is a phase, not a destination.
- **"The WET Codebase"**: Duplication can be better than premature consolidation. Code that repeats can be more readable because each instance tells its own story.
- **"Optimizing for Change"**: Prefer code that's easy to change over code that's "clean" by dogma. Measure engineering outcomes, not aesthetic qualities.

### Mental Models Over Memorization
- **"A Complete Guide to useEffect"**: Don't think in lifecycles (mount/update/unmount) — think in synchronization. Each render has its own props, state, handlers, and effects.
- **"Before You memo()"**: Composition (moving state down, lifting content up) solves more problems than memoization. Use Profiler before reaching for memo.
- **"The Two Reacts"**: UI = f(state) (client) and UI = f(data) (server) are competing paradigms that need reconciliation.
- **"React for Two Computers"**: Tags are "potential function calls" — call-as-data, not call-as-execution. Components embed, Primitives introspect.

### Developer Experience First
- "Building tools for humans" — prioritizing DX over theoretical purity
- Believes complex framework internals should simplify app developer experience
- Advocates for convention over configuration (Create React App philosophy)

## Coding Patterns

### Do
```jsx
// Use functional updaters to avoid stale closures
setCount(c => c + 1);  // instead of setCount(count + 1)

// Move functions inside effects when only used there
useEffect(() => {
  function fetchData() { /* uses id */ }
  fetchData();
}, [id]);

// Use useReducer when effect depends on multiple state values
const [state, dispatch] = useReducer(reducer, initialState);

// Controlled or uncontrolled with key — nothing in between
<Input value={value} onChange={setValue} />
<Input key={resetKey} defaultValue="" />

// Move state down to isolate re-renders
function Form() {
  const [color, setColor] = useState('white');
  return <><ColorPicker color={color} onChange={setColor} /><ExpensiveTree /></>;
}

// Lift content up via children
function ColorPicker({ children }) {
  const [color, setColor] = useState('white');
  return <div style={{ color }}>{children}</div>;
}

// Race condition handling in effects
useEffect(() => {
  let didCancel = false;
  async function fetch() {
    const result = await API.fetch(id);
    if (!didCancel) setData(result);
  }
  fetch();
  return () => { didCancel = true; };
}, [id]);
```

### Don't
```jsx
// DON'T: Copy props into state
const [color, setColor] = useState(props.color); // ignores prop updates

// DON'T: Lie about dependencies
useEffect(() => { /* uses count */ }, []); // stale closure

// DON'T: Compute derived data in state
const [fullName, setFullName] = useState(first + ' ' + last);

// DON'T: Custom shouldComponentUpdate that skips function props
shouldComponentUpdate(nextProps) {
  return nextProps.color !== this.props.color; // misses function prop changes
}

// DON'T: Use componentWillReceiveProps to sync state
componentWillReceiveProps(nextProps) {
  this.setState({ color: nextProps.color }); // breaks under animation
}

// DON'T: Global cleanup/mount in singleton assumption
componentWillUnmount() {
  this.props.resetForm(); // breaks when second instance unmounts
}

// DON'T: Handle @@INIT action — it's an internal Redux detail
```

## Communication Style

### Tone & Voice
- **Conversational and narrative-driven**: Opens with personal stories ("It was a late evening...")
- **Self-deprecating**: Calls his past actions "aghast"-inducing, admits confusion
- **Socratic questioning**: Challenges reader assumptions rather than lecturing
- **Permission-giving**: "Let clean code guide you. Then let it go."
- **Community-oriented**: Credits others, invites discussion ("tell me what your teammates thought!")
- **Emotionally honest**: Openly discusses failures, crying after rejection, panic attacks

### Structural Patterns
- **Progressive disclosure**: Start simple, add complexity layer by layer
- **Iterative problem-solving**: Present pain point, show obvious fix, reveal more elegant alternative
- **Living examples**: Interactive CodeSandbox embeds, not static code blocks
- **Aha-moment driven**: "I've since had a few 'aha' moments I want to share with you"
- **Constraint-first thinking**: Identify the limitation, then let it guide the solution

### Technical Communication
- Explains the "why" before the "how"
- Uses accessible analogies (elevator buttons vs door handles, Google Docs, Excel)
- Shows both the mental model AND the concrete code
- Reveals tradeoffs rather than prescribing absolutes
- Anticipates objections and addresses them head-on
- Rehearses talks 3-15 times ("The more polished my talk looked, the calmer I felt")

## Gotchas He Frequently Warns About

1. **Stale closures in useEffect** — caused by lying about dependencies
2. **Copying props into state** — silently ignores parent updates
3. **Custom shouldComponentUpdate** — easily misses function prop changes
4. **componentWillReceiveProps for syncing** — relies on accidental timing
5. **Singleton assumptions** — components that break when rendered twice
6. **Global state for local concerns** — input values, UI state that shouldn't sync
7. **Premature DRY** — abstractions that resist future requirements
8. **Handling @@INIT** in Redux reducers — breaks hot reloading
9. **Race conditions in async effects** — cancellation flags required
10. **Dev mode performance** — can be an order of magnitude slower than production

## Bluesky Era (2024-2025) Patterns

From his Bluesky commit messages:
- Descriptive, problem-first commit titles: "[Fix Logouts] Persist accounts synchronously"
- Collaborative commit style: co-authored-by tags, PR references
- Practical focus: thread jumps, logouts, navigation updates, third-party feed interactions
- Working across React (web) and React Native (mobile) simultaneously
- First time building production React Native — openly discussed learning curve

## Sources
- GitHub: https://github.com/gaearon (58 repos, top repos analyzed)
- Blog: https://overreacted.io (analyzed: goodbye-clean-code, a-complete-guide-to-useeffect, writing-resilient-components, the-two-reacts, before-you-memo, the-wet-codebase, my-decade-in-review, react-for-two-computers)
- Redux issues: analyzed top issues by reactions (side effects, combineReducers, middleware, router integration)
- Bluesky commits: analyzed 5 recent commits to bluesky-social/social-app
- Podcasts: devtools.fm (April 2024), How About Tomorrow (Sep 2024), PodRocket (Feb & Apr 2024, May 2025)
- Wikipedia: Redux (JavaScript library)
