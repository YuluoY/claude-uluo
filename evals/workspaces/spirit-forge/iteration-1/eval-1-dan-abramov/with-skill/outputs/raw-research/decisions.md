# Dan Abramov's Decision Frameworks & Opinions

## Core Decision-Making Patterns

### 1. UI-First Abstraction Design
**When** designing APIs for UI frameworks, **prefer** starting from the desired user experience and working backwards to the abstraction **because** starting from the API itself leads to "changing the whole approach to enable the right user experience" after it's already shipped.
**Source:** React Team Principles, "UI Before API"

### 2. Absorb Complexity Centrally
**When** deciding where complexity lives in a framework, **prefer** putting it in the framework internals so product code stays simple **because** "something has to act as the coordinator" and centralizing complexity enables simpler application code. The tradeoff: harder core contributions.
**Source:** React Team Principles, "Absorb the Complexity"

### 3. Hacks Before Idioms
**When** users need capabilities the API doesn't yet support, **prefer** providing escape hatches and observing usage patterns **because** battle-tested hacks reveal the right API design, and entrenching a poor idiom is worse than temporary fragility.
**Source:** React Team Principles, "Hacks, Then Idioms"

### 4. Local Reasoning Over Global Knowledge
**When** designing component APIs, **prefer** enabling developers to understand code by reading it locally **because** in large codebases, "the person only has local knowledge about the piece of code they're working on." Editing code shouldn't require understanding the entire system.
**Source:** React Team Principles, "Enable Local Reasoning"

### 5. Abstraction Must Earn Its Keep
**When** tempted to remove duplication via abstraction, **prefer** tolerating repetition and verifying the abstraction improves evolutionary flexibility **because** abstractions impose costs — "my code traded the ability to change requirements for reduced duplication." If requirements diverge from the abstraction's assumptions, the abstraction becomes an obstacle.
**Source:** "Goodbye, Clean Code" — his most-cited philosophy post

### 6. The Repro Is Everything
**When** fixing a bug, **always** start by establishing a reliable reproduction **because** "you cannot fix what you cannot reliably observe." Without a repro, both humans and AI tools "guess at solutions without any way to verify them." A good repro has: what to do, what's expected, what actually happens.
**Source:** "How to Fix Any Bug" (2025)

### 7. Well-Founded Reduction (Theory-Free Stripping)
**When** narrowing down a bug, **never** test theories — just remove things **because** building isolated reproductions to test hypotheses risks creating cases that don't exhibit the bug at all. Each step must "provably reduce the problem space while preserving the bug." Always confirm "a positive result is still possible with the new repro."
**Source:** "How to Fix Any Bug" (2025)

### 8. Synchronization, Not Lifecycle
**When** thinking about effects/side effects, **prefer** the mental model of "synchronizing external systems with props and state" **because** treating useEffect as lifecycle methods leads to bugs (stale closures, incorrect cleanup timing). "It shouldn't matter whether we rendered with props A, B, and C, or if we rendered with C immediately."
**Source:** "A Complete Guide to useEffect"

### 9. Honest Dependencies Over Convenience
**When** specifying useEffect dependencies, **always** include ALL values from the render scope that the effect uses **because** lying about dependencies breaks the synchronization model in subtle ways. "If you specify deps, ALL values from inside your component that are used by the effect MUST be there." If this causes problems, change the effect code — don't suppress the lint rule.
**Source:** "A Complete Guide to useEffect" — the most influential React technical post

### 10. Functions Are Part of Data Flow
**When** passing functions as dependencies, **prefer** useCallback to make their identity track meaningful changes **because** "functions can fully participate in the data flow." This contrasts with classes where function identity is meaningless (bound to mutable `this`), forcing workarounds like extra props.
**Source:** "A Complete Guide to useEffect"

### 11. Progressive Complexity (No Fork in the Road)
**When** designing a framework API, **never** create a fork where "power users" go one way and beginners another **because** this forces painful migrations as apps grow. The same structural approach should scale from simple to complex without rewrites.
**Source:** React Team Principles, "Progressive Complexity"

### 12. Contain the Damage
**When** not everyone follows best practices, **prefer** designing the framework to limit negative spillover effects **because** "the developer should only 'pay' for the features they use" and the end user should only pay for UI they interact with. Framework overhead is fixed; application code is unbounded.
**Source:** React Team Principles, "Contain the Damage"

### 13. Trust the Theory
**When** current approaches have known fundamental limitations, **prefer** pivoting toward theoretically sound alternatives even if it takes years **because** you want to avoid "getting stuck in a local maxima." Chip away at obstacles until the theory wins.
**Source:** React Team Principles, "Trust the Theory"

## Key Contradictions & Tensions

### Tension 1: "Don't know" vs Expert
Dan publicly listed 30+ things he didn't know in 2018 (TypeScript, Docker, algorithms, etc.) while simultaneously being one of the world's top frontend experts. Resolution: "Experienced developers have valuable expertise despite knowledge gaps." Deep expertise in one domain doesn't require breadth.

### Tension 2: Clean code vs duplication
Dan spent years advocating clean code principles through Redux and React patterns, then wrote "Goodbye, Clean Code" arguing against premature abstraction. Resolution: Clean code is a GUIDE, not a GOAL. The phase is natural and valuable — you must pass through it before you can transcend it.

### Tension 3: Framework complexity vs developer simplicity
React's internals are notoriously complex, yet Dan insists the framework exists to simplify product code. Resolution: Centralized complexity is a conscious trade — "Absorb the Complexity."

### Tension 4: TypeScript resistance then adoption
Publicly admitted never learning TypeScript in 2018, but his 2025 projects use it heavily. Resolution: His principle of "learning technologies when I need them" holds — he adopted TypeScript when the ecosystem demanded it.

## Communication Style Markers
- **Formality:** 4/10 — conversational, self-deprecating, uses humor and personal anecdotes
- **Explanation style:** Example-first AND first-principles hybrid
- **Signature phrases:** "each render has its own...", "swimming against the tide", "this is a phase", "it shouldn't matter whether", "if you specify deps, ALL values..."
- **Sentence patterns:** Balanced length, Socratic questions, parenthetical asides for nuance
