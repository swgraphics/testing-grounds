const normalize=(x,z)=>{const length=Math.hypot(x,z);return length>.0001?[x/length,z/length]:null};
const gradient=(h,x,z)=>[(h(x+3,z)-h(x-3,z))/6,(h(x,z+3)-h(x,z-3))/6];

// A steep plane is not a wall: require a concentrated transition with flatter
// terrain on at least one side, then follow that same oriented transition.
export function terrainEdgeSection(h,x,z,expectedNormal=null){
  const g=gradient(h,x,z),slope=Math.hypot(...g),normal=normalize(...g);
  if(!normal||slope<.55||expectedNormal&&normal[0]*expectedNormal[0]+normal[1]*expectedNormal[1]<.55)return null;
  const at=t=>h(x+normal[0]*t,z+normal[1]*t),low=at(-12),high=at(12),rise=high-low;
  if(rise<3)return null;
  const outsideLow=Math.abs(low-at(-24))/12,outsideHigh=Math.abs(at(24)-high)/12;
  if(Math.min(outsideLow,outsideHigh)>slope*.65)return null;
  // Gradual hills have little concentration of slope at the selected section.
  if((at(6)-at(-6))/12<slope*.45)return null;
  return {point:[x,h(x,z),z],normal,tangent:[normal[1],-normal[0]],rise,low,width:24,slope};
}

export function traceTerrainEdge(h,x,z){
  const section=terrainEdgeSection(h,x,z);if(!section)return null;
  const walk=sign=>{
    const path=[];let current=section;
    for(let step=0;step<18;step++){
      const nx=current.point[0]+current.tangent[0]*4*sign,nz=current.point[2]+current.tangent[1]*4*sign;
      let best=null,score=-Infinity;
      for(const offset of [0,-3,3]){
        const candidate=terrainEdgeSection(h,nx+current.normal[0]*offset,nz+current.normal[1]*offset,current.normal);
        if(!candidate||Math.abs(candidate.low-current.low)>Math.max(6,current.rise*.4))continue;
        const alignment=candidate.tangent[0]*section.tangent[0]+candidate.tangent[1]*section.tangent[1];
        if(alignment<.25)continue;
        const value=candidate.slope-.05*Math.abs(offset);if(value>score){best=candidate;score=value}
      }
      if(!best)break;
      if(step>5&&Math.hypot(best.point[0]-x,best.point[2]-z)<8)break;
      path.push(best.point);current=best;
    }
    return path;
  };
  const before=walk(-1),after=walk(1);
  if(before.length+after.length<3)return null; // Isolated spikes have no usable edge.
  const end=before.length<=2||after.length<=2;
  return {...section,featureId:null,side:'right',mode:end?'END':'CENTER',endpoint:before.length<after.length?'start':'end',
    path:[...before.toReversed(),section.point,...after],continuity:{before:before.length*4,after:after.length*4},label:'TERRAIN WALL'};
}
