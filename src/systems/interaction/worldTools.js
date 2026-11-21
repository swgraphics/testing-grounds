// Canonical IDs/modes shared by Dev Tools, NORTH, Compass and shortcuts.
export const WORLD_TOOLS = Object.freeze([
  {id:'RAISE',label:'RAISE',action:'brush-raise',group:'terrain',mode:'sculpt',target:'terrain'},
  {id:'LOWER',label:'LOWER',action:'brush-lower',group:'terrain',mode:'sculpt',target:'terrain'},
  {id:'HEIGHT',label:'TERRAIN HEIGHT',action:'terrain',group:'terrain',mode:'sculpt',target:'terrain'},
  {id:'SMOOTH',label:'SMOOTH',action:'brush-smooth',group:'terrain',mode:'sculpt',target:'terrain'},
  {id:'FLATTEN',label:'FLATTEN',action:'brush-flatten',group:'terrain',mode:'sculpt',target:'terrain'},
  {id:'SLOPE',label:'PATH / SLOPE',action:'brush-slope',group:'terrain',mode:'sculpt',target:'terrain'},
  {id:'VERTEX',label:'VERTEX EDIT',action:'brush-vertex',group:'terrain',mode:'sculpt',target:'terrain'},
  {id:'CANYON_EDGE',label:'DRAW CANYON EDGE',action:'brush-canyon-edge',group:'world',mode:'sculpt',target:'terrain'},
  {id:'RIVER',label:'DRAW RIVER',action:'river',group:'world',mode:'grab',target:'water'},
  {id:'POND',label:'ADD WATER',action:'lake',group:'world',mode:'grab',target:'water'},
  {id:'SUN',label:'MOVE SUN',action:'sun',group:'world',mode:'grab',target:'sun'},
]);
export const worldTool = id => WORLD_TOOLS.find(tool=>tool.id===id);
export const worldToolForAction = action => WORLD_TOOLS.find(tool=>tool.action===action);
