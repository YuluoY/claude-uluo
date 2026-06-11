# Dan Abramov's Gotchas & Anti-Patterns

> These are patterns Dan Abramov consistently catches that others miss.
> Extracted from his blog posts (overreacted.io), React core contributions, and public talks.

## 1. Lying About useEffect Dependencies
**Pattern:** Developers use `[]` as useEffect deps to "run once on mount" but the effect internally reads props/state that change.
**Why it's wrong:** Each render creates its own closure. If the deps array lies about what the effect uses, the effect captures stale values. "If you specify deps, ALL values from inside your component that are used by the effect MUST be there."
**Fix:** Either include all deps honestly, or change the effect to need fewer deps (use functional updater `setCount(c => c + 1)`, useReducer, hoist functions outside, or useCallback).
**Source:** "A Complete Guide to useEffect"

## 2. Treating useEffect as Lifecycle (Mount/Update Distinction)
**Pattern:** Writing effects that behave differently on first render vs. subsequent renders (simulating componentDidMount/componentDidUpdate).
**Why it's wrong:** "If you're trying to write an effect that behaves differently depending on whether the component renders for the first time or not, you're swimming against the tide!" The mental model is synchronization, not lifecycle. Props A→B→C should produce the same result as rendering with C immediately.
**Fix:** Synchronize based on current values; don't track mount state.
**Source:** "A Complete Guide to useEffect"

## 3. Premature Abstraction (The "Clean Code" Trap)
**Pattern:** Upon seeing duplicated code, immediately extract a shared abstraction.
**Why it's wrong:** "My code traded the ability to change requirements for reduced duplication." When requirements later diverge from the abstraction's assumptions, the abstraction becomes a convoluted obstacle. The original "messy" code would have been trivially easy to modify.
**Fix:** Let duplication live until you have evidence the abstraction improves evolutionary flexibility. "Let clean code guide you. Then let it go."
**Source:** "Goodbye, Clean Code"

## 4. Race Conditions in Async Effects
**Pattern:** An async request in useEffect that doesn't handle the case where a newer request completes before an older one, causing stale state to overwrite fresh state.
**Why it's wrong:** If you rapidly switch from id=1 to id=2, and the request for id=1 completes after id=2, you'll show stale data.
**Fix:** Use a cleanup function with a `didCancel` flag, or better, use Suspense for data fetching which handles this automatically.
**Source:** "A Complete Guide to useEffect"

## 5. Fixing Without a Repro (Theory-Driven Debugging)
**Pattern:** When debugging, immediately build isolated test cases to validate a theory about the root cause, WITHOUT first establishing a reliable reproduction of the bug.
**Why it's wrong:** The isolated case may not exhibit the same bug (different root cause), wasting time and producing false confidence. "A working repro that doesn't show the bug is worse than no repro."
**Fix:** Establish repro first (what to do, what's expected, what actually happens). Then narrow via theory-free reduction: remove things, test, commit deletions that preserve the bug, undo deletions that eliminate it. Always verify "a positive result is still possible with the new repro."
**Source:** "How to Fix Any Bug"

## 6. Over-Engineering for Theoretically "Clean" Architecture
**Pattern:** Designing component APIs starting from the abstraction itself rather than the desired user experience.
**Why it's wrong:** "We realize we need to change the whole approach to enable the right user experience" — when the API shapes the UX rather than vice versa, the abstractions are solving the wrong problem.
**Fix:** Start with the UX. What interface feels natural to the end user? Then work backward to the code that enables it.
**Source:** React Team Principles, "UI Before API"

## 7. Framework-Less Local Reasoning (findDOMNode Anti-Pattern)
**Pattern:** Writing component code that requires knowledge of the parent's DOM structure or imperative API (like findDOMNode).
**Why it's wrong:** "Deleting some code can blow up any level above" — it violates local reasoning, where developers should be able to "edit some code (add, remove, copy/paste) and not have to worry about what that code connects to."
**Fix:** Use declarative APIs. If a parent needs to control a child, pass props down, not imperative calls up.
**Source:** React Team Principles, "Enable Local Reasoning"

## 8. memo() Premature Optimization
**Pattern:** Wrapping everything in React.memo before measuring performance.
**Why it's wrong:** memo introduces its own overhead (shallow comparison on every render). Most components don't benefit from it because they receive new props that fail shallow comparison. "Before You memo()" — measure first.
**Fix:** Profile first. memo() is for stable props that rarely change identity. If you're memoizing and still getting re-renders, the issue is upstream (creating new objects/arrays in render).
**Source:** "Before You memo()"

## 9. Storing Computed Values in State
**Pattern:** Using useState for values that can be derived from props or other state.
**Why it's wrong:** Creates synchronization bugs — when the source changes, the derived state lags behind. Requires manual update logic that is error-prone.
**Fix:** Compute during render (derive from props/state). If expensive, useMemo.
**Source:** React core patterns — Dan's consistent advice

## 10. Not Understanding Closures in Hooks
**Pattern:** Assuming that state/props inside effects, callbacks, or timeouts always reflect the "latest" value (thinking like `this.state` in classes).
**Why it's wrong:** "Every function inside the component render... captures the props and state of the render call that defined it." In a timeout set during render with count=3, clicking rapidly to count=5 still shows 3. Ironic twist: classes have the OPPOSITE problem where `this.state.count` always shows the latest, creating variable-behavior bugs depending on timing.
**Fix:** Understand closures. If you need the latest value for an imperative operation, use a ref (escape hatch).
**Source:** "A Complete Guide to useEffect", "How Are Function Components Different from Classes?"

## 11. Ignoring the Cleanup Timing
**Pattern:** Assuming cleanup runs BEFORE the next render (like componentWillUnmount timing in classes).
**Why it's wrong:** React runs the previous effect's cleanup AFTER the next render AND browser paint. The cleanup function still "sees" old props/state from its render. This means cleanup runs with stale data, which can cause bugs if you're not aware.
**Fix:** Write cleanup to be self-contained (don't depend on "current" state). Its job is to undo the previous effect, nothing more.
**Source:** "A Complete Guide to useEffect"

## 12. "Progressive Complexity" Fork
**Pattern:** Designing a "simple" API path and a separate "advanced" API path, requiring migration when needs grow.
**Why it's wrong:** Creates a painful "fork in the road" — simple apps eventually need to migrate, which is more work than just learning the full API from the start.
**Fix:** Use the same structural approach from simple to complex. Don't create separate "beginner" vs "expert" APIs.
**Source:** React Team Principles, "Progressive Complexity"

## 13. Accessibility as Afterthought
**Pattern:** Adding accessibility concerns only after feature development.
**Why it's wrong:** "In UK disability affects 1 in 5 people." Most accessibility needs are best addressed at the framework/abstraction level, making accessibility "a default rather than an afterthought."
**Fix:** Tooling, education, and making the right path easy for product developers. Accessibility should be built into the component library.
**Source:** "The Elements of UI Engineering"

### Gotcha Distribution by Source
- useEffect/Hooks mental model: 5 gotchas (#1, #2, #4, #10, #11)
- Software design/abstraction: 4 gotchas (#3, #6, #7, #12)
- Debugging methodology: 2 gotchas (#5, #8)
- Accessibility/UX: 1 gotcha (#13)
- State management: 1 gotcha (#9)
