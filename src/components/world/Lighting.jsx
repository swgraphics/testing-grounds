import {
  useEffect,
  useState,
} from "react";

import {
  getAtmospherePalette,
} from "../../systems/atmosphere/atmospherePalette";

export default function Lighting() {
  const [, refresh] =
    useState(0);

  useEffect(() => {
    function handleTerrainChange(
      event
    ) {
      const lightingKeys = [
        "sunHeight",
        "sunRotation",
      ];

      if (
        !lightingKeys.includes(
          event.detail?.key
        )
      ) {
        return;
      }

      refresh(
        (value) => value + 1
      );
    }

    window.addEventListener(
      "terrain-settings-changed",
      handleTerrainChange
    );

    return () => {
      window.removeEventListener(
        "terrain-settings-changed",
        handleTerrainChange
      );
    };
  }, []);

  const palette =
    getAtmospherePalette();

  const sunDistance = 180;

  const sunPosition = [
    palette.sunDirection.x *
      sunDistance,

    palette.sunDirection.y *
      sunDistance,

    palette.sunDirection.z *
      sunDistance,
  ];

  /*
   * A weaker light from the opposite horizontal
   * direction simulates broad atmospheric bounce.
   *
   * It does not cast shadows.
   */
  const bouncePosition = [
    -palette.sunDirection.x *
      sunDistance,

    Math.max(
      55,
      Math.abs(
        palette.sunDirection.y
      ) *
        sunDistance *
        0.55
    ),

    -palette.sunDirection.z *
      sunDistance,
  ];

  /*
   * Main directional sunlight controls the strong
   * highlights and cast shadows.
   */
  const directionalIntensity =
    0.55 +
    palette.daylightAmount *
      2.85 +
    palette.sunsetAmount *
      0.5;

  /*
   * Neutral fill preserves the charcoal materials
   * instead of tinting every shadow entirely blue,
   * purple or orange.
   */
  const neutralFillIntensity =
    0.72 +
    palette.daylightAmount *
      0.48;

  /*
   * Colored sky light links shaded surfaces to the
   * current atmosphere palette.
   */
  const hemisphereIntensity =
    0.65 +
    palette.daylightAmount *
      0.75 +
    palette.sunsetAmount *
      0.15;

  /*
   * Opposite-direction bounce recovers cliffs,
   * trunks and characters that face away from the
   * sun without removing the primary shadows.
   */
  const bounceIntensity =
    0.42 +
    palette.daylightAmount *
      0.48;

  return (
    <>
      {/*
       * Neutral gameplay fill.
       *
       * This prevents the foreground from becoming
       * pure black even when it is shaded from the
       * directional sun.
       */}
      <ambientLight
        color="#d9e0e6"
        intensity={
          neutralFillIntensity
        }
      />

      {/*
       * Palette-colored sky illumination.
       */}
      <hemisphereLight
        color={
          palette.upperSkyColor
        }
        groundColor="#343941"
        intensity={
          hemisphereIntensity
        }
      />

      {/*
       * Primary sun and shadow source.
       */}
      <directionalLight
        castShadow
        position={sunPosition}
        color={palette.sunColor}
        intensity={
          directionalIntensity
        }
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-220}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
      />

      {/*
       * Soft atmospheric bounce from the opposite
       * direction. It intentionally casts no shadow.
       */}
      <directionalLight
        position={bouncePosition}
        color={
          palette.horizonColor
        }
        intensity={
          bounceIntensity
        }
        castShadow={false}
      />
    </>
  );
}