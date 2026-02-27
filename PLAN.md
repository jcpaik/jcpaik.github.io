# Plan

## Managing app code

Use a **monorepo subdirectory** (e.g. `apps/sofa/`). Each app lives in its own subdirectory with its own `package.json` and build output. No git submodules.

## Embedding apps in the website

- Two options
  - Use `<div>` and inject the standalone app. 
  - Use **Web Components** to embed apps. A completed app is packaged as a custom element (e.g. `<sofa-simulator></sofa-simulator>`) and dropped into any HTML or Markdown post as a plain HTML tag.
