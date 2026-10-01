import CloudField from "../../systems/atmosphere/clouds/CloudField";
import Aurora from "./Aurora";
import GroundFog from "./GroundFog";
import {
  Stars,
} from "@react-three/drei";

import {
  useFrame,
  useThree,
} from "@react-three/fiber";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import {
  terrainSettings,
} from "../../systems/terrain/terrainSettings";

import {
  getAtmospherePalette,
} from "../../systems/atmosphere/atmospherePalette";

const SKY_VERTEX_SHADER = `
  varying vec3 vWorldDirection;

  void main() {
    vec4 worldPosition =
      modelMatrix *
      vec4(position, 1.0);

    vWorldDirection =
      normalize(
        worldPosition.xyz -
        cameraPosition
      );

    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform vec3 uZenithColor;
  uniform vec3 uUpperSkyColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;

  uniform float uSunsetAmount;
  uniform float uHorizonSpread;
  uniform float uSunGlowStrength;
  uniform float uRainbowEnabled;
  uniform float uRainbowIntensity;
  uniform float uRainbowWidth;

  varying vec3 vWorldDirection;

  void main() {
    vec3 direction =
      normalize(vWorldDirection);

    /*
     * Convert vertical direction into a 0–1 gradient.
     *
     * Raising horizonSpread pushes the horizon and
     * sunset colors farther upward into the sky.
     */
    float heightValue =
      clamp(
        direction.y * 0.5 + 0.5,
        0.0,
        1.0
      );

    float horizonBlend =
      smoothstep(
        0.0,
        uHorizonSpread,
        heightValue
      );

    float upperBlend =
      smoothstep(
        0.22,
        0.88,
        heightValue
      );

    vec3 skyColor =
      mix(
        uHorizonColor,
        uUpperSkyColor,
        horizonBlend
      );

    skyColor =
      mix(
        skyColor,
        uZenithColor,
        upperBlend
      );

    /*
     * Add directional sun glow.
     *
     * This is not a hard sun disc yet. It creates a
     * broad atmospheric glow around the sun.
     */
    float sunAlignment =
      max(
        dot(
          direction,
          normalize(
            uSunDirection
          )
        ),
        0.0
      );

    float broadGlow =
      pow(
        sunAlignment,
        8.0
      );

    float tightGlow =
      pow(
        sunAlignment,
        72.0
      );

    float glowStrength =
      broadGlow *
        uSunGlowStrength +
      tightGlow *
        1.4;

    skyColor +=
      uSunColor *
      glowStrength;

    /*
     * Slight saturation lift during sunset.
     */
    skyColor =
      mix(
        skyColor,
        skyColor *
          vec3(
            1.12,
            1.04,
            1.1
          ),
        uSunsetAmount
      );

    // A deliberately visible rainbow arc opposite the sun.
    // Width is the total arc width, while the colors are distributed across it.
    vec3 rainbowDirection = normalize(-uSunDirection);
    float rainbowAngle = acos(clamp(dot(direction, rainbowDirection), -1.0, 1.0));
    float rainbowCenter = 0.68;
    float rainbowHalfWidth = max(0.09, uRainbowWidth / 100.0);
    float rainbowDistance = abs(rainbowAngle - rainbowCenter);
    float rainbowBand = 1.0 - smoothstep(rainbowHalfWidth * 0.72, rainbowHalfWidth, rainbowDistance);
    float rainbowT = clamp(
      (rainbowAngle - (rainbowCenter - rainbowHalfWidth)) /
      max(0.001, rainbowHalfWidth * 2.0),
      0.0,
      1.0
    );

    vec3 rainbowColor;
    if (rainbowT < 0.2) {
      rainbowColor = mix(vec3(1.0, 0.12, 0.08), vec3(1.0, 0.78, 0.08), rainbowT / 0.2);
    } else if (rainbowT < 0.4) {
      rainbowColor = mix(vec3(1.0, 0.78, 0.08), vec3(0.12, 0.95, 0.42), (rainbowT - 0.2) / 0.2);
    } else if (rainbowT < 0.6) {
      rainbowColor = mix(vec3(0.12, 0.95, 0.42), vec3(0.10, 0.52, 1.0), (rainbowT - 0.4) / 0.2);
    } else if (rainbowT < 0.8) {
      rainbowColor = mix(vec3(0.10, 0.52, 1.0), vec3(0.48, 0.16, 1.0), (rainbowT - 0.6) / 0.2);
    } else {
      rainbowColor = vec3(0.48, 0.16, 1.0);
    }

    float rainbowHeight = smoothstep(-0.08, 0.34, direction.y);
    skyColor += rainbowColor * rainbowBand * rainbowHeight * uRainbowEnabled * uRainbowIntensity * 1.15;

    gl_FragColor =
      vec4(
        skyColor,
        1.0
      );
  }
`;

function mapRange(
  value,
  inputMinimum,
  inputMaximum,
  outputMinimum,
  outputMaximum
) {
  return (
    outputMinimum +
    ((value - inputMinimum) /
      (inputMaximum - inputMinimum)) *
      (outputMaximum - outputMinimum)
  );
}

function SkyDome({
  palette,
  rainbowEnabled,
  rainbowIntensity,
  rainbowWidth,
}) {
  const meshRef =
    useRef(null);

  const material =
    useMemo(() => {
      return new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: true,

        uniforms: {
          uZenithColor: {
            value:
              palette.zenithColor.clone(),
          },

          uUpperSkyColor: {
            value:
              palette.upperSkyColor.clone(),
          },

          uHorizonColor: {
            value:
              palette.horizonColor.clone(),
          },

          uSunColor: {
            value:
              palette.sunColor.clone(),
          },

          uSunDirection: {
            value:
              palette.sunDirection.clone(),
          },

          uSunsetAmount: {
            value:
              palette.sunsetAmount,
          },

          /*
           * Higher values push horizon color farther
           * up into the atmosphere.
           */
          uHorizonSpread: {
            value: 0.66,
          },

          uSunGlowStrength: {
            value:
              0.32 +
              palette.sunsetAmount *
                0.9,
          },
          uRainbowEnabled: { value: rainbowEnabled ? 1 : 0 },
          uRainbowIntensity: { value: rainbowIntensity / 100 },
          uRainbowWidth: { value: rainbowWidth },
        },

        vertexShader:
          SKY_VERTEX_SHADER,

        fragmentShader:
          SKY_FRAGMENT_SHADER,
      });
    }, []);

  useEffect(() => {
    material.uniforms
      .uZenithColor.value.copy(
        palette.zenithColor
      );

    material.uniforms
      .uUpperSkyColor.value.copy(
        palette.upperSkyColor
      );

    material.uniforms
      .uHorizonColor.value.copy(
        palette.horizonColor
      );

    material.uniforms
      .uSunColor.value.copy(
        palette.sunColor
      );

    material.uniforms
      .uSunDirection.value.copy(
        palette.sunDirection
      );

    material.uniforms
      .uSunsetAmount.value =
        palette.sunsetAmount;

    material.uniforms
      .uSunGlowStrength.value =
        0.32 +
        palette.sunsetAmount *
          0.9;

    material.uniforms.uRainbowEnabled.value = rainbowEnabled ? 1 : 0;
    material.uniforms.uRainbowIntensity.value = rainbowIntensity / 100;
    material.uniforms.uRainbowWidth.value = rainbowWidth;
  }, [
    material,
    palette,
    rainbowEnabled,
    rainbowIntensity,
    rainbowWidth,
  ]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame(
    ({ camera }) => {
      if (!meshRef.current) {
        return;
      }

      /*
       * Keep the sky centered on the camera so the
       * player can never reach the dome edge.
       */
      meshRef.current.position.copy(
        camera.position
      );
    }
  );

  return (
    <mesh
      ref={meshRef}
      material={material}
      renderOrder={-1000}
      frustumCulled={false}
    >
      <sphereGeometry
        args={[
          420,
          48,
          32,
        ]}
      />
    </mesh>
  );
}

export default function Atmosphere({
  titleMode = false,
}) {
  const { scene } =
    useThree();

  const [, refresh] =
    useState(0);

  useEffect(() => {
    function handleTerrainChange(
      event
    ) {
      const atmosphereKeys = [
        "fogDensity",
        "sunHeight",
        "sunRotation",
        "skyHaze",
        "stars",
        "atmosphereMode",
        "rainbowEnabled",
        "rainbowIntensity",
        "rainbowWidth",
        "auroraEnabled",
        "auroraIntensity",
        "auroraSpeed",
        "auroraHeight",
        "groundFogDensity",
        "groundFogSpeed",
        "groundFogHeight",
        "groundFogCoverage",
      ];

      if (
        !atmosphereKeys.includes(
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

  const fogDensity =
    titleMode
      ? 0.0025
      : mapRange(
          terrainSettings.fogDensity,
          0,
          100,
          0,
          0.025
        );

  const starCount =
    Math.floor(
      mapRange(
        terrainSettings.stars,
        0,
        100,
        0,
        2200
      )
    );

  /*
   * Stars automatically become less visible as
   * daylight increases.
   */
  const visibleStarCount =
    Math.floor(
      starCount *
      THREE.MathUtils.lerp(
        1,
        0.04,
        palette.daylightAmount
      )
    );

  useEffect(() => {
    scene.fog =
      new THREE.FogExp2(
        palette.fogColor,
        fogDensity
      );

    scene.background =
      palette.zenithColor;

    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [
    scene,
    fogDensity,
    palette.fogColor,
    palette.zenithColor,
  ]);

  return (
    <>
    <SkyDome
      palette={palette}
      rainbowEnabled={Boolean(terrainSettings.rainbowEnabled)}
      rainbowIntensity={Number(terrainSettings.rainbowIntensity) || 0}
      rainbowWidth={Number(terrainSettings.rainbowWidth) || 28}
    />

    <CloudField />
    <Aurora />
    <GroundFog />

    <Stars
        radius={350}
        depth={100}
        count={visibleStarCount}
        factor={4}
        saturation={0}
        fade
        speed={0.18}
    />
</>
  );
}