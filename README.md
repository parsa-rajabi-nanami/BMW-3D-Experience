# BMW Experience

BMW Experience is an independent, interactive 3D performance-car product concept
built with Vite, React, TypeScript, React Three Fiber, Three.js, and Tailwind
CSS. It is not affiliated with, endorsed by, or produced by BMW AG.

## Product surface

- Immersive, scroll-led experience with a fixed 3D vehicle stage.
- Vehicle exploration with hotspots, focus views, drag rotation, wheel/pinch
  zoom, and keyboard-accessible view controls.
- Live configuration for exterior, wheels, brakes, interior, and trim with an
  estimated concept price.
- Engineering topics, simulated track telemetry, and driving modes.
- Build summary saved to local storage on the current device.
- Graceful loading, WebGL/model failure fallback, retry, reduced-motion support,
  and a no-WebGL content path.

The experience is intentionally a front-end concept: there is no commerce,
account, analytics, or remote configuration service connected.

## Development

Install Node.js and npm, then run:

```sh
npm ci
npm run dev
```

Run the quality gates locally with:

```sh
npm run lint
npx tsc -b
npm run build
```

The production build can be previewed locally with:

```sh
npm run build
npm run preview
```

## Asset and performance notes

The vehicle asset is `public/models/car.glb`. It is a web-optimized derivative
of the supplied 2025 BMW M5 Sedan source: the named source hierarchy is kept,
geometry is welded and Meshopt-compressed, and textures use WebP where
supported. Runtime preparation merges only meshes inside the same vehicle part;
the four wheel groups and four caliper groups remain independently addressable.
The supplied source contains no door/hood/trunk nodes or animation clips, so no
such animation is claimed by the integration. See `public/models/car-license.txt`
for the required attribution and license terms.

The 3D experience is loaded as a deferred chunk so the editorial page can render
without waiting for Three.js. The model is also preloaded from the document so
its request can start while the application chunks are loading. Mobile devices
use a device-pixel-ratio cap of 1, disable real-time shadow mapping and contact
shadows, and use a lower-resolution environment map for a lighter scene. Devices
with four or fewer logical cores, four or fewer GB of memory, or Save-Data
enabled also use a 30fps demand-rendered scene, reduced lighting, and pause 3D
rendering while the page is hidden.

If the model is replaced, review `src/components/three/Car.tsx` for its
material-name selectors and interaction-group names.
