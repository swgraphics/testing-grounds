import * as THREE from "three";

import {
  terrainSettings,
} from "../terrain/terrainSettings";

function clamp01(value) {
  return THREE.MathUtils.clamp(
    value,
    0,
    1
  );
}

function smoothRange(
  value,
  minimum,
  maximum
) {
  return THREE.MathUtils.smoothstep(
    clamp01(
      (value - minimum) /
        (maximum - minimum)
    ),
    0,
    1
  );
}

function mixColors(
  firstColor,
  secondColor,
  amount
) {
  return new THREE.Color().lerpColors(
    new THREE.Color(firstColor),
    new THREE.Color(secondColor),
    clamp01(amount)
  );
}

/*
 * Shared Atmosphere Palette V1
 *
 * Every atmospheric system should eventually read
 * colors and lighting values from this function.
 *
 * This keeps the sky, clouds, fog, water and
 * lighting visually synchronized.
 */
export function getAtmospherePalette() {
  const sunHeight =
    Number(
      terrainSettings.sunHeight
    ) || 0;

  const sunRotation =
    Number(
      terrainSettings.sunRotation
    ) || 0;

  const normalizedSunHeight =
    clamp01(sunHeight / 100);

  /*
   * Sunrise and sunset are strongest when the sun
   * is close to the horizon.
   *
   * With the current slider:
   *
   * 0–25   = night / below horizon
   * 25–45  = sunrise or sunset
   * 45–100 = daytime
   */
  const nightAmount =
    1 -
    smoothRange(
      normalizedSunHeight,
      0.12,
      0.38
    );

  const daylightAmount =
    smoothRange(
      normalizedSunHeight,
      0.32,
      0.68
    );

  const horizonDistance =
    Math.abs(
      normalizedSunHeight - 0.34
    );

  const sunsetAmount =
    clamp01(
      1 -
      horizonDistance / 0.28
    );

  /*
   * Night palette.
   */
  const nightZenith =
    new THREE.Color("#050915");

  const nightUpper =
    new THREE.Color("#101735");

  const nightHorizon =
    new THREE.Color("#251638");

  /*
   * Day palette.
   *
   * These values are intentionally more saturated
   * than the previous Drei Sky.
   */
  const dayZenith =
    new THREE.Color("#245ca8");

  const dayUpper =
    new THREE.Color("#5595cf");

  const dayHorizon =
    new THREE.Color("#b7d1e3");

  /*
   * Sunset palette.
   *
   * The violet and magenta colors are allowed to
   * travel much farther upward than the old thin
   * horizon band.
   */
  const sunsetZenith =
    new THREE.Color("#263b86");

  const sunsetUpper =
    new THREE.Color("#8b3fa8");

  const sunsetHorizon =
    new THREE.Color("#ff762f");

  const sunsetGlow =
    new THREE.Color("#ffb04a");

  let zenithColor =
    mixColors(
      nightZenith,
      dayZenith,
      daylightAmount
    );

  let upperSkyColor =
    mixColors(
      nightUpper,
      dayUpper,
      daylightAmount
    );

  let horizonColor =
    mixColors(
      nightHorizon,
      dayHorizon,
      daylightAmount
    );

  /*
   * Blend sunset colors over the normal day/night
   * transition.
   */
  zenithColor.lerp(
    sunsetZenith,
    sunsetAmount * 0.72
  );

  upperSkyColor.lerp(
    sunsetUpper,
    sunsetAmount * 0.92
  );

  horizonColor.lerp(
    sunsetHorizon,
    sunsetAmount
  );

  const sunColor =
    mixColors(
      "#b7c9ff",
      "#fff1cf",
      daylightAmount
    );

  sunColor.lerp(
    sunsetGlow,
    sunsetAmount
  );

  const ambientColor =
    mixColors(
      "#18213d",
      "#c8ddff",
      daylightAmount
    );

  ambientColor.lerp(
    "#e894b7",
    sunsetAmount * 0.48
  );

  const fogColor =
    mixColors(
      "#080b15",
      horizonColor,
      0.34 +
        sunsetAmount * 0.24
    );

  const cloudTopColor =
    mixColors(
      "#273143",
      "#f3f7fb",
      daylightAmount
    );

  cloudTopColor.lerp(
    "#ffd2cf",
    sunsetAmount * 0.62
  );

  const cloudBottomColor =
    mixColors(
      "#080b12",
      "#6c7784",
      daylightAmount
    );

  cloudBottomColor.lerp(
    "#ff8b5c",
    sunsetAmount * 0.72
  );

  const cloudEdgeColor =
    mixColors(
      cloudTopColor,
      sunColor,
      0.65
    );

  /*
   * Sun direction is shared with Lighting and will
   * later drive cloud rim lighting.
   */
  const sunAngle =
    THREE.MathUtils.lerp(
      0,
      Math.PI * 2,
      clamp01(
        sunRotation / 100
      )
    );

  const sunElevation =
    THREE.MathUtils.lerp(
      -0.22,
      1.25,
      normalizedSunHeight
    );

  const sunDirection =
    new THREE.Vector3(
      Math.cos(sunAngle) *
        Math.cos(sunElevation),

      Math.sin(sunElevation),

      Math.sin(sunAngle) *
        Math.cos(sunElevation)
    ).normalize();

  return {
    normalizedSunHeight,
    nightAmount,
    daylightAmount,
    sunsetAmount,

    zenithColor,
    upperSkyColor,
    horizonColor,
    sunColor,
    ambientColor,
    fogColor,

    cloudTopColor,
    cloudBottomColor,
    cloudEdgeColor,

    /*
     * Aurora values remain inactive until the hidden
     * Aurora state is implemented.
     */
    auroraColor:
      new THREE.Color("#65ffd0"),

    auroraIntensity: 0,

    sunDirection,
  };
}