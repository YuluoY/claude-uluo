# GitHub Profile: gaearon (Dan Abramov)

**Bio:** Creator of Redux, React core team alumnus (2015-2025). Co-author of Create React App.

**Followers:** 90.8k | **Following:** 174
**Website:** danabra.mov
**Bluesky:** @danabra.mov

**Organizations:** reactjs, babel, styled-components, react-dnd, cssinjs, stampsy

## Key Repositories Maintained

### reactjs/react (246k stars)
The library for web and native user interfaces. Dan was a key maintainer throughout React 16-19, driving the Hooks API, Concurrent Mode, and Server Components architecture.

### reactjs/react.dev (11.8k stars)
The React documentation website. Dan was instrumental in rewriting the React docs with a Hooks-first approach.

### bluesky-social/social-app (18k stars)
The Bluesky Social application for Web, iOS, and Android. Dan contributed significantly post-Meta.

### teorth/analysis (1.8k stars)
A Lean companion to Analysis I — Dan's foray into formal verification/mathematics.

## Other Notable Repos
- **reduxjs/redux**: Predictable state container (Dan's co-creation)
- **facebook/create-react-app**: Zero-config React toolchain (Dan co-authored)
- **react-dnd/react-dnd**: Drag and Drop for React (Dan created)
- **overreacted.io**: His blog source code (Next.js, Tailwind CSS, TypeScript)

## Code Patterns from Public Work

### 1. Clarity over cleverness
Dan's code prioritizes readability. He favors explicit patterns over abstractions unless the abstraction demonstrably improves evolutionary flexibility. He wrote "Goodbye, Clean Code" to warn against premature abstraction.

### 2. Functional composition
Heavily influenced by functional programming concepts applied pragmatically:
- Model UI as `f(state)` rather than imperative mutations
- Push side effects to the edges (useEffect for synchronization)
- Prefer immutable data patterns

### 3. Mental model-driven API design
Dan's code designs always start from the mental model, not the syntax:
- useEffect is "synchronization," NOT "lifecycle events"
- Hooks are about "reusing stateful logic," not "sharing component code"
- Server Components are about "splitting f across two environments," not "making servers faster"

### 4. Escape hatches over dogma
React design explicitly includes escape hatches (useRef, findDOMNode deprecation, mutable refs) because Dan believes frameworks should empower developers, not constrain them. "Hacks, Then Idioms."

### 5. TypeScript transition
While Dan famously said in 2018 he'd never learned TypeScript, his recent repos (overreacted.io, Bluesky contributions) use TypeScript extensively, showing his principle of "learning technologies when I need them."

### 6. Progressive disclosure in documentation
Dan's documentation follows: (1) Show the happy path, (2) Explain the mental model, (3) Reveal gotchas, (4) Offer escape hatches. Never starts with complexity.
