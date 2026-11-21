import {getCommittedTerrainHeightAt} from '../terrain/terrainHeight';
import {useWorldStore} from '../world/worldStore';
import {hasTerrainAt} from '../world/terrainRegions';
import {geologyBounds,geologyEdgeDeformation,geologyLocalPoint,geologyWorldPoint} from './geologyDefinition';
import {compileGeologyField,normalizeGeologyRecord} from './geologyField';
import {captureGeologyFoundation,createGeologyFeature,draftGeologyFeature,geologyFeatures,updateGeologyFeature} from './geologyFeatures';
import {traceTerrainEdge} from './terrainEdgeDetection';

const h=getCommittedTerrainHeightAt;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const point=(x,z)=>[x,h(x,z),z];
export function canyonBankGuide(record,side){
  const d=record.definition,s=d.sides[side],sign=side==='left'?-1:1,inner=record.geologyType==='canyon-wall'?d.floorWidth/2:0;
  const start=-d.length/2-s.start,end=d.length/2+s.end;
  return Array.from({length:25},(_,i)=>{const x=start+3+(end-start-6)*i/24,z=sign*(inner+s.offset+geologyEdgeDeformation(s,x).offset+2);return geologyWorldPoint(record,x,z)});
}
export function analyzeCanyonWallAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!hasTerrainAt(x,z,useWorldStore.getState().world))return null;
  let selected=null,best=Infinity;
  for(const feature of Object.values(geologyFeatures()).sort((a,b)=>a.id.localeCompare(b.id))){
    if(!['canyon-wall','canyon-edge'].includes(feature.geologyType))continue;
    const d=feature.definition,p=geologyLocalPoint(feature,x,z),pair=feature.geologyType==='canyon-wall';
    for(const side of pair?['left','right']:['right']){
      const sign=side==='left'?-1:1,s=d.sides[side],start=-d.length/2-s.start,end=d.length/2+s.end,edge=(pair?d.floorWidth/2:0)+s.offset+geologyEdgeDeformation(s,p.x).offset;
      const distance=Math.abs(p.z-sign*edge)*d.scale;
      if(p.x<start-6||p.x>end+6||distance>Math.max(8,(s.width??(pair?(d.width-d.floorWidth)/2:d.width))*.55*d.scale)||distance>=best)continue;
      const at=clamp(p.x,start,end),where=at<(start+end)/2?'start':'end',mode=Math.min(at-start,end-at)<10?'END':'CENTER';
      const localX=mode==='END'?(where==='start'?start+3:end-3):at;
      const localZ=sign*(edge+1.2),world=geologyWorldPoint(feature,localX,localZ),angle=d.rotation*Math.PI/180;
      const normal=[Math.sin(angle)*sign,Math.cos(angle)*sign],tangent=[Math.cos(angle),-Math.sin(angle)];
      const across=t=>h(world[0]+normal[0]*t,world[1]+normal[1]*t);
      if(across(6)-across(-6)<2)continue;
      const path=canyonBankGuide(feature,side).map(p=>point(...p));
      selected={featureId:feature.id,scale:d.scale,side,mode,endpoint:where,point:point(...world),normal,tangent,rise:(s.height??d.height)*d.scale,width:(s.width??(pair?(d.width-d.floorWidth)/2:d.width))*d.scale,low:feature.position[1],label:feature.name,path};best=distance;
    }
  }
  if(selected)return selected;
  return traceTerrainEdge(h,x,z);
}

export function canyonSelectionParameters(selection){
  const record=geologyFeatures()[selection?.featureId],d=record?.definition,s=d?.sides[selection.side];
  return {height:selection.rise,width:selection.width,edgeDeformation:s?.edgeDeformation??d?.edgeDeformation??.35,seed:s?.seed??(d?.seed?d.seed+(selection.side==='right'&&record.geologyType==='canyon-wall'?1013:0):173),side:selection.side};
}

export function prepareCanyonOperation(selection,operation,parameters={}){
  const foundation=captureGeologyFoundation();
  if(selection.featureId)return {foundation,initial:geologyFeatures()[selection.featureId]};
  const angle=Math.atan2(selection.normal[0],selection.normal[1])*180/Math.PI;
  const record=draftGeologyFeature('canyon-edge',{height:selection.rise,width:152,length:operation==='extend'?240:48,rotation:angle,seed:parameters.seed??173,edgeDeformation:parameters.edgeDeformation??.35},[selection.point[0],0,selection.point[2]],{foundation,elevation:selection.low});
  const b=geologyBounds(record),samples={};
  for(let gz=Math.floor(b.minZ/4);gz<=Math.ceil(b.maxZ/4);gz++)for(let gx=Math.floor(b.minX/4);gx<=Math.ceil(b.maxX/4);gx++)samples[`${gx},${gz}`]=h(gx*4,gz*4);
  return {foundation,reference:{version:1,kind:operation==='deform'?'widen':operation,samples}};
}

export function canyonChangeProposal(selection,distance,operation,prepared,parameters={}){
  if(!selection||!Number.isFinite(distance))return null;
  if(selection.featureId){
    const initial=prepared.initial;
    if(!initial)return null;
    const side=selection.side,settings={...initial.definition.sides[side]};
    const source=canyonSelectionParameters(selection);
    for(const key of ['height','width','edgeDeformation','seed'])if(parameters[key]!=null&&parameters[key]!==source[key])settings[key]=['height','width'].includes(key)?parameters[key]/initial.definition.scale:parameters[key];
    if(operation==='widen')settings.offset+=distance/initial.definition.scale;
    else if(operation==='extend')settings[selection.endpoint]+=Math.max(0,distance)/initial.definition.scale;
    else if(operation==='deform'&&Math.abs(distance)>=.5&&(parameters.edgeDeformation??.5)>0){
      const local=geologyLocalPoint(initial,selection.point[0],selection.point[2]);
      settings.deformations=[...(settings.deformations??[]),{center:local.x,length:Math.min(160,48/initial.definition.scale),amount:clamp(distance/24,-1,1)*(parameters.edgeDeformation??.5),seed:parameters.seed??source.seed}];
    }
    const record=normalizeGeologyRecord({...initial,definition:{...initial.definition,sides:{...initial.definition.sides,[side]:settings}}});
    return {record,previous:initial,existing:true,operation,distance};
  }
  const normal=selection.normal,tangent=selection.tangent,angle=Math.atan2(normal[0],normal[1])*180/Math.PI;
  let center=[selection.point[0],0,selection.point[2]],definition={height:parameters.height??selection.rise,width:parameters.width??selection.width,length:48,rotation:angle,seed:parameters.seed??173,edgeDeformation:parameters.edgeDeformation??.35};
  if(operation==='extend'){
    const sign=selection.endpoint==='end'?1:-1,length=clamp(distance,4,120)+8;
    center=[selection.point[0]+tangent[0]*sign*(length/2-4),0,selection.point[2]+tangent[1]*sign*(length/2-4)];definition.length=length;
  }else if(operation==='deform')definition.sides={right:{deformations:[{center:0,length:48,amount:clamp(distance/24,-1,1)*(parameters.edgeDeformation??.5),seed:parameters.seed??173}]}};
  else definition.sides={right:{offset:clamp(distance,-120,120)}};
  const record=draftGeologyFeature('canyon-edge',definition,center,{foundation:prepared.foundation,elevation:selection.low,refinement:prepared.reference,name:'CANYON EDGE / '+operation.toUpperCase()});
  return {record,existing:false,operation,distance};
}

export function newCanyonEdgeProposal(from,to,parameters={},foundation=captureGeologyFoundation()){
  const dx=to[0]-from[0],dz=to[2]-from[2],length=Math.hypot(dx,dz);
  if(length<4)return null;
  const rotation=Math.atan2(-dz,dx)*180/Math.PI+(parameters.side==='left'?180:0);
  const record=draftGeologyFeature('canyon-edge',{...parameters,length:Math.min(240,length),rotation},[(from[0]+to[0])/2,0,(from[2]+to[2])/2],{foundation,name:'CANYON EDGE'});
  return {record,existing:false,operation:'new',distance:length};
}
export function commitCanyonProposal(proposal){
  if(!proposal||!compileGeologyField(proposal.record).values.some(value=>Math.abs(value)>.01))return null;
  if(proposal.existing)return updateGeologyFeature(proposal.record.id,{definition:proposal.record.definition})?proposal.record.id:null;
  const r=proposal.record;
  return createGeologyFeature(r.geologyType,r.definition,r.position,{foundation:r.foundation,elevation:r.position[1],refinement:r.refinement,name:r.name});
}
