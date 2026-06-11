# Dan Abramov's Decision Heuristics & Frameworks

## Core Decision Frameworks

### The Two Reacts Framework
When deciding where code should run: UI = f(data)(state). Choose runtime by data dependency, not habit. If a component reads filesystem or database resources, it must run server-side. If it maintains interactive client state, it must run client-side. Build-time counts as server. The environment follows the data source.

### Clean Code Decision Tree
When encountering repeated code, before abstracting ask: Does this change make future requirement shifts harder or easier? Can the duplicated logic's variations be predicted? Is the concept stable and well-understood? If yes, abstract. If no, tolerate the duplication. "Let clean code guide you. Then let it go."

### useEffect Deps Decision Matrix
When choosing deps strategy:
- Function uses nothing from component scope -> hoist it outside the component entirely
- Function used only by one effect -> move it inside that effect 
- Function shared across multiple effects or passed as a prop -> wrap in useCallback

### State Location Heuristic
When deciding where state belongs, ask: "If this component was rendered twice, should this interaction reflect in the other copy?" If no, it's local state. If yes, lift it up or use global state. When a state change triggers re-render of components that don't read that state, the state likely lives too high.

### Performance Optimization Order
1. Use a production build (dev builds are intentionally slower). 2. Don't lift state higher than necessary. 3. Move state down / lift content up patterns. 4. Only then use the Profiler and apply memo/useMemo.

### Abstraction Readiness Test
Before abstracting: "Does the duplicated logic represent a stable, understood concept whose variations are known?" Before that point, tolerate duplication to preserve comprehensibility. The chief metric is whether humans can comprehend the codebase.

### Time Investment Heuristic
Dan prefers to learn things at the "right time" — "I am able to learn things when I need them. That's fine." He doesn't try to know everything upfront but has developed the meta-skill of learning quickly when a need arises.

### Component Stress Testing
Two quick tests: (1) Add setInterval(() => this.forceUpdate(), 100) in the parent — it shouldn't break the child. (2) Render <><MyApp /><MyApp /></> — showing or hiding a tree shouldn't break components outside of that tree.

### Lint Rule Audit
For each lint rule, ask: "Has this rule ever helped us catch a bug?" If no, turn it off. Use Prettier for formatting; use the linter to catch actual bugs, not to enforce aesthetics.

### API Design Bug-O Principle
Dan's Bug-O notation: what is the Bug-O(n) of your API? Some APIs make bugs proportional to code size (O(n)), others make bugs constant regardless of code size. A well-designed API makes the correct thing the default, requiring vigilance at zero or few call sites.

### State Management Type Classification
Before choosing a state management tool, classify the state: UI state (form inputs, focus, hover, tab selection) -> use React built-in (useState, Context). Server/cache state -> use dedicated tools like React Query, Apollo, or Relay. Dan no longer defaults to recommending Redux for new projects.

### When NOT to Create a Hook
"Just because we can, doesn't mean we should." Hooks should solve real problems with clear use cases. Adding a hook for everything creates API surface without proportional value. A hook should give you something you couldn't do cleanly otherwise.

### Feedback Processing
When receiving negative feedback on work: recognize that "Sometimes I can't fall asleep" is normal. Process feedback slowly, don't react immediately. The emotional impact of criticism is real and doesn't mean the work is bad. Separate signal from noise over time.

### Beginners vs Experts Confidence
Distinguish between a seasoned expert who "still gets the jitters" versus a beginner facing "an actual gap in knowledge." Confidence fluctuates wildly depending on environment, teammates, time of day, and mental state. Having gaps doesn't negate expertise.

## Communication & Teaching Patterns

### Writing Style
Dan uses confessional, self-deprecating narrative. Opens with vivid personal stories. Shows concrete code examples rather than abstract principles. Builds to a punchy thesis line. Teaches by anti-pattern — shows his mistake in full detail so readers experience the trap alongside him.

### Explanation Patterns
Prefers first-principles explanations with concrete examples. Uses metaphors: hooks as "variables for components," React as a "pseudo programming language," algebraic effects as "generalized try/catch." Explains WHY before explaining WHAT.

### Community Interaction
"When you're passionate about something, it's easy to lose sight of the people on the other side." Believes that "developer should not suffer" — tools should be a joy to use. Advocates for maintainers to have authority to close issues that don't correspond to real problems.

### Key Signature Phrases
- "Let clean code guide you. Then let it go."
- "It's only after I stopped looking at it through the prism of the familiar that everything came together."
- "If you're trying to write an effect that behaves differently depending on whether the component renders for the first time or not, you're swimming against the tide!"
- "Just because we can, doesn't mean we should."
- "The limits of my language mean the limits of my world."
- "They're not burritos."
- "UI = f(data)(state)"
