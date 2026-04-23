# Owlplot Architecture Doctrine

This document exists to keep implementation decisions aligned with the real goal of Owlplot:

Owlplot is a compute-first visualization system that happens to render charts.

If you remember only one thing, remember this:

> the core artifact is not a rendered chart
>
> the core artifact is a typed, deterministic scene that expresses meaning

Everything else follows from that.

## The Thesis

Separate what a visualization means from how it is drawn.

The architecture should look like this:

- input config and data
- normalized config
- layout and scale computation
- semantic scene output
- renderer-specific projection to pixels

In short:

`data -> layout -> scene -> render`

The boundary between `scene` and `render` matters more than almost any local implementation choice.

## Primary Goal

Build a foundational visualization engine that can support:

- charts
- interactions
- accessibility
- export pipelines
- custom visual systems
- downstream products and design systems

Charts are an important use case, but they are not the deepest abstraction.

The deepest abstraction is the scene.

## Non-Negotiable Invariants

These are the rules to protect even when moving fast.

### 1. Core compute is pure

Core code should be deterministic and side-effect free.

Given the same input, it should produce the same normalized config, layout, and scene.

Avoid:

- DOM reads
- renderer callbacks during compute
- hidden mutable caches that affect output
- time-based or environment-based behavior in scene generation

### 2. The core owns meaning

The renderer must not decide what something means.

The renderer can interpret how to draw a semantic node, but it should not infer chart semantics that the core failed to encode.

If a renderer needs to "figure out what the author probably intended," that meaning probably belongs in the scene.

### 3. The renderer is a consumer

Treat renderers as replaceable downstream consumers of the scene graph.

The SVG renderer is not special. It is just the first consumer.

When making core decisions, ask:

- would this still make sense if SVG disappeared?
- would canvas, HTML, PDF export, and accessibility traversal still have a coherent input?

If the answer is no, the design is probably leaking renderer concerns into the core.

### 4. Typed semantics beat string protocols

Inside Owlplot, prefer:

- enums
- discriminated unions
- explicit tagged objects
- typed metadata contracts

Avoid stringly-typed internal conventions that require multiple packages to "just know" what a value means.

Strings are acceptable at the public boundary. They are a liability in internal architecture.

### 5. Semantic paint, not renderer paint

Paint decisions in core should describe intent, not SVG implementation details.

Good:

- left-to-right gradient
- series accent color
- semantic token for emphasis or muted state

Bad:

- SVG gradient coordinates in core
- renderer-specific class name assumptions in compute
- visual hacks encoded as output geometry when they are really styling semantics

### 6. Scene output should be durable

The scene should be rich enough to serve as a stable intermediate artifact for:

- rendering
- interactions
- accessibility
- legends
- export
- transforms

If a feature requires bypassing the scene and reaching back into config or renderer state, that is usually a design smell.

### 7. Customization should compose through transforms

When someone asks, "how do I customize this?", the ideal answer is:

> transform the scene

We should prefer:

- scene transforms
- scene filters
- semantic overrides
- projection-specific consumers

We should be suspicious of:

- adding many one-off top-level props
- branching core logic for a single presentation tweak
- renderer escape hatches that bypass scene semantics

## Preferred Mental Model

Think in layers.

### Layer 1: Input

User-facing config and source data.

This layer is allowed to be ergonomic and boundary-shaped. It can contain strings and convenience forms if they normalize cleanly.

### Layer 2: Normalized Model

All ambiguity is removed here.

Defaults are applied, options are expanded, and internal representation becomes explicit and typed.

If later stages still need to guess what the config means, normalization is incomplete.

### Layer 3: Layout and Semantics

Scales, geometry, axis semantics, labels, regions, interaction metadata, and paint intent get computed here.

This is where the system decides what exists and why.

### Layer 4: Scene

The scene is the durable semantic artifact.

It should contain enough information for multiple downstream consumers to do their work without re-deriving chart meaning.

### Layer 5: Projection

SVG, canvas, HTML, PDF, narration, test serializers, and interaction engines consume the same scene through different projections.

This layer should not retroactively invent semantics.

## How To Make Good Decisions

When adding a feature, ask these questions in order.

### 1. Is this a meaning problem or a drawing problem?

If it changes what the visualization is saying, it belongs in core semantics or scene output.

If it only changes the final projection into a target medium, it may belong in the renderer.

### 2. Does this belong before or after the scene boundary?

If multiple consumers would need this information, it belongs before the boundary.

If only one projection needs it, it may belong after the boundary.

### 3. Are we introducing a new semantic primitive or sneaking in a special case?

Prefer adding a reusable semantic concept over embedding a chart-type-specific branch.

Special cases accumulate into chart-type spaghetti.

### 4. Could this be expressed as a scene transform?

If yes, prefer that over adding more top-level configuration surface area.

Transforms are often the cleanest way to unlock customization without corrupting the core model.

### 5. Would this still be coherent with a different renderer?

If not, it probably does not belong in core.

## Smells To Catch Early

These are warning signs that Owlplot is drifting off course.

### Smell: Renderer-driven semantics

Example pattern:

- core emits underspecified nodes
- renderer inspects context and infers what they really mean

Why it is bad:

- behavior diverges across renderers
- semantics become implicit
- interaction and accessibility consumers cannot rely on the scene alone

### Smell: Chart-type branching everywhere

Example pattern:

- one feature path for line
- another for bar
- another for area
- duplicated semantics with tiny differences

Why it is bad:

- encourages a product model organized around chart names instead of reusable primitives
- makes extension harder
- produces brittle logic and surprise interactions

The better question is often not "how does the bar chart do this?" but "what semantic primitive is missing?"

### Smell: Prop explosion

Example pattern:

- every customization request adds another boolean or renderer-specific option

Why it is bad:

- grows API surface without improving composability
- pushes users toward trial-and-error config instead of predictable transforms
- traps the library in compatibility debt

### Smell: Scene bypasses

Example pattern:

- hover system reads config directly instead of scene metadata
- export pipeline re-derives labels from raw data
- legend builder inspects series config rather than scene semantics

Why it is bad:

- duplicates logic
- creates drift between consumers
- weakens the scene as the central artifact

### Smell: Renderer coordinates inside core paint semantics

Example pattern:

- core emits SVG-specific values for gradients, stroke details, or defs wiring

Why it is bad:

- locks the compute model to one renderer
- makes alternate projections harder than they need to be

## What To Prefer

When multiple implementation paths are available, bias toward these.

### Prefer semantic nodes over implicit conventions

If a downstream consumer needs to know something, encode it explicitly.

### Prefer normalization over repeated branching

Push ambiguity to the boundary and resolve it once.

### Prefer transforms over option proliferation

If customization can be modeled as a scene operation, that is usually the right abstraction.

### Prefer generic vis primitives over chart-specific hacks

Reusable primitives compound. One-off chart branches calcify.

### Prefer testable artifacts

If a change can be snapshot-tested at the scene level, that is a strong sign the boundary is healthy.

## What The Scene Should Unlock

The scene should eventually be strong enough that these become projection or traversal problems rather than bespoke features:

- hover resolution
- selection
- legends
- annotations
- accessibility narration
- export to image or PDF
- themed rendering
- custom visual remixes

If these require reaching around the scene, the scene is not carrying enough meaning yet.

## Guidance For Future Work

### Adding new chart capabilities

Do not start by asking, "what props does this chart type need?"

Start by asking:

- what semantic primitives are missing?
- what layout facts need to be represented?
- what scene nodes or metadata need to exist?
- can existing projections consume them without chart-specific branching?

### Adding interaction features

Treat hover, focus, selection, and narration as consumers of the same semantic scene.

Interaction should be driven by scene queries and metadata, not by renderer-specific DOM assumptions.

### Adding styling features

Push visual intent into semantic paint tokens and scene-level styling metadata.

Keep renderer-specific syntax and coordinate systems downstream.

### Adding customization APIs

Pause before adding another prop.

Ask whether the need is better solved by:

- scene transforms
- semantic hooks
- projection-specific adapters
- a richer normalized model

### Adding tests

Prefer tests at the layer where meaning becomes explicit.

Good targets include:

- normalization output
- layout output
- scene snapshots
- semantic metadata used by interactions

Renderer tests should verify projection fidelity, not carry the burden of validating core meaning.

## Practical Decision Filter

Before merging a design or implementation choice, run this quick check:

1. Does this strengthen or weaken the scene as the central artifact?
2. Does this move meaning earlier in the pipeline or leave it implicit until rendering?
3. Would this survive a renderer swap?
4. Does this reduce or increase special cases?
5. Does this make customization more composable or more prop-driven?

If the answers trend the wrong way, stop and redesign.

The product-facing version of this filter lives in [docs/prd-checklist.md](./prd-checklist.md).

## Anti-Goal

The failure mode is not "the code is messy."

The failure mode is this:

Owlplot slowly becomes a conventional chart library with better TypeScript.

That would look like:

- chart-type-first architecture
- renderer leakage into compute
- lots of presentation props
- weak scene semantics
- interactions built from ad hoc DOM knowledge

That is not the project.

## One-Line Heuristic

If you are unsure what to do, choose the option that makes this sentence more true:

> Owlplot produces meaning first, and rendering is just one way to consume it.
