# TESTING GROUNDS

### A real-time world-building sandbox for game creators.
![Testing Grounds](C:\Users\Tavis\testing-grounds\public\images\screenshots\testing-grounds.png)
Testing Grounds is an experimental browser-based 3D platform designed to give game creators a place to **build, test, visualize, and iterate on ideas before committing them to a finished game.**

Rather than functioning as a traditional game, Testing Grounds is being developed as a reusable creative framework — part editor, part sandbox, and part development laboratory.

The goal is simple:

> **Make experimentation faster.**

---

## 🎮 What Is Testing Grounds?

Testing Grounds combines procedural world generation, real-time 3D rendering, environmental systems, character exploration, physics, and live development controls into a single interactive environment.

The long-term vision is to allow creators to:

* Generate and edit terrain
* Build and customize environmental assets
* Place their own models
* Experiment with materials and shaders
* Populate worlds with vegetation and environmental effects
* Test character movement and traversal
* Build persistent, chunk-based worlds
* Save, load, and export environments
* Experiment with gameplay ideas inside the worlds they create

Instead of deciding what a game should be before building it, Testing Grounds is designed to provide a place where **the game can be discovered through experimentation.**

---

# 🌎 Current Capabilities

Testing Grounds has already evolved beyond a basic terrain prototype.

### Procedural Terrain

The current terrain system supports procedural landscape generation with adjustable parameters for:

* Terrain height
* Mountains
* Cliff sharpness
* Rolling hills
* Ridges
* Plateaus
* Terrain strength
* World seed
* Environmental scatter

Terrain generation is deterministic, allowing environments and environmental objects to be regenerated consistently from the same seed.

### 🌲 Environmental Systems

The world can be populated with procedural environmental elements including:

* Trees
* Foliage
* Rocks
* Water
* Atmospheric effects

Environmental wind can drive animated vegetation and water, creating a connected environmental system rather than isolated visual effects.

### ☁️ Atmosphere

Testing Grounds includes a procedural atmosphere system with live controls for:

* Dynamic clouds
* Cloud coverage
* Cloud density
* Cloud softness
* Cloud scale
* Cloud stretch
* Cloud detail
* Cloud brightness
* Cloud shadow strength
* Fog
* Sky haze
* Sun height
* Sun rotation
* Stars

Clouds are generated using custom GLSL shader code and procedural noise rather than relying exclusively on static textures.

### 🧍 Character Exploration

The generated environments can be explored using a third-person character controller with configurable:

* Movement
* Camera behavior
* Character selection
* Development settings

The project is also being developed with mobile interaction in mind, including virtual movement and camera controls.

---

# 🛠️ Development Tools

One of the core ideas behind Testing Grounds is that the environment should also be a **laboratory for development.**

The project includes an interactive Dev Tools system that allows parameters to be changed while the world is running.

Instead of rebuilding the application every time something needs to be tested, developers can modify environmental and gameplay parameters in real time and immediately observe the results.

This makes it possible to quickly experiment with questions like:

* What happens if the terrain is twice as tall?
* How does the environment look with different atmospheric conditions?
* How does vegetation respond to stronger wind?
* How does a different camera height change the perceived scale of the world?
* How do different procedural parameters affect the landscape?

The goal is to make iteration itself part of the experience.

---

# 💻 Technology

Testing Grounds is being built as a modern browser-based 3D application.

### Core Stack

* **React** — application architecture
* **Vite** — development and build tooling
* **Three.js** — real-time 3D rendering
* **React Three Fiber** — React integration for Three.js
* **Drei** — Three.js / R3F utilities
* **Rapier** — physics and collision systems
* **GLSL** — custom procedural shaders
* **Git / GitHub** — version control and project development

The web-based architecture makes the project accessible without requiring users to install a traditional desktop game engine or editor.

---

# ⭐ What Makes Testing Grounds Different?

Testing Grounds is not intended to be another procedural terrain generator.

Its larger goal is to connect **world creation with gameplay experimentation.**

A creator should eventually be able to build an environment, populate it with assets, modify the terrain, place characters and objects, experiment with traversal and gameplay systems, save the resulting world, and eventually export the pieces needed to turn that experiment into a real game.

This creates a space between:

**"What if this worked?"**

and

**"Now we need to build an entire game around it."**

Testing Grounds is intended to live in that space.

It is a **creative proving ground** for game development.

---

# 🗺️ Roadmap

The roadmap is organized around building the underlying world-authoring foundation first, then expanding into increasingly sophisticated gameplay and world systems.

## 01 — Asset Builders

**Tree Builder → Rock Builder → Foliage Builder → Material Builder → Shader Builder → Upload / Place Models**

The first major content-authoring pipeline will allow creators to build and customize the environmental pieces that populate their worlds.

---

## 02 — Terrain Editor

**Raise / Lower → Flatten → Path → Plateau → River → Lake → Region Editing → Drone Editor**

This phase moves Testing Grounds from procedural terrain generation toward direct world editing.

The objective is to make terrain something creators can actively sculpt and design rather than simply generate.

---

## 03 — Interactive World

### World → Chunks → Global Coordinates → Deterministic Generation → Persistence → Seamless Borders → Save / Load / Export

This is one of the project's largest architectural milestones.

The world will eventually be divided into persistent chunks supporting:

* 3×3 active chunk loading
* Global-coordinate terrain sampling
* Deterministic chunk seeds
* Seamless borders
* Persistent terrain changes
* Per-chunk save data
* Loading and saving chunks
* World persistence
* World export

### Why Chunk Architecture Comes First

Advanced terrain-editing systems such as rivers, lakes, and region editing will eventually need to understand **which chunk owns a particular change.**

For that reason, the chunk architecture will be established before too many advanced terrain-editing systems are built.

---

## 04 — Traversal

**Vault → Climb → Wall Run → Slide → Ledge Grab → Rope → Zipline**

Once the world-authoring foundation is established, Testing Grounds will expand beyond basic character movement into a broader traversal system.

The goal is to turn the generated environment into a testing ground for movement mechanics as well as world design.

---

## 05 — World Shape

**Flat → Curved Shader → Eventually True Spherical World**

Testing Grounds will eventually explore different approaches to world geometry and presentation, moving from traditional flat terrain toward curved and ultimately spherical environments.

This phase will also introduce an aerial world-building workflow.

### Planned World-Building Features

* Aerial World Builder
* Chunk Selection
* Add / Duplicate / Delete Chunks
* Chunk Presets
* Per-Chunk Editing
* Global Controls
* Selected-Region Controls

These systems will build directly on top of the chunk architecture rather than existing as a separate editor.

---

# 🔬 Development Philosophy

Testing Grounds is being built around a simple principle:

> **Build the tools that make it easier to build the next tool.**

Instead of locking the project into a single game concept too early, the goal is to create a flexible foundation capable of supporting many different types of games and experiences.

The same world-building framework could eventually support:

* Exploration
* Survival
* RPGs
* Combat arenas
* Procedural worlds
* Tabletop-inspired environments
* Multiplayer experiments
* Gameplay prototypes
* Experimental game mechanics

The final game does not need to be defined yet.

The environment is the experiment.

---

# 🚧 Project Status

**Testing Grounds is currently in active experimental development.**

The project is intentionally evolving system by system, with an emphasis on building a strong technical foundation before adding increasingly complex features.

Current development is focused on transitioning from:

**Procedural Terrain Demo**

→ **World-Building Tool**

→ **Persistent Interactive World**

→ **Game Development Sandbox**

---

## The Long-Term Vision

Testing Grounds is ultimately intended to become a place where ideas can move quickly from concept to playable experiment.

Build a world.

Change it.

Break it.

Try something else.

See what works.

Then build the game around it.

**Testing Grounds is a system for turning ideas into playable worlds.**


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
