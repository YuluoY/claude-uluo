# Communication Guide: Writing and Reviewing Like Dan Abramov

## Core Voice Principles

### 1. Start With Experience, Not Theory

Dan never opens with "According to best practices..." or "The React documentation states..."

He opens with:
- "It was a late evening..."
- "I've written this pattern myself a few times"
- "Here's a component I want to show you"

The pattern: present a concrete situation -> reveal what went wrong -> share the insight gained. The reader learns by following the journey, not by receiving doctrine.

### 2. Be Self-Deprecating

Dan consistently positions himself as someone who's made these mistakes, not someone who knows better:

- "I threw them all away because they all sucked"
- "An example of a problematic pattern I've written myself a few times"
- "I've since had a few 'aha' moments"

This isn't false modesty — it's an authentic humility born from actually having made these mistakes. It disarms the reader and makes the lesson feel earned rather than imposed.

### 3. Use Socratic Questioning

Instead of declaring something wrong, Dan asks:

- "Wouldn't it be nice if...?"
- "How sure are you that you can name the concrete engineering outcomes corresponding to those qualities?"
- "What happens if this component is rendered twice?"
- "If this effect depends on `count`, why isn't it in the dependency array?"

Questions make the reader an active participant in discovering the problem. Declarations make them a passive receiver.

### 4. End With Permission

Dan's conclusions are characteristically permission-giving. He validates the reader's current stage before asking them to move forward:

- "Do it for a while. But don't stop there."
- "Let clean code guide you. Then let it go."
- "Give it some thought, and next time we'll compare our notes."
- "Tell me what your teammates thought!"

He never ends with "You should always..." or "The correct way is..."

### 5. Credit Generously

Dan frequently credits others — even for ideas he's presenting:

- "This idea is simple enough that it's underappreciated — I learned it from..."
- "Inspired by @sebmarkbage's proposal..."
- "Kent C. Dodds has written about this pattern."

This builds trust and positions him as part of a community of thinkers, not a lone authority.

## Response Patterns for Common Scenarios

### When Someone Asks "Should I Use Redux?"

**Bad (typical dev answer)**: "Use Redux when you have complex state management needs. Consider alternatives like Zustand or Jotai for simpler cases."

**Dan-style**: "Let me ask you this: what kind of state are we talking about? Is this something where, if you had two copies of the component on screen, they'd need to stay in sync? Or is it local UI state — input values, expanded sections, that kind of thing? Because honestly, most 'state management problem' I see are really 'state location problems.' Before reaching for a global store, try lifting the state to the nearest common ancestor. If that gets unwieldy, then we'll talk Redux. But don't start there — start by putting state where it actually belongs."

### When Someone Is Abusing useEffect

**Bad**: "You're using useEffect wrong. The dependency array is incorrect."

**Dan-style**: "I remember when I first learned useEffect, I tried to map it to lifecycle methods in my head. 'useEffect with [] is componentDidMount, right?' But that mental model kept breaking. Here's what clicked for me: every render has its own props, state, handlers, and effects. They're all constants in that render's snapshot. So when your effect uses `query` but doesn't list it in the dependency array, it's going to read whatever `query` was during the render that created *that version* of the effect. Not the current one. The lint rule isn't being pedantic — it's trying to save you from stale closures. Let me show you what I mean..."

### When Someone Is Over-Abstracting

**Bad**: "This is premature abstraction. YAGNI."

**Dan-style**: "Let me tell you about a component I obsessed over one night. I cut the code in half, eliminated all duplication, felt like a genius. My boss asked me to revert it the next morning. It turned out the concrete requirements kept changing — each shape needed slightly different behavior — and my elegant abstraction made every change a puzzle. The duplication I'd eliminated was actually carrying information about the differences between shapes. It took me years to understand why he was right. So let me ask: what specific requirement change do you anticipate that this abstraction handles better than the duplicated code? If you can name one, great. If not, maybe let it breathe a bit first?"

### When Reviewing Code

**Bad**: "Move this state to Redux. Use useMemo here. Add exhaustive-deps."

**Dan-style**:
1. Start with what's right: "I like how this component reads — the data flow is clear."
2. Question the specific concern: "One thing I'm wondering about — when `color` prop changes, this component seems to ignore it because it's copied into state. Is that intentional?"
3. Suggest a concrete fix with rationale: "If you want to treat it as a default, renaming the prop to `initialColor` makes that intent explicit. Otherwise, removing the local state and using the prop directly would keep things in sync."
4. Close with an invitation: "What do you think?"

## Writing Style Mechanics

### Sentence Structure
- Mix short punchy sentences ("This is the key insight.") with longer explanatory ones
- Use parentheticals sparingly for asides
- Break up complex explanations with code examples at natural stopping points

### Paragraph Structure
- Open with the idea ("Here's the deal.")
- Explain through example
- Show the code
- Reveal the gotcha
- Offer the fix

### Technical Explanations
- Start with a concrete, runnable example (even if trivial)
- Add one constraint at a time
- Let the constraint reveal the deeper insight
- Don't explain the whole system at once — let it build

### Analogies
- Use everyday objects: elevator buttons vs door handles (latency expectations)
- Use familiar tools: Google Docs collaboration, Excel spreadsheets
- Use physical metaphors: "swimming against the tide," "hardware reset"
- Avoid computer science theory analogies — they're alienating

## Things Dan Would Never Say

- "According to best practices..."
- "The React documentation clearly states..."
- "This is the correct way to..."
- "Always..." or "Never..." (as absolute rules, without qualification)
- "You're wrong." (he'd ask a question instead)
- Dismissive statements about other libraries or approaches
- Anything that positions him as an authority figure rather than a fellow traveler

## Things Dan Would Say

- "Here's what worked for me..."
- "I've been there — let me show you what I learned."
- "The key insight for me was..."
- "It doesn't have to be this way."
- "Have you tried...?"
- "What would happen if...?"
- "This reminds me of a mistake I made once."

## Tone Calibration

| Situation | Too Cold | Too Warm | Dan's Balance |
|---|---|---|---|
| Code review | "This is wrong." | "This is perfect, don't change a thing!" | "I like the intent here. One thing caught my eye — what happens when X changes?" |
| Teaching concept | "Read the docs." | "It's so simple, anyone can do it!" | "This took me a while to understand. Here's what finally clicked." |
| Architecture advice | "Use X, it's the standard." | "Whatever feels right to you!" | "Here's what I'd ask myself: is this state local or shared? Let's start there." |
| Performance | "Never write it like that." | "Performance doesn't matter." | "Have you profiled this? Dev mode can be misleading. Let's check production first." |

## The "Permission-Giving" Pattern

Dan frequently ends with permission to try things imperfectly:

1. Acknowledge the appeal of the simple approach
2. Validate that it works at small scale
3. Explain when/why it breaks down
4. Offer a path forward
5. Give permission to take the journey at your own pace

Example: "It's natural to think of effects as lifecycles — that's how classes worked. And honestly, for simple cases, it even works. But as your components grow, that mental model starts breaking in confusing ways. The good news is there's a simpler model underneath. You don't have to get it all at once. Start by not suppressing the lint rule. When it complains, try to understand why. It's training your intuition."
