# Dan Abramov's Blog Content (overreacted.io)

Dan Abramov is the co-author of Redux, creator of React Hot Loader, Create React App, and a former React core team member at Facebook/Meta (2015-2023). He later worked at Bluesky. He is known for deep technical writing that combines first-principles thinking with personal narrative.

## Key Posts and Content

### Core Philosophy: "Goodbye, Clean Code"
Dan used to believe that removing duplication was always an improvement. He believed "Clean code is not a goal. It's an attempt to make some sense" of complexity. Now he believes: "Let clean code guide you. Then let it go."

When encountering repetitive code, Dan's heuristic is: before abstracting, ask whether the change makes future requirement shifts harder or easier. His key insight is that abstraction has a cost — he traded "the ability to change requirements for reduced duplication" and later needed special cases that were easy in the messy version but convoluted in his clean one.

He references Sandi Metz's work on the "wrong abstraction" — pulling abstractions out of thin air when you see repetition is seductive but dangerous before you understand the requirements. Dan warns: don't confuse aesthetic qualities with engineering outcomes. Beauty and elegance are not metrics.

His meta-advice: "Obsessing with 'clean code' and removing duplication is a phase many of us go through." The danger is attaching identity to it — "I'm the kind of person who writes clean code." The real test is how code evolves with a team over time, not how it looks in isolation.

### The Two Reacts: UI = f(data)(state)
Dan proposed the unified formula UI = f(data)(state), where:
- React One (client-side): UI = f(state) — components run on the user's computer for instant interactivity
- React Two (server-side): UI = f(data) — components run on the creator's computer, reading files/databases directly

His decision heuristic: choose runtime by data dependency, not habit. If a component reads filesystem or database resources, it must run server-side. If it maintains interactive client state, it must run client-side. The environment follows the data source.

### useEffect: Synchronization, Not Lifecycle
Dan's foundational mental model shift: "useEffect lets you synchronize things outside of the React tree according to our props and state."

Key gotcha: "If you're trying to write an effect that behaves differently depending on whether the component renders for the first time or not, you're swimming against the tide!"

The most pervasive mistake is omitting real dependencies from the dependency array. Each render has its own props and state — the count constant inside any particular render doesn't change over time. Every render gets its own isolated snapshot.

For race conditions with async data fetching, Dan recommends the didCancel pattern: set a flag in the effect cleanup that the async handler checks before setting state.

His two strategies for honest dependencies: (1) Include all used values in the dependency array, or (2) Restructure code so it needs fewer dependencies using functional updater form (setCount(c => c + 1)) or useReducer which he calls "the cheat mode of Hooks."

Dan warns: "While you can useEffect(fn, []), it's not an exact equivalent" of componentDidMount. Unlike componentDidMount, the effect captures initial props and state. "It's only after I stopped looking at the useEffect Hook through the prism of the familiar class lifecycle methods that everything came together for me."

### Before You memo(): Performance Wisdom
Dan's ordered approach to performance: (1) Use a production build first — development builds are intentionally slower. (2) Don't lift state higher than necessary — putting input state in a centralized store often backfires. (3) Only then use the Profiler and apply memo() selectively.

Two patterns that make memoization unnecessary: (1) Move State Down — extract the part that cares about changing values into its own component. (2) Lift Content Up — pass expensive subtrees as children props so React can skip visiting them when the parent re-renders.

Dan's heuristic: when state is used by a wrapper/parent element but not by certain children, lift those children up into the props of the stateful component rather than nesting them inside it. If removing an optimization breaks a component, it was too fragile.

### npm audit: Broken by Design
Dan argues that npm audit suffers from a 99%+ false positive rate for frontend build tools. The core problem is treating every reported vulnerability as equally relevant regardless of how a dependency is actually used.

His specific gotcha: "Vulnerability" does not equal actual risk. A ReDoS in a build-time CSS parser is not a threat if the parser never touches untrusted input. Always ask: Can an attacker influence the input that reaches this code path?

npm audit fix --force is worse than useless — Dan reports it "downgraded the main dependency to a three-year-old version with actual real vulnerabilities."

His proposed philosophy: "If you don't trust my judgement, why are you running my code on your computer?" Package maintainers should be able to mark vulnerabilities as irrelevant in their specific context.

### Writing Resilient Components: Four Principles
1. Don't Stop the Data Flow — props and state can change at any time; components must reflect those changes. Never copy props into state as that "ignores all updates."
2. Always Be Ready to Render — "Your component should be ready to re-render at any time." Don't build timing assumptions. Stress test: add setInterval(() => this.forceUpdate(), 100) in the parent.
3. No Component Is a Singleton — even if you think a component renders only once, design as if it could appear twice. Stress test: render <><MyApp /><MyApp /></> and see if things break.
4. Keep the Local State Isolated — ask yourself: "If this component was rendered twice, should this interaction reflect in the other copy?" If no, it's local state.

### Things I Don't Know as of 2018
Dan listed over 20 technical domains where he had significant gaps, including Unix/Bash, C, Rust, networking, Docker, Kubernetes, microservices, Node backends, algorithms, functional programming (monads, monoids), modern CSS, TypeScript, DevOps, CORS, GraphQL, and more.

His humility framework: "People often assume that I know far more than I actually do." Confidence fluctuates wildly depending on environment, teammates, time of day, and mental state. Having gaps doesn't negate expertise — "Experienced developers have valuable expertise despite knowledge gaps." The true skill isn't knowing everything — it's being able to "learn technologies when I need them."

### The WET Codebase
Dan argues that rigid DRY (Don't Repeat Yourself) inevitably leads to software we can't understand. His heuristic: from "eliminate all duplication" to "abstract only when the duplicated logic represents a stable, understood concept whose variations are known." Before that point, tolerate duplication to preserve comprehensibility. Duplication as readability — some repetition makes code easier to follow. Premature abstraction forces readers to jump between layers. Every extraction introduces indirection.

### The "Bug-O" Notation
Dan coined "Bug-O" notation: what is the Bug-O(n) of your API? Some APIs make bugs proportional to code size (O(n)), others make bugs constant regardless of code size. An API with poor Bug-O requires vigilance at every call site, while a well-designed API makes the correct thing the default.

### React as a UI Runtime
Dan's comprehensive model of React: "React is a UI runtime." Components are functions that receive props and return UI. Rendering should be pure — during render, you only calculate what the next UI should look like without side effects. He describes React as a "pseudo programming language" where components = functions, hooks = variables.

### Why Isn't X a Hook?
When asked why some features aren't hooks, Dan explains: "Just because we can, doesn't mean we should." Hooks should solve real problems with clear use cases. Adding a hook for everything creates API surface without proportional value.

### Making setInterval Declarative with React Hooks
Dan demonstrates how to write a useInterval hook that makes intervals declarative. Key insight: use refs to hold the callback so it always uses the latest version without resetting the interval. This pattern teaches when refs are the right escape hatch versus when dependencies should be honest.

### Coping with Feedback
Dan openly discusses the emotional difficulty of receiving feedback on open source work. "Sometimes I can't fall asleep" after negative reactions. He frames this as normal and provides strategies for processing feedback without letting it overwhelm you.

### Algebraic Effects for the Rest of Us
Dan introduces algebraic effects as a mental model for understanding React Suspense and concurrent features. They generalize try/catch — instead of only throwing errors upward, you can "throw" any effect that resumes where it left off. "They're not burritos" (referencing the monad tutorial meme).

### How Are Function Components Different from Classes?
Dan explains that function components capture the rendered values — they "see" the props and state from the render they were created in, while classes always read this.props which can change. This is a fundamental difference, not just syntax.

### A Chain Reaction
Dan explores the relationship between programming language expressiveness and what kinds of programs you can conceive. "The limits of my language mean the limits of my world" — paraphrasing Wittgenstein.
