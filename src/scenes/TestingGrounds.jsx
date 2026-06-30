import PlayerController from "../components/character/PlayerController";
import Atmosphere from "../components/world/Atmosphere";
import Lighting from "../components/world/Lighting";
import GridFloor from "../components/world/GridFloor";
import GridTerrain from "../components/world/GridTerrain";
import SpawnPad from "../components/world/SpawnPad";
import TestBuildings from "../components/world/TestBuildings";
import TestCourse from "../components/world/TestCourse";
import Helpers from "../components/world/Helpers";
import WorldGizmos from "../components/world/WorldGizmos";
import Landscape from "../components/world/Landscape";
export default function TestingGrounds() {
  return (
    <>
      <Atmosphere />
      <Lighting />
      <GridTerrain />
      <GridFloor />
      <Landscape />
      <SpawnPad />
      <WorldGizmos />      
      <TestBuildings />
      <TestCourse />
      <PlayerController />
      <Helpers />
    </>
  );
}