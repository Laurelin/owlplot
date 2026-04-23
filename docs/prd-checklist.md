# Owlplot PRD Checklist

Use this when proposing or reviewing a feature, API, renderer capability, or interaction model.

If a proposal cannot answer these clearly, it is not ready.

## One-Sentence Product Test

The proposal should make this statement more true:

> Owlplot produces meaning first, and rendering is one way to consume it.

If it makes that sentence weaker, rethink the design.

## PRD Questions

Every PRD should answer these directly.

### 1. What meaning is being added?

Describe the new semantic capability in core terms.

Good:

- a new scene primitive
- richer layout semantics
- interaction metadata that multiple consumers can query
- a new transform or projection capability

Weak:

- "the SVG renderer needs a trick"
- "we need another prop for this chart"

### 2. Where does the feature live in the pipeline?

State explicitly which layer changes:

- input config
- normalization
- layout
- scene
- projection

If this is unclear, the design is unclear.

### 3. Why is this not renderer-specific?

If the feature belongs in core, explain why more than one consumer could use it.

Examples:

- renderers
- hover systems
- legends
- accessibility traversal
- export pipelines

If only one projection needs it, it may belong downstream instead.

### 4. What scene artifact changes?

List the exact durable output that becomes available after the feature lands.

Examples:

- new node kind
- new metadata contract
- richer paint semantics
- new transform stage

This matters because the scene is the contract, not the implementation detail.

### 5. How is customization supposed to happen?

Prefer answers like:

- scene transform
- semantic override
- projection adapter
- normalized config extension

Be skeptical of answers like:

- add several booleans
- add one more special-case renderer option
- inject callback escape hatches into compute

### 6. What future features does this unlock?

A strong feature usually compounds.

Call out what this would enable next, such as:

- accessibility
- export
- interaction reuse
- new renderer support
- custom visual remixes

If it solves only one narrow case and adds permanent abstraction weight, that is a warning sign.

## Acceptance Criteria

A feature is healthier when its acceptance criteria can include these:

- normalized config is explicit and deterministic
- scene output is snapshot-testable
- renderer does not invent missing semantics
- interaction consumers can use scene metadata directly
- customization composes through transforms or semantic hooks

Try not to make renderer screenshots the only real proof of correctness.

## Red Flags

Pause the PRD if any of these appear.

- The proposal is organized around chart-type branching instead of reusable primitives.
- The renderer must infer author intent because the scene does not encode it.
- The feature is mainly an API surface expansion with weak semantic payoff.
- Hover, legend, or export logic would need to bypass the scene.
- Core types start carrying renderer-native details.
- The only explanation for placement is "that’s how SVG wants it."

## Fast Review Template

Use this block in planning docs or PR descriptions.

```md
## Owlplot Check

- Meaning added:
- Pipeline layer(s):
- Scene artifact changed:
- Why core vs renderer:
- Customization model:
- Future capabilities unlocked:
- Snapshot/test strategy:
- Red flags considered:
```
