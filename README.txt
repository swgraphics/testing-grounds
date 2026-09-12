TESTING GROUNDS 1.4.0 — RUNTIME UPDATE-DEPTH FIX

This is a targeted correction for the React/React Three Fiber
"Maximum update depth exceeded" runtime error encountered after the
1.4.0 overlay was installed.

Replace/merge these files into the existing Testing Grounds project:

src/components/ui/AdaptiveReticle.jsx
src/components/world/SunReticleSensor.jsx   (new)
src/components/world/MeshPlacementSystem.jsx
src/scenes/TestingGrounds.jsx

Do NOT delete .git, node_modules, public assets, or unrelated source files.

WHY THIS FIX EXISTS
The 1.4 AdaptiveReticle mixed a DOM overlay component with React Three
Fiber useFrame/useThree hooks. The reticle should be a normal DOM UI
component; only a Canvas-side sensor should participate in the R3F loop.

The fix separates those responsibilities:
- SunReticleSensor runs inside <Canvas> and broadcasts only when the sun
  becomes/ceases to be the active reticle target.
- AdaptiveReticle is now pure DOM/React UI and no longer subscribes to R3F.
- Controller polling remains outside the Canvas render loop.
- Placement handlers no longer perform Zustand world updates inside React
  setState updater callbacks, keeping those callbacks pure.

TEST
From C:\Users\Tavis\testing-grounds:

npm run build

If the build succeeds:

npm run dev

Do not commit yet if the runtime error remains. Report the new console
error/stack before changing anything else.
