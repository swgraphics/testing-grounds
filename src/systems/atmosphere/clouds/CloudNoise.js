import SimplexNoise from "simplex-noise";

export const baseNoise =
    new SimplexNoise("cloud-base");

export const detailNoise =
    new SimplexNoise("cloud-detail");