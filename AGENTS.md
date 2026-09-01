# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vite-powered React and TypeScript 3D experience. Entry points are `index.html` and `src/main.tsx`; top-level composition lives in `src/App.tsx`. Organize UI by responsibility:

- `src/components/experience/`: page sections, navigation, loading, telemetry, and configuration UI.
- `src/components/three/`: React Three Fiber and Three.js scene objects.
- `src/components/ui-kit/`: small reusable presentation components.
- `src/hooks/`: stateful browser and experience hooks; `src/lib/`: shared context and domain helpers.
- `src/styles.css`: global styles and Tailwind-related styling.
- `public/models/`: committed 3D assets such as `car.glb`; keep large binary assets out of `src`.

There is currently no test directory. Add tests near the feature or in a named `tests/` directory when introducing a test framework.

## Build, Test, and Development Commands

Run these commands from the repository root:

```sh
npm ci             # install the locked dependency tree
npm run dev        # start the Vite development server
npm run lint       # run ESLint across the project
npm run format     # format supported files with Prettier
npm run build      # create the production bundle in dist/
npm run preview    # serve the built bundle locally
```

Run `npm run lint` and `npm run build` before opening a pull request. No test script or coverage threshold is configured.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, double quotes, and semicolons, matching Prettier and ESLint. Name React components/files in PascalCase (`CarScene.tsx`), hooks with the `use-` prefix (`use-reduced-motion.ts`), and ordinary modules with descriptive kebab-case names. Prefer the `@/` alias for `src` imports; keep browser and Three.js behavior inside components, hooks, or library modules.

## Testing Guidelines

Testing infrastructure is not currently present. Manually verify development and production-preview flows, including reduced-motion behavior and 3D asset loading. If tests are added, use descriptive names tied to user-visible behavior and add an npm script and documentation.

## Commit & Pull Request Guidelines

Existing commits are brief and title-style (for example, `Second Commit`), but establish no formal convention. Use concise imperative subjects, ideally under 72 characters, and explain notable design or asset changes in the body. Pull requests should summarize the change, identify affected components, list validation commands, link issues when applicable, and include screenshots or a short recording for visual or 3D changes.

## Asset and Configuration Notes

Do not commit secrets or local environment files. Review `public/models/car.glb` changes carefully because binary assets affect repository size; document replacement or optimization steps in the pull request.

## Production Maintenance Notes

- `src/components/three/Car.tsx` owns the model URL and material-name mapping;
  keep it aligned with `public/models/car.glb` when replacing the asset.
- `src/components/three/ThreeExperience.tsx` is the deferred boundary for the
  Three.js bundle. Keep page/content components out of that boundary unless
  they require the 3D runtime.
- Preserve the no-WebGL/model-error fallback and the keyboard view controls
  when changing the scene interaction model.
- Configuration is intentionally local-only and conceptual. Do not present
  the estimated price as a purchase quote without adding a validated commerce
  or pricing service.
- Use the manual release checklist in `README.md` in addition to `npm run lint`,
  `npx tsc -b`, and `npm run build`; there is no automated test framework yet.
