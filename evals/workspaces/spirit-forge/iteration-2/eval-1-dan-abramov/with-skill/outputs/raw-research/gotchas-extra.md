# Dan Abramov's Gotchas & Anti-Patterns

## React-Specific Gotchas

### useState Stale Closure Trap
Common mistake: using state variable directly in setInterval with empty deps array. The count variable is captured from the first render and never updates. Fix: use functional updater form setCount(c => c + 1) which eliminates the dependency entirely. Every render gets its own isolated snapshot of props and state.

### useEffect Empty Deps Trap
While you can useEffect(fn, []), it's not an exact equivalent of componentDidMount. Unlike componentDidMount, the effect captures initial props and state. If you're trying to write an effect that behaves differently depending on whether the component renders for the first time or not, you're swimming against the tide.

### Copying Props Into State
This "ignores all updates" to the prop. If you must do it, use initialColor/defaultColor naming to signal the intent. Storing computed values in state forces a second re-render on every change.

### Custom shouldComponentUpdate That Skips Function Props
You may mistakenly forget to compare function props. Method identity is often stable in classes (masking the bug), but with hooks, functions are new each render, making the problem visible immediately.

### useCallback Dependency Chain Trap
When a parent passes a function to a child that uses it in an effect, every link in the chain must have correct dependencies. Omission at any level creates stale closures.

### Race Conditions with Async in useEffect
The classic pitfall: fetching {id: 10}, switching to {id: 20}, but the response for {id:10} arrives second, overwriting the {id:20} data. Fix: use the didCancel pattern — set a flag in the cleanup that the async handler checks before setting state.

### Functions as Effect Dependencies
A function defined inside a component changes on every render. If you list it as a dependency, it triggers effects too often. If you omit it, you risk stale closures. Solution: hoist outside component, move inside effect, or wrap in useCallback.

### Global State Cleanup in componentWillUnmount
Even if you think a component renders only once, design as if it could appear twice. Global state reset on unmount breaks when two copies of a component exist. Showing or hiding a tree shouldn't break components outside of that tree.

### Using componentWillReceiveProps to Reset Local State
This "relies on accidental timing." If a parent starts re-rendering more often (for animation), the child's state gets blown away. Even wrapping in PureComponent doesn't help if other props change frequently.

### Derived State Confusion
Ask: is this value fully controlled (read props directly), fully uncontrolled (keep local state, reset via key), or truly derived? Most cases fit the first two categories.

## Code Organization Gotchas

### Premature Abstraction
Removing duplication without understanding requirements creates rigid structures that make future changes harder than the original duplication would have. Dan's rule: abstract only when the duplicated logic represents a stable, understood concept whose variations are known.

### Abstraction Has a Cost
Every extraction introduces indirection. The question isn't "can I deduplicate this?" but "does the abstraction pay for itself in clarity?" Some repetition makes code easier to follow. Premature abstraction forces readers to jump between layers.

### DRY as Dogma
Rigid DRY adherence inevitably leads to software we can't understand. Dan's shift: from "eliminate all duplication" to "tolerate duplication until patterns stabilize." The chief metric is whether humans can comprehend the codebase, not duplication counts.

### Rewriting Teammate's Code Unilaterally
Rewriting someone else's code without their input destroys trust. Talk before you refactor. Healthy teams build trust, not unilateral cleanup.

### Aesthetic Code Judgment
Don't confuse aesthetic qualities with engineering outcomes. Beauty and elegance are not metrics. Ask: can you name concrete engineering outcomes corresponding to those qualities?

## Security & Tooling Gotchas

### npm audit's False Positive Problem
npm audit has a 99%+ false positive rate for frontend build tools. A ReDoS in a build-time CSS parser is not a threat if the parser never touches untrusted input. Always trace the actual dependency path before reacting to vulnerability reports.

### npm audit fix --force Dangers
npm audit fix --force is worse than useless — it can downgrade main dependencies to versions with actual real vulnerabilities while "fixing" irrelevant issues.

### Security Theater vs Actual Security
Tools that train people to ignore warnings will lead to actually bad vulnerabilities slipping in unnoticed. npm treats every reported vulnerability as equally relevant regardless of how a dependency is actually used.

## Testing & Quality Gotchas

### Bad Tests Are Worse Than Product Issues
Dan believes bad tests actively harm development velocity. Tests that are brittle, test implementation details, or require constant rewriting create more drag than value.

### Formatting vs Bug-Catching Lint Rules
Use Prettier for formatting; use the linter to catch bugs before they happen, not to enforce aesthetics. Audit each lint rule: "Has this rule ever helped us catch a bug?" If not, turn it off.

### Performance Optimization Timing
Don't optimize prematurely. First: use a production build (development builds are intentionally slower). Second: don't lift state higher than necessary. Only then use the Profiler and apply memo/useMemo selectively.

### memo with Custom Comparator for Behavior Control
React.memo and shouldComponentUpdate are for performance only. If removing an optimization breaks a component, it was too fragile — you were relying on rendering behavior for correctness.

## State Management Gotchas

### Putting Everything in Global State
Not all state belongs in a global store. Ask: "If this component was rendered twice, should this interaction reflect in the other copy?" If no, it's local state. Keeping truly local state out of global stores fixes a large class of performance issues.

### State Lifted Too High
If a state change triggers a re-render of components that don't read that state, the state likely lives too high. Move it down into the component that actually needs it.

### Missing the children Pattern for Performance
When state is used by a wrapper but not by certain children, pass those children as props rather than nesting them inside. React can then skip visiting that subtree during re-renders without any memo needed.
