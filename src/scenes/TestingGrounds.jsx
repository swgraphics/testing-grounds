import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import XboxController from "../systems/input/XboxController";
import PlayerController from "../components/character/PlayerController";
import Atmosphere from "../components/world/Atmosphere";
import Lighting from "../components/world/Lighting";
import GridTerrain from "../components/world/GridTerrain";
import GridFloor from "../components/world/GridFloor";
import Water from "../components/world/Water";
import Landscape from "../components/world/Landscape";
import WorldGizmos from "../components/world/WorldGizmos";
import TestCourse from "../components/world/TestCourse";
import CameraTelemetry from "../components/ui/CameraTelemetry";
import MeshPlacementSystem from "../components/world/MeshPlacementSystem";
import WorldInteractionSystem from "../components/world/WorldInteractionSystem";
import TerrainVertexEditor from "../components/world/TerrainVertexEditor";
import SunReticleSensor from "../components/world/SunReticleSensor";
import CrimsonTreeInteractionSystem from "../components/world/CrimsonTreeInteractionSystem";
import { useWorldStore } from "../systems/world/worldStore";
function TitleOrbitCamera({ active }) {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (!active) return;

    const time = clock.getElapsedTime();

    const radius = 260;
    const height = 145;
    const speed = 0.06;

    const x = Math.sin(time * speed) * radius;
    const z = Math.cos(time * speed) * radius;

    camera.position.lerp(new THREE.Vector3(x, height, z), 0.025);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function TestingGrounds({ titleMode = false }) {
  const worldType = useWorldStore((state) => state.world.worldType);
  const isBlankWorld = worldType === "blank";

  return (
    <>
      <TitleOrbitCamera active={titleMode} />
      <XboxController />
      <CameraTelemetry />
      <MeshPlacementSystem />
      {!titleMode && <SunReticleSensor />}
      {!titleMode && <CrimsonTreeInteractionSystem />}
      {!titleMode && <WorldInteractionSystem />}
      {!titleMode && <TerrainVertexEditor />}
      <Atmosphere titleMode={titleMode} />
      <Lighting />

      <GridTerrain />
      <GridFloor />
      <Water />

      <Landscape />
      <WorldGizmos />

      {!isBlankWorld && <TestCourse />}

      {!titleMode && <PlayerController />}

    </>
  );
}