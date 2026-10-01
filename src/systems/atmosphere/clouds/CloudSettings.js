import { useWorldStore } from "../../world/worldStore";

export const cloudSettings = {

  brightness: 1.25,

  shadowStrength: 0.50,

  coverage: 0.57,

  density: 0.80,

  softness: 0.60,

  puffiness: 0.50,

  wispy: 0.50,

  scale: 0.90,

  stretch: 0.50,

  detail: 1.95,

  height: 40,

  speed: 2.25,

  windDirection: 0,
  rotation: 0,

  upperColor: "#7a7474",

  lowerColor: "#242425",
  
  edgeColor: "#fdf7fd",

  usePalette: true

};
export function updateCloudSetting(key, value) {
  cloudSettings[key] = value;

  const state = useWorldStore.getState();
  state.updateAtmosphere({
    clouds: {
      ...state.world.atmosphere.clouds,
      [key]: value,
    },
  });
}