# Dan Abramov (gaearon) — Research Notes

## Identity

- **Full Name:** Dan Abramov
- **GitHub:** [gaearon](https://github.com/gaearon) (90.8k followers, 174 following, 296 public repos)
- **Personal Site:** [overreacted.io](https://overreacted.io) / [danabra.mov](https://danabra.mov)
- **Bluesky:** @danabra.mov
- **X/Twitter:** @dan_abramov2
- **Pronunciation:** His handle "gaearon" reads as "Dan" in Russian keyboard mapping (Дан → g-a-e, А → a, etc.)

## Career Timeline

| Period | Role / Achievement |
|--------|-------------------|
| ~2014 | First React project at Stampsy (a "Like" button); built react-hot-loader |
| 2015 | Created **Redux** for ReactConf Europe demo (time-travel debugging); joined Facebook/Meta React Core Team in London |
| 2016 | Co-created **Create React App**; spoke at React Europe ("The Redux Journey") |
| 2017-2018 | Core contributor to React 16 "Fiber" rewrite; key co-designer of Hooks |
| 2019-2021 | Drove Concurrent Rendering / Transitions; co-designed React Server Components; led react.dev documentation rewrite |
| 2022-2023 | Primary author of the new react.dev docs; left Meta in July 2023 |
| 2023-2025 | Joined Bluesky (client apps in React/Expo, AT Protocol); left Bluesky mid-2025 |
| 2025-present | Independent UI engineering consultant; continued React open source work; exploring Lean theorem prover / formal methods |

## Major Contributions

### 1. Redux (2015)
Created in a frantic sprint for a ReactConf demo. Introduced a predictable state container with time-travel debugging. Became the de facto state management solution for React for years. Later stepped away from it, urging developers not to reach for it by default.

### 2. React Hot Loader (2014)
First major open source project. Tweak React components in real time without losing state. Deprecated in favor of Fast Refresh, but established the pattern.

### 3. Create React App (2016)
Co-created with the React team to solve "boilerplate hell." Zero-config React starter kit. Later deprecated as React ecosystem evolved toward frameworks (Next.js, Remix).

### 4. React 16 "Fiber" Rewrite (2017-2018)
Complete internal rewrite of React's reconciliation engine. Enabled incremental rendering, interruption, and priority-based scheduling. Co-authored with Andrew Clark, Sebastian Markbage, and others.

### 5. React Hooks (2018-2019)
Co-designer and primary advocate. Introduced `useState`, `useEffect`, `useContext`, `useReducer`, `useMemo`, `useCallback`, `useRef`, etc. Fundamental shift from class components to function components.

### 6. React 18 Concurrent Features (2021-2022)
Drove the shift from "Concurrent Mode" as a separate mode to built-in concurrency via `startTransition`, `useTransition`, `useDeferredValue`, Suspense improvements.

### 7. React Server Components (RSC) (2020-2024)
Co-authored the RFC. Explained the concept through a series of blog posts on overreacted.io (20+ posts on RSC from 2023-2024). Created RSC Explorer tool in 2025 to help developers understand the RSC protocol.

### 8. react.dev Documentation Rewrite (2023)
Primary author of the completely new React docs site. Considered this one of his most important contributions before leaving Meta.

### 9. Overreacted.io Blog (2018-present)
~57 deep-dive posts on React internals, JavaScript fundamentals, UI engineering philosophy, open social protocols, and personal reflections. Widely regarded as some of the best technical writing in the front-end ecosystem.

### 10. whatthefuck.is (2020)
Opinionated glossary of computer science terms for front-end developers. No PRs accepted — single-voice, opinionated explanations with code examples.

## Technical Philosophy

### UI is a Calculation
"UI is a function of state. Rendering is supposed to be pure — you compute what the next UI should look like, nothing else."

### The Two Reacts
`UI = f(data)(state)` — components that run on the server (near data) vs. components that run on the client (near user interaction). The challenge is splitting the function across environments without two different Reacts.

### Functional-Lite, Not Pure FP
React borrows from functional programming (composability, immutability) but developers still write plain JavaScript loops and conditionals. Not Ramda or Lodash FP.

### Deliberate API Design
"React would rather not ship a feature until we know we can do it right — even if it takes years." Compare to Apple's iOS approach vs. Android's ship-fast approach.

### Test Against Public API
After the React 16 rewrite, learned to write tests only against public API (ReactDOM.render, etc.), never internal modules. Public API tests validated the rewrite was correct; internal unit tests were useless.

### Don't Over-Abstract State Management
- **UI state** (inputs, toggles, tabs) → built-in useState/useContext
- **Server cache** (API data) → React Query, Apollo, Relay
- **URL state** → router
- Don't reach for Redux by default

### The WET Codebase
Anti-"DRY" philosophy. "Goodbye, Clean Code" — clean code is not an identity; it's a tool. Duplication is often cheaper than the wrong abstraction. "Let clean code guide you. Then let it go."

### System-Level Thinking
Solve related problems in a unified way rather than point solutions. Connect data fetching, code splitting, and animations into a single conceptual model rather than separate APIs.

### Radical Transparency
Published regular React Core team meeting notes. Wrote extensively and publicly about decisions. Engaged deeply with community on GitHub and social media.

### Humble Expertise
"Things I Don't Know as of 2018" — publicly admitting knowledge gaps without devaluing expertise. "Helping people with their issues is the best way to contribute to React."

## Writing / Communication Style

### Tone
- Conversationally direct: "Suppose I want to display something on your screen."
- Self-deprecating humor: admits he didn't count words himself, "got carried away"
- Witty and playful: blog post titles like "npm audit: Broken by Design" (subtitle: "Found 99 vulnerabilities (84 moderately irrelevant, 15 highly irrelevant)")
- Personable and warm: shares personal updates, mentions emotional side of engineering ("Coping with Feedback")

### Rhetorical Techniques
- **Punchy one-liner subtitles:** "They're not burritos," "Come waste your time with me," "Two worlds, two doors"
- **Pop culture references:** Pokemon, Dr. Strangelove, Christmas songs
- **Clever wordplay:** "Bug-O Notation" (with a bug emoji), "The WET Codebase"
- **Everyday analogies:** Elevator buttons vs. door handles for latency, LEGO blocks for composability
- **Dramatic questions:** "But wait — *whose* computer should they run on?"
- **Parenthetical asides:** "(Build-time counts as 'server'.)"
- **Provocative framing:** Each post structured around a single question or insight

### Teaching Approach
- **Code-first:** Every concept anchored in concrete, runnable code examples
- **Bottom-up:** Explain from first principles, not from assumptions
- **Pattern over prescription:** Shows the why, not just the how
- **Admits complexity:** Doesn't pretend things are simple when they're not
- **Reader empathy:** Writes for the person who is confused, not the person who already understands

### Communication Values
- Don't dumb things down, but use plain language
- Be opinionated and take clear stances
- Explain why a concept matters for everyday work, not just what it is theoretically
- Maintain a single consistent voice (reject community PRs on definitions for whatthefuck.is)
- Acknowledge when you're wrong or uncertain

## Current Interests (as of 2025-2026)
- React Server Components architecture and adoption
- AT Protocol and open social protocols (from experience at Bluesky)
- Lean theorem prover and formal verification ("The Math Is Haunted")
- The social filesystem concept ("A Social Filesystem")
- Consulting on UI architecture and open-source sustainability
