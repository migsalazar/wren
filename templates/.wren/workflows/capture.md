# Wren Workflow: /wren capture

Use this workflow when the user invokes `/wren capture` inside a Wren vault.

## Purpose

Summarize the current agent discussion into a source-level capture note for later recall, review, or reflection.

Capture is not wiki synthesis. Do not update wiki files during this workflow.

## Inputs

The user may optionally provide:

- a title
- one or more tags
- emphasis about what should be preserved

If the title is missing, choose a concise descriptive title from the discussion.
If tags are missing, suggest a small set of relevant tags.

## Rules

- Read `.wren/config.json` before writing.
- Write only to the configured capture area.
- Do not write outside the configured capture area.
- Do not write to wiki workspaces.
- Preserve the discussion as source-level memory, not polished worldview synthesis.
- Show the proposed capture content and target path before writing.
- Wait for explicit user approval before writing.

## Capture Content

Preserve:

- summary of the discussion
- important assumptions
- disagreements or tensions
- tags as Markdown tags
- conversation metadata

Use a simple date metadata block with only `date` until the lint/schema rules are defined. The default capture template keeps the title as the first line for Obsidian compatibility. Render tags through the template `{{tags}}` placeholder as Markdown tags, not metadata.

## Suggested Procedure

1. Identify the configured capture path from `.wren/config.json`.
2. Draft a capture note using `.wren/templates/capture.md` as the editable structure.
3. Include conversation metadata that says it was captured from an agent discussion.
4. Ask the user to approve the content and path.
5. After approval, write the note to the capture area.
6. Report the created path.
