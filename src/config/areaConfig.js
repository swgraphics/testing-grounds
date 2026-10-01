export const AREA_CONFIG = [
  {
    id: "start",
    grid: "A1",
    name: "START",
    position: [80, 0, -160],
    discoveryRadius: 42,
    description: "High cliff overlook and world starting point",
    mapPosition: [0, 0],
    mapLabel: "A",
  },

  {
    id: "forest",
    grid: "B1",
    name: "FOREST",
    position: [-140, 0, -80],
    discoveryRadius: 50,
    description: "Terrain and landscape model tools",
    mapPosition: [1, 0],
    mapLabel: "B",
  },

  {
    id: "village",
    grid: "C1",
    name: "VILLAGE",
    position: [-80, 0, 60],
    discoveryRadius: 48,
    description: "Buildings and construction tools",
    mapPosition: [0, 1],
    mapLabel: "C",
  },

  {
    id: "arena",
    grid: "D1",
    name: "ARENA",
    position: [80, 0, 0],
    discoveryRadius: 50,
    description: "Combat customization tools",
    mapPosition: [1, 1],
    mapLabel: "D",
  },

  {
    id: "custom-chunk",
    grid: "E1",
    name: "CUSTOM CHUNK",
    position: [0, 0, 110],
    discoveryRadius: 55,
    description: "Custom world chunk",
    mapPosition: [2, 0],
    mapLabel: "E",
  },
];

export function getAreaById(areaId) {
  return AREA_CONFIG.find((area) => area.id === areaId);
}