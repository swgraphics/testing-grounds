export const AREA_CONFIG = [
  {
    id: "start",
    grid: "A1",
    name: "START",
    position: [0, 0, 0],
    discoveryRadius: 42,
    description: "Character models and animation tools",
  },

  {
    id: "forest",
    grid: "B1",
    name: "FOREST",
    position: [-140, 0, -80],
    discoveryRadius: 50,
    description: "Terrain and landscape model tools",
  },

  {
    id: "village",
    grid: "C1",
    name: "VILLAGE",
    position: [-80, 0, 60],
    discoveryRadius: 50,
    description: "Buildings and construction tools",
  },

  {
    id: "combat-arena",
    grid: "D1",
    name: "COMBAT ARENA",
    position: [80, 0, 0],
    discoveryRadius: 48,
    description: "Combat customization tools",
  },

  {
    id: "testing-grounds",
    grid: "E1",
    name: "TESTING GROUNDS",
    position: [0, 0, 110],
    discoveryRadius: 55,
    description: "Traversal and controller testing",
  },
];

export function getAreaById(areaId) {
  return AREA_CONFIG.find((area) => area.id === areaId);
}