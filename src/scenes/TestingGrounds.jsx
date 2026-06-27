import PlayerController from "../components/character/PlayerController";
import Atmosphere from "../components/world/Atmosphere";
import Lighting from "../components/world/Lighting";
import GridFloor from "../components/world/GridFloor";
import SpawnPad from "../components/world/SpawnPad";
import TestBuildings from "../components/world/TestBuildings";
import TestCourse from "../components/world/TestCourse";
import Helpers from "../components/world/Helpers";
import WorldGizmos from "../components/world/WorldGizmos";
export default function TestingGrounds() {
  return (
    <>
      <Atmosphere />
      <Lighting />
      <GridFloor />
      <SpawnPad />
      <WorldGizmos />      
      <TestBuildings />
      <TestCourse />
      <PlayerController />
      <Helpers />
    </>
  );
}