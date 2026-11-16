# TESTING GROUNDS — UI/UX TASK 04 ADDENDUM
## Full-Bleed World View & Compass Overlay Refinement

### Priority

These instructions are additional owner-directed requirements for Task 04.

Use the two owner-provided UI mockups as visual references.

These requirements supersede any earlier styling or layout instructions that conflict with them.

Complete this refinement during Task 04 Stage A, **before implementing Compass Quick Tools and customizable Shortcuts**, so those controls are built on the correct layout.

### 1. World View must remain full-bleed

The owner does not want the dark frame or inset border that currently appears around the world when directional panels are open.

In World View:

- The 3D world should fill the entire application viewport.
- Opening one or more panels must not introduce a thick dark border around the world.
- Remove unnecessary outer padding, frame backgrounds, and inset containers.
- Directional panels should appear over the full-bleed world.
- Opening or collapsing panels should not unnecessarily resize the underlying 3D canvas.
- Users must retain access to the visible world outside the active panel regions.

This applies to every supported combination of one, two, three, or four open panels.

**Important distinction:** Editor View may continue using its established docked panel arrangement and central world viewport. Do not unintentionally redesign Editor View's layout while correcting World View.

Preserve one shared panel system and its existing functionality.

### 2. White panel expand/collapse controls

The owner wants the floating [+] controls in World View to be white.

Requirements:

- Default/neutral [+] symbols: white.
- Keep their surrounding visual treatment minimal.
- Orange may indicate active selection or keyboard/controller focus where appropriate.
- Preserve accessible hit targets, labels and focus indication.
- Keep the controls positioned at their assigned panel edges.
- Preserve independent panel visibility.

When World View has no panels open, retain the clean default with only the Compass icon as persistent interface chrome. Collapsed-panel controls may appear contextually while the user is working with panels.

Do not create permanently visible edge tabs that clutter the initial clean World View.

### 3. Compass should be an overlay, not a modal-looking menu

The currently opened Compass looks too much like a separate menu screen.

The desired result is a HUD-style overlay directly over the active world.

Change the Compass presentation:

- Keep the world visible behind the Compass.
- Eliminate the large dark rectangular backing around the main radial navigation.
- Avoid heavy full-screen dimming or opaque menu backgrounds.
- Allow directional labels, symbols and buttons to float directly over the world.
- Use typography, subtle shadows or limited contrast treatments for readability rather than large filled containers.
- Preserve the ability to distinguish focused and unfocused controls.

The visual design should communicate that the player is still inside the world, accessing an interface overlay—not entering a different application screen.

Preserve the existing navigation hierarchy and input ownership.

### 4. Increase Compass prominence

The main central Compass graphic should be slightly larger.

Use the owner mockup as the proportional reference.

Requirements:

- Make the Compass the dominant central visual anchor while open.
- Maintain balanced spacing between the Compass and four directional labels.
- Avoid collisions with Quick Tools, Shortcuts or screen edges.
- Scale responsively on smaller viewports.
- Preserve quick Xbox D-pad/left-stick navigation.
- Do not change navigation hit targets in ways that cause accidental selection.

The upcoming white/orange/blue visual hierarchy still applies.

### 5. Full-width top and bottom toolbars

The Compass currently displays its header and footer as menu-like regions.

Change these into toolbars that extend horizontally to the edges of the Testing Grounds application view.

**Top toolbar**

Contains the existing relevant header actions, including mode switching and other established controls.

- Extend from the left edge to the right edge.
- Use a compact, consistent height.
- Keep controls aligned and accessible.
- Avoid the appearance of a floating rectangular menu.

**Bottom toolbar**

Contains the appropriate Back and contextual actions.

- Extend across the entire application view.
- Maintain a compact visual footprint.
- Apply the existing Task 04 simplification: PARENT becomes BACK.
- Remove unnecessary persistent controller instruction text.

These toolbars appear as part of the opened Compass interface. Do not make them permanently visible in the clean World View.

Use the existing Testing Grounds typography and restrained black/white styling.

### 6. Quick Tools and Shortcuts must follow the new overlay design

When implementing Task 04 Stage B and Stage C:

**Quick Tools — right of Compass**
- FPV toggle
- Guides/Markers toggle
- Undo
- Redo

**Shortcuts — left of Compass**
- Four customizable slots
- Assignment, replacement and clearing

Do not place either collection inside a large opaque dark panel.

They should feel like integrated HUD controls floating alongside the Compass.

Individual buttons may have minimal contrast treatments where needed for usability.

Maintain clear separation from the four primary Compass directions.

Preserve keyboard, mouse and Xbox focus navigation.

### 7. Interaction and layout requirements

The visual changes must not introduce a blocking overlay across the entire world.

Verify that:

- Only actual interactive UI regions capture pointer input.
- The world remains visible and usable outside the Compass/panel interaction surfaces.
- Compass input ownership still prevents unintended gameplay movement while navigating.
- Opening/closing Compass remains fast.
- B/Escape dismissal works.
- Directional panels retain independent visibility.
- Returning to World View restores normal input.
- No new pointer-event interception prevents terrain or object editing.

Respect the existing reduced-motion behavior for Compass animations.

### 8. Validation

In addition to the existing Task 04 tests, verify:

1. Clean World View fills the application viewport.
2. Opening EAST does not create the dark frame.
3. Opening two, three and four panels does not create the frame.
4. [+] controls are white in their neutral state.
5. Compass appears directly over the world without a large rectangular background.
6. Central Compass is appropriately enlarged.
7. Directional text and buttons float over the world.
8. Top toolbar extends to both application edges.
9. Bottom toolbar extends to both application edges.
10. World remains visible behind the Compass.
11. Quick Tools and Shortcuts use the same overlay visual language.
12. World pointer interaction is preserved outside active UI surfaces.
13. Keyboard and simulated Xbox controller navigation remain functional.
14. Editor View remains functional and visually unaffected except for shared intended styling.
15. Smaller desktop resolutions do not produce collisions or clipped controls.

Capture screenshots matching the owner's mockups:

- World View with EAST open
- World View with two or more panels open
- Compass open, full viewport
- Compass with Quick Tools and Shortcuts
- Editor View for regression comparison

### Implementation boundary

Do not rebuild the four-panel architecture, duplicate UI components, or rewrite navigation stores to achieve this visual correction.

Favor targeted layout/CSS changes and small shared-component adjustments.

Do not commit, push or deploy.

### Acceptance goal

**The world remains the visual foundation of Testing Grounds. The Compass and directional panels behave like integrated HUD overlays, not a collection of dark-framed windows.**

---

# TESTING GROUNDS — UI/UX REVISION 01
## TASK 04 — Compass, HUD, Loading Screen & Quick Access Refinement

### OBJECTIVE

Refine the visual identity, navigation feedback, and quick-access functionality of the existing Testing Grounds interface.

The four-panel architecture has already been established. This task is about making that interface more intuitive, visually restrained, and efficient to operate.

The owner's intended visual language is:

**White = neutral interface**

**Orange = primary selection and brand identity**

**Blue = secondary navigation and activation**

Avoid oversaturating the interface with orange.

This task has three stages:

1. Compass, HUD, loading-screen and panel styling.
2. Compass Quick Tools.
3. Customizable Compass Shortcuts.

Complete and validate each stage before proceeding to the next.

---

## 1. WORKSPACE AND PREREQUISITES

Active development worktree:

`D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`

Branch:

`feat/terrain-export-ui-v2`

Read:

- `AGENTS.md`
- Demo 1.0 stability register
- UI/UX Revision 01 implementation reports
- Task 03 completion report
- Existing Compass, navigation, input and panel implementations

**Do not begin implementation until Task 03 is finished and reviewed.**

Task 03 may have modified controller focus, Tree Interaction, Camera and Physics controls. Inspect the actual code before extending those systems.

Preserve all completed UI changes and intentionally excluded files.

Do not commit, push, merge or deploy.

### Preserve the established architecture

**ONE INTERFACE. TWO STARTING VIEWS. FOUR SHARED PANELS.**

World View starts with a clear world and only the Compass icon as persistent interface chrome.

Editor View starts with all four directional panels expanded.

Users can independently open and collapse any combination of the four panels.

The four shared panels remain:

- TOP — WORLD // MAP
- BOTTOM — OBJECTS // LIBRARY
- LEFT — WORLD EDITOR
- RIGHT — DEV TOOLS

The Compass is the navigation gateway, not a fifth panel.

Do not rebuild these panels or reintroduce duplicated feature implementations.

Preserve the owner's approved title screen, including its existing desktop/Xbox start navigation, Enter World and Blank Canvas actions.

---

# STAGE A — VISUAL AND HUD REFINEMENT

## 2. Compass — neutral appearance

The opened Compass radial menu should have a predominantly white interface.

Change existing orange graphics in the Compass overlay to white, including:

- Compass artwork
- Compass graphic/logo
- Upper-left logo displayed within the Compass interface
- Inactive directional indicators
- Neutral navigation labels
- Other inactive orange Compass decorations

**Exception: `WORLD//` remains orange.**

This exception applies to the Compass interface.

Do not recolor the official orange logo on the approved title screen or globally modify shared brand SVG assets.

Maintain readable contrast against the dark interface.

### Default appearance

When the Compass first opens:

- Unselected directions are white.
- Unselected text is white.
- Compass artwork is white.
- No large orange glow dominates the menu.
- The overall visual presentation is minimal and technical.

---

## 3. Compass — primary navigation color

At the first navigation level, UP, DOWN, LEFT and RIGHT correspond to the directional panels.

When a direction is selected:

1. Its corresponding Compass point transitions from white to orange.
2. The point uses a subtle orange gradient/fade rather than an abrupt solid-color change.
3. Its text changes from white to orange.
4. Previously selected elements return to neutral white.

Use the existing brand orange:

`#FF4800`

Keep transitions responsive, especially for Xbox D-pad and left-stick navigation.

Do not introduce delayed selection or input lag merely to accommodate animations.

Selecting a direction must continue to toggle the corresponding shared panel without automatically closing other open panels.

---

## 4. Compass — secondary navigation color and rotation

When entering a secondary Compass menu, visually communicate that the user has moved deeper into the navigation hierarchy.

Required behavior:

- Animate the Compass turning/rotating into its secondary state.
- Change the active gradient color from orange to blue.
- Selected secondary text becomes blue.
- Neutral labels remain white.
- Returning to the previous level restores the primary orange selection treatment.
- The Compass returns smoothly to its appropriate orientation.

Use a restrained blue accent consistent with existing Testing Grounds activation styling.

Avoid excessive glow or bloom.

### Important navigation constraint

The rotation must not break or confuse directional selection.

If rotating the full interactive Compass would make the D-pad mapping inconsistent with the visible directions, rotate only the appropriate decorative Compass layer while keeping the navigation targets spatially predictable.

The user should never have to guess whether pressing UP now selects LEFT because the artwork rotated.

Respect reduced-motion preferences.

### Navigation depth

- Primary selection: orange
- Secondary selection: blue
- Deeper existing tool levels: preserve the established hierarchy and use a consistent secondary-level treatment

Do not change the actual registered tools or break direct World-first tool activation.

---

## 5. Compass text cleanup

Make the following changes:

**Replace:**

`[PARENT]`

**With:**

`[BACK]`

Remove the persistent instructional text currently explaining keyboard/controller navigation, including wording such as:

`Arrows / D-Pad: select...`

Do not remove functional tool names or navigation labels.

Preserve accessible labels, tooltips where appropriate, and existing keyboard/Xbox operation.

### Navigation preservation

Maintain the approved behavior:

- Xbox Menu/Start opens the Compass.
- D-pad and left stick navigate.
- A confirms.
- B backs out or closes the Compass.
- Keyboard navigation remains functional.
- Direct tool activation returns control to the world.

When navigating within secondary menus, B should back out according to the established menu hierarchy rather than indiscriminately closing all UI.

---

## 6. Dev Tools — visual redesign

The canonical EAST panel is named:

**DEV TOOLS**

This panel contains:

- CHARACTER
- TERRAIN
- CAMERA
- PHYSICS
- ATMOSPHERE
- WORLD
- MATERIALS

The owner considers its existing orange section backgrounds excessive.

### Required styling

Replace solid orange section-header backgrounds with:

- Dark/black panel backgrounds
- White Special Gothic Expanded One headings
- Minimal monochrome separators
- White or muted-gray secondary text
- Purposeful color on selected or activated elements only

Preserve existing sections, controls, and settings.

Reuse the existing installed font and design tokens where possible.

Do not introduce new font dependencies.

### Color hierarchy

White and gray should dominate the interface.

Orange should identify primary selection, branding or actively manipulated controls.

Blue should represent secondary activation states where applicable.

Avoid arbitrary combinations of orange and blue that obscure the distinction.

**This is a visual refinement, not a change to the underlying settings architecture.**

---

## 7. Slider styling

Update the shared Dev Tools slider appearance.

### Track

Use a white-to-dark-gray gradient.

### Knob

- Default: white
- Inactive: white
- Actively manipulated: orange

Only the slider currently being manipulated should have an orange knob.

A slider should return to its inactive appearance after the interaction finishes.

Support pointer, keyboard and controller interaction.

### Focus vs active adjustment

Preserve a visible keyboard/controller focus indicator even when the user is not yet adjusting the slider.

Do not confuse focus with active manipulation.

If the existing controller system uses an explicit slider-adjustment mode, the knob should become orange while that mode is active and return to white when adjustment ends.

Do not change slider data ranges, bindings, validation or physics behavior.

Task 03's FPV Speed and Physics corrections must remain intact.

---

## 8. Compact Crash Tester selector

Location:

**EAST → DEV TOOLS → CHARACTER**

Replace the long character selection list with compact previous/next controls.

Example:

`<    CRASH TESTER 02    >`

Requirements:

- Use the existing character registry.
- Display the currently selected character.
- Previous/next arrows switch between available variants.
- Preserve character selection behavior and animation compatibility.
- Make the arrows usable by mouse, keyboard and Xbox.
- Respect existing selection boundaries or wrapping conventions.
- Do not create nonexistent variants.

Preserve Crash Tester 2.0 and the ability to select the other registered character variants.

Do not modify character geometry, animation files or movement algorithms.

---

## 9. Simplify panel controls

Replace verbose commands such as:

- CLOSE LEFT
- CLOSE RIGHT
- CLOSE TOP
- CLOSE BOTTOM

With concise symbols.

Use:

- `X` for closing a contextual interface
- `+` for opening or expanding
- `−` for collapsing

Keep accessible names and tooltips so these symbols remain understandable.

Preserve the existing independent visibility behavior.

Collapsing one directional panel must not close the other panels.

### Important distinction

The user may keep any combination of one, two, three or four panels open.

Do not reintroduce the previous exclusive-panel limitation.

Do not create additional permanent controls in the clean World View.

Keep the existing Editor View [PANELS] management available from its established navigation location.

---

## 10. Loading screen

Refine the existing loading-screen Compass.

Required changes:

1. Remove its orange glow.
2. Make the Compass white.
3. Animate it with a slow, smooth, continuous rotation.
4. Keep the animation understated and consistent with the technical HUD aesthetic.

A slow rotation cycle around 12–20 seconds is an acceptable starting point; refine based on the existing loading-screen composition.

Respect `prefers-reduced-motion`.

Do not change loading progress, initialization, model requests or transition timing.

Do not change the approved title-screen layout or artwork.

---

## 11. Stage A validation

Before implementing Quick Tools or Shortcuts:

- Run the production build.
- Run relevant UI and controller regressions.
- Verify Compass primary and secondary navigation.
- Test Dev Tools sliders with mouse, keyboard and simulated Xbox input.
- Verify all registered character choices remain accessible.
- Confirm independent panel collapse/reopening.
- Inspect the loading-screen animation.
- Confirm the title screen remains unchanged.

Capture screenshots of:

- Neutral Compass
- Orange primary selection
- Blue secondary selection
- Dev Tools
- Character selector
- Updated slider states
- Loading screen

Proceed to Stage B only after Stage A passes.

---

# STAGE B — COMPASS QUICK TOOLS

## 12. Quick Tools location

Add a compact Quick Tools section on the RIGHT side of the opened Compass interface.

This is a set of immediate-access actions.

**Quick Tools is NOT the EAST Dev Tools panel.**

The EAST panel contains the full collection of settings.

Compass Quick Tools should contain only:

1. FPV Mode Toggle
2. Guides / Markers Toggle
3. Undo
4. Redo

These controls must not obscure the four directional navigation targets.

Do not create a fifth directional panel.

---

## 13. FPV Mode Toggle

Connect to the existing first-person-view mode.

Requirements:

- Toggle FPV on/off.
- Reflect the actual current state.
- Work from the Compass without opening Dev Tools.
- Preserve existing character and camera transitions.
- Respect controller input ownership.
- Remain synchronized with other existing FPV controls.

Do not modify the FPV Speed functionality corrected in Task 03.

If FPV activation is unavailable in a particular state, show accurate feedback.

---

## 14. Guides / Markers Toggle

Provide immediate control over the existing world-space guides and markers.

Inspect the current guide/marker settings and identify the appropriate existing visibility controls.

The Quick Tool should:

- Toggle the intended existing overlays.
- Reflect their current state.
- Keep the actual setting synchronized with existing controls.
- Avoid hiding essential active-tool feedback or interaction targets.

Do not build a new guide-rendering system.

If multiple guide categories require coordination, implement a small shared action that delegates to existing visibility settings.

Document precisely which overlays are affected.

---

## 15. Undo and Redo

Connect both actions directly to the existing history system.

Requirements:

- Undo performs the existing Undo operation.
- Redo performs the existing Redo operation.
- Both reflect availability.
- Unavailable actions show an appropriate disabled state.
- Activating them does not corrupt history or selection.
- They must not accidentally alter Compass navigation depth.

Test against real terrain and object edits, not only mocked history state.

Preserve the object Undo/Redo corrections from Task 12.

---

## 16. Quick Tools interaction

Quick Tools must support:

- Mouse
- Keyboard
- Simulated Xbox gamepad
- Clear focus indicators
- A/Enter activation
- B/Escape cancellation
- Immediate feedback

### Controller navigation

Inspect the current Compass focus structure.

Introduce an explicit way to navigate between the radial directions and the Quick Tools section without conflicting with the four cardinal panel selections.

Do not hardcode a new controller mapping if an existing suitable navigation mechanism is already available.

Preserve fast Menu-button access and intuitive D-pad/left-stick navigation.

Quick Tools should not require users to enter an unrelated directional panel.

### Stage B tests

Verify:

1. FPV toggles correctly.
2. Guides/Markers visibly change.
3. Undo restores an actual terrain or object edit.
4. Redo reapplies it.
5. Disabled history actions behave correctly.
6. Controller focus can enter and leave Quick Tools.
7. B returns to the appropriate Compass context.
8. Panel visibility and tool selection remain unaffected unless the chosen action intentionally changes them.

Run relevant regression tests before proceeding to Stage C.

---

# STAGE C — CUSTOMIZABLE COMPASS SHORTCUTS

## 17. Shortcuts location

Add customizable shortcut slots on the LEFT side of the opened Compass interface.

These are distinct from the immediate Quick Tools on the right.

Start with four slots.

An empty slot displays a compact `+` control.

The slots should remain visually integrated with the Compass without obscuring primary navigation.

---

## 18. Shortcut assignment

The user should be able to:

1. Open the Compass.
2. Select an empty shortcut slot.
3. Click or activate `+`.
4. Browse available tools and functions.
5. Assign an action to that slot.
6. Activate the assigned shortcut later.
7. Replace an existing assignment.
8. Clear an assignment.

Example assignments:

- Raise Terrain
- Lower Terrain
- Smooth Terrain
- Object // Place
- Other existing tools and registered functions

Use the existing action/tool registry wherever practical.

### Important

The intent is to allow shortcuts to **any supported existing tool or function**, not an artificially narrow hardcoded list.

Inspect the available tool and action registrations.

Provide an extensible way to expose eligible actions while respecting their current availability and required context.

Do not invent unsupported actions or create duplicate implementations.

Organize the assignment picker into understandable categories if necessary.

Avoid a large nested menu just to assign a shortcut.

---

## 19. Shortcut activation behavior

Activating a shortcut must invoke the original registered operation.

### World tools

For actions such as Raise Terrain:

- Activate the existing tool.
- Dismiss the Compass as appropriate.
- Restore world input ownership.
- Allow immediate world interaction.

### Object placement

For Object // Place:

- Use the existing placement workflow.
- Respect the currently selected object.
- If an object must be chosen first, route the user to the existing SOUTH library selection workflow.
- Do not silently choose an arbitrary model.
- Preserve the established Back to Library interaction.

### Immediate actions

For available toggles or commands:

- Perform the existing action.
- Reflect its new state.
- Avoid unintended panel or tool changes.

### Context-dependent actions

If an assigned action cannot currently run:

- Do not trigger an unrelated fallback.
- Provide clear feedback.
- Preserve the user's shortcut assignment.

Do not serialize executable functions as user preferences.

---

## 20. Shortcut persistence

Shortcut assignments are user interface preferences.

They are not part of the terrain, object or world geometry.

Reuse existing settings/persistence infrastructure when appropriate.

Otherwise use a small versioned local preference record.

Requirements:

- Assignments survive ordinary page reloads.
- The same assignments appear in World View and Editor View.
- Assignments do not reset when panels open or close.
- Missing or renamed registered actions are handled gracefully.
- Clearing one shortcut does not affect other slots.
- No change to the existing World save format is required.

Store stable action IDs rather than executable callbacks.

Do not introduce cloud accounts or remote user-preference storage.

---

## 21. Shortcut controller navigation

The shortcut slots and assignment picker must be accessible to keyboard, mouse and Xbox controller.

Preserve:

- D-pad / left-stick navigation
- A confirmation
- B cancellation/back navigation
- Existing Compass cardinal directions
- Secondary menu navigation
- World-first tool activation

Do not make the radial Compass harder to navigate merely to accommodate Quick Tools and Shortcuts.

The left and right auxiliary sections should have predictable focus entry and exit.

Ensure an assigned shortcut can be activated rapidly without navigating through several unnecessary menu levels.

---

## 22. Stage C validation

Run build and focused regression tests.

Browser-test:

1. Open the Compass.
2. Assign Raise Terrain to an empty slot.
3. Activate the shortcut.
4. Sculpt actual terrain.
5. Assign Object // Place to another slot.
6. Activate placement and return to the library.
7. Assign a supported existing function to another slot.
8. Replace a shortcut.
9. Clear a shortcut.
10. Reload the application and confirm persistence.
11. Verify state across World View and Editor View.
12. Verify unavailable registered actions fail gracefully.
13. Navigate shortcuts using simulated Xbox input.
14. Navigate back to the four cardinal Compass directions.
15. Confirm no stuck focus or input locks.
16. Confirm existing tools and object placement are unchanged.

Capture screenshots of:

- Empty shortcuts
- Shortcut assignment picker
- Assigned shortcuts
- Quick Tools and Shortcuts displayed alongside the Compass
- A shortcut activated in the world

---

# FINAL REGRESSION AND ACCEPTANCE

## 23. Preserve existing functionality

This task must not regress:

- World View's unobstructed default
- Independently configurable directional panels
- Editor View layout
- Compass primary panel navigation
- Direct World-first tool activation
- Existing keyboard/Xbox navigation
- Task 03 controller and Tree Interaction fixes
- Existing object placement and editing
- Task 02B SOUTH panel consolidation
- Procedural trees and Scatter
- Save/Load World
- Terrain Export
- Object Undo/Redo
- Crash Tester 2.0
- Animation library
- Character and camera behavior
- Approved title-screen composition

### Final test execution

Run:

- Production build
- Relevant existing Node suites
- Browser UI smoke tests
- World-first navigation regressions
- Simulated Xbox controller tests
- Forest/object persistence regressions
- Character/camera regressions
- Focused Quick Tools and Shortcuts tests

Report browser console errors and failed network requests.

Do not claim actual Xbox hardware verification without testing physical hardware.

---

## 24. Scope exclusions

Do not implement or modify:

- Add Chunk geometry generation
- Chunk placement, adjacency or navigation logic
- New terrain regions
- Load/Save Project architecture
- New physics or traversal systems
- Combat
- Quest systems
- New animation libraries
- Persistent uploaded assets
- Unrelated engine refactors
- Title-screen redesign

**Task 05 will be dedicated exclusively to Add Chunk and its associated terrain/world behavior.**

Do not begin Task 05 automatically.

---

## 25. Completion report

Create:

`docs/codex/UI_UX_REVISION_01_TASK_04.md`

Include:

1. Files changed
2. Compass visual changes
3. Primary/secondary navigation behavior
4. Loading-screen refinement
5. Dev Tools styling
6. Slider visual and interaction results
7. Character selector
8. Panel control simplification
9. Quick Tools implementation
10. Shortcut registry, assignment and persistence
11. Xbox/controller navigation verification
12. Automated tests and screenshots
13. Any remaining bugs or deferred items

Distinguish between implemented, tested, and unverified functionality.

Keep the final summary concise; place detailed evidence in the report.

Do not commit, push, merge or deploy.

Stop after Task 04 for owner review.

### ACCEPTANCE GOAL

The Compass and HUD should feel like a cohesive, refined interface: white by default, orange for primary selection, blue for secondary navigation, minimal visual clutter, and rapid access to frequently used tools.

The Compass must remain intuitive and responsive with mouse, keyboard and Xbox controls.

Users should be able to navigate the world, open any combination of panels, activate Quick Tools, and customize shortcuts without losing the established World-first interaction experience.