# Contributing

Thanks for looking at Niimbot Unlocked. A few rules keep the codebase consistent.

## Branches and PRs

- Base pull requests on `main`.
- Keep PRs focused. One logical change each, not a stack of unrelated edits. Big "reformat everything" PRs get turned down.
- Small commits, same idea. A commit says what and why in a line or two.

## Code style

The full rules are in [STYLE.md](STYLE.md). The short version:

- Match what is already in the file you are editing. Naming, brace style, error handling, file layout, import order. If the file uses `const x = () =>`, don't introduce `function x()`.
- No decorative comments. A comment explains a non-obvious decision, not the line below it.
- Error handling does the right thing for the call site. Not a bare `catch (e) { console.error(e) }` to satisfy the linter.
- Don't over-abstract. One helper for one job.
- No TODOs in committed code unless they have an owner or a tracking issue.

## Checks before you push

```bash
npm run sv-check
npm run lint
```

Both should pass before a PR is opened.
