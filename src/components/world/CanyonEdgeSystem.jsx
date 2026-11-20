import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Line} from '@react-three/drei';
import * as THREE from 'three';
import {useInteractionStore} from '../../systems/interaction/interactionStore';
import {clearGameplayInput,gameplayInputAllowed} from '../../systems/input/inputOwnership';
import {useWorldStore} from '../../systems/world/worldStore';
import {hasTerrainAt} from '../../systems/world/terrainRegions';
import {getCommittedTerrainHeightAt as heightAt} from '../../systems/terrain/terrainHeight';
import {useCanyonEdgeStore} from '../../systems/geology/canyonEdgeStore';
import {analyzeCanyonWallAt,prepareCanyonOperation,canyonChangeProposal,newCanyonEdgeProposal,commitCanyonProposal} from '../../systems/geology/canyonEdgeOperations';
import {captureGeologyFoundation} from '../../systems/geology/geologyFeatures';
import {compileGeologyField} from '../../systems/geology/geologyField';
import GeologyPlacementGhost from './GeologyPlacementGhost';

const UP=new THREE.Vector3(0,1,0);
const limited=n=>Math.max(-120,Math.min(120,n));
function rayTerrain(camera,raycaster){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const ray=raycaster.ray,p=new THREE.Vector3();let previous=0,old=ray.origin.y-heightAt(ray.origin.x,ray.origin.z);
  for(let distance=2;distance<=900;distance+=Math.min(5,Math.max(2,distance*.015))){
    ray.at(distance,p);const value=p.y-heightAt(p.x,p.z);
    if(old>=0&&value<=0&&hasTerrainAt(p.x,p.z,useWorldStore.getState().world)){
      let low=previous,high=distance;for(let i=0;i<14;i++){const middle=(low+high)/2;ray.at(middle,p);if(p.y-heightAt(p.x,p.z)>0)low=middle;else high=middle}ray.at((low+high)/2,p);return p.toArray();
    }
    previous=distance;old=value;
  }
  return null;
}
function previewHeight(x,z,proposal){
  if(!proposal)return heightAt(x,z);
  return heightAt(x,z)+compileGeologyField(proposal.record).heightAt(x,z)-(proposal.previous?compileGeologyField(proposal.previous).heightAt(x,z):0);
}
function operationFor(ui,selection){return ui.operation==='auto'?(selection.mode==='END'?'extend':'widen'):ui.operation}
function axisFor(selection,operation){const sign=selection.endpoint==='start'?-1:1;return operation==='widen'?selection.normal:selection.tangent.map(v=>v*sign)}

export default function CanyonEdgeSystem(){
  const {camera,gl}=useThree(),active=useInteractionStore(s=>s.activeTool==='CANYON_EDGE'),ui=useCanyonEdgeStore();
  const stroke=useRef(null),pending=useRef(null),lastHover=useRef(0),padPrevious=useRef({rt:false,b:false,x:false});
  const raycaster=useRef(new THREE.Raycaster());
  function releaseOwner(){if(useInteractionStore.getState().gestureOwner==='canyon-edge')useInteractionStore.getState().setGestureOwner(null);clearGameplayInput()}
  function cancel(){stroke.current=null;pending.current=null;useCanyonEdgeStore.setState({selection:null,proposal:null,held:false});releaseOwner()}
  function commit(proposal){
    let id=null;try{id=commitCanyonProposal(proposal)}catch(error){useCanyonEdgeStore.setState({message:error.message})}
    if(id){window.dispatchEvent(new CustomEvent('crash-unit-action',{detail:{action:'worldTransform',duration:620}}));useCanyonEdgeStore.setState({message:'COMMITTED — select a wall to continue.'})}
    else useCanyonEdgeStore.setState({message:'Drag farther to change this wall.'});
    stroke.current=null;pending.current=null;useCanyonEdgeStore.setState({selection:null,proposal:null,held:false});releaseOwner();
  }
  function proposalFor(g){
    const parameters=useCanyonEdgeStore.getState().parameters;
    if(g.mode==='new'){const proposal=newCanyonEdgeProposal(g.selection.point,g.end,parameters,g.prepared.foundation);return proposal?{...proposal,guideEnd:g.end}:null}
    return canyonChangeProposal(g.selection,g.distance,g.operation,g.prepared,parameters);
  }
  function update(g){try{useCanyonEdgeStore.setState({proposal:proposalFor(g),held:true,message:''})}catch(error){useCanyonEdgeStore.setState({message:error.message,proposal:null})}}
  function begin(input,screen={x:gl.domElement.clientWidth/2,y:gl.domElement.clientHeight/2}){
    const state=useCanyonEdgeStore.getState(),hit=rayTerrain(camera,raycaster.current);
    if(!hit)return false;
    const selection=state.selection??(state.mode==='new'?{mode:'NEW',point:hit,side:state.parameters.side}:analyzeCanyonWallAt(hit[0],hit[2]));
    if(!selection){useCanyonEdgeStore.setState({message:'No raised wall here. Choose NEW EDGE to create a wall.'});return false}
    const operation=state.mode==='new'?'new':operationFor(state,selection);
    const prepared=pending.current?.prepared??(state.mode==='new'?{foundation:captureGeologyFoundation()}:prepareCanyonOperation(selection,operation,state.parameters));
    const g={mode:state.mode,selection,prepared,operation,input,start:screen,distance:input==='gamepad'?(state.proposal?.distance??0):0,end:state.proposal?.guideEnd??selection.point.slice()};
    stroke.current=g;pending.current={...g};useCanyonEdgeStore.setState({selection,held:true,message:''});useInteractionStore.getState().setGestureOwner('canyon-edge');clearGameplayInput();return true;
  }
  function finish(valid){
    const g=stroke.current;if(!g)return;
    if(!valid){cancel();return}
    const proposal=useCanyonEdgeStore.getState().proposal;
    if(proposal&&(g.mode==='new'?proposal.distance>=4:g.operation==='extend'?g.distance>=4:Math.abs(g.distance)>=.5)){commit(proposal);return}
    pending.current={...g};stroke.current=null;useCanyonEdgeStore.setState({proposal:null,held:false});releaseOwner();
  }

  useEffect(()=>{
    if(!active)return;
    useCanyonEdgeStore.getState().reset();
    const down=event=>{
      if(event.target!==gl.domElement||event.button!==0)return;document.activeElement?.blur?.();if(!gameplayInputAllowed())return;
      const state=useCanyonEdgeStore.getState();
      if(state.selection&&state.proposal){commit(state.proposal);event.preventDefault();event.stopImmediatePropagation();return}
      if(begin('pointer',{x:event.clientX,y:event.clientY})){event.preventDefault();event.stopImmediatePropagation()}
    };
    const move=event=>{
      const g=stroke.current;if(!g||g.input!=='pointer')return;
      const rect=gl.domElement.getBoundingClientRect(),dx=event.clientX-g.start.x,dy=event.clientY-g.start.y;
      if(Math.hypot(dx,dy)<3)return;
      if(g.mode==='new'){
        const cast=(x,y)=>{raycaster.current.setFromCamera(new THREE.Vector2(((x-rect.left)/rect.width)*2-1,-((y-rect.top)/rect.height)*2+1),camera);return raycaster.current.ray.intersectPlane(new THREE.Plane(UP,-g.selection.point[1]),new THREE.Vector3())};
        const a=cast(g.start.x,g.start.y),b=cast(event.clientX,event.clientY);
        if(a&&b)g.end=[g.selection.point[0]+b.x-a.x,g.selection.point[1],g.selection.point[2]+b.z-a.z];
        else{const scale=2*camera.position.distanceTo(new THREE.Vector3(...g.selection.point))*Math.tan(camera.fov*Math.PI/360)/rect.height;g.end=[g.selection.point[0]+dx*scale,g.selection.point[1],g.selection.point[2]+dy*scale]}
      }else{
        const axis=axisFor(g.selection,g.operation),origin=new THREE.Vector3(...g.selection.point),a=origin.clone().project(camera),b=origin.add(new THREE.Vector3(axis[0]*10,0,axis[1]*10)).project(camera);
        const px=(b.x-a.x)*rect.width/20,py=-(b.y-a.y)*rect.height/20,denominator=px*px+py*py;
        g.distance=limited(denominator>.01?(dx*px+dy*py)/denominator:-dy*.3);
      }
      update(g);event.preventDefault();
    };
    const up=event=>{if(stroke.current?.input==='pointer')finish(event.isTrusted&&event.target===gl.domElement)};
    const unsubscribe=useInteractionStore.subscribe(state=>{if(state.activeTool!=='CANYON_EDGE')cancel()});
    window.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);window.addEventListener('blur',cancel);window.addEventListener('tg-canyon-cancel-preview',cancel);window.addEventListener('tg-return-to-world',cancel);
    return()=>{window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);window.removeEventListener('tg-canyon-cancel-preview',cancel);window.removeEventListener('tg-return-to-world',cancel);unsubscribe();cancel();useCanyonEdgeStore.getState().reset()};
  // Active sessions read canonical stores and gesture refs; camera/canvas identities are stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active,camera,gl]);

  useFrame((_,delta)=>{
    if(!active)return;
    const pad=navigator.getGamepads?.().find(p=>p?.connected),rt=Boolean(pad?.buttons[7]?.pressed),b=Boolean(pad?.buttons[1]?.pressed),previous=padPrevious.current;
    if(b&&!previous.b){cancel();padPrevious.current={rt,b};return}
    if(rt&&!previous.rt&&gameplayInputAllowed())begin('gamepad');
    const g=stroke.current;
    if(g?.input==='gamepad'&&rt){
      const x=Number(pad.axes[0])||0,y=Number(pad.axes[1])||0;
      if(Math.hypot(x,y)>.18){
        const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;if(forward.lengthSq()<.001)forward.set(0,0,-1);forward.normalize();const right=new THREE.Vector3(-forward.z,0,forward.x),motion=right.multiplyScalar(x).addScaledVector(forward,-y),amount=Math.min(delta,.05)*26;
        if(g.mode==='new')g.end=[g.end[0]+motion.x*amount,g.end[1],g.end[2]+motion.z*amount];
        else{const axis=axisFor(g.selection,g.operation);g.distance=limited(g.distance+(motion.x*axis[0]+motion.z*axis[1])*amount)}
        update(g);
      }
    }
    if(!rt&&previous.rt&&stroke.current?.input==='gamepad')finish(true);
    padPrevious.current={rt,b};
    const now=performance.now();if(stroke.current||now-lastHover.current<90||!gameplayInputAllowed())return;lastHover.current=now;
    const aim=rayTerrain(camera,raycaster.current);if(!aim)return;
    const state=useCanyonEdgeStore.getState();
    if(pending.current&&state.selection){
      const p=pending.current;
      if(p.mode==='new')p.end=aim;
      else{const axis=axisFor(p.selection,p.operation);p.distance=limited((aim[0]-p.selection.point[0])*axis[0]+(aim[2]-p.selection.point[2])*axis[1])}
      try{const proposal=proposalFor(p);useCanyonEdgeStore.setState({proposal:proposal&&(p.mode==='new'?proposal.distance>=4:p.operation==='extend'?p.distance>=4:Math.abs(p.distance)>=.5)?proposal:null})}catch(error){useCanyonEdgeStore.setState({proposal:null,message:error.message})}
    }else if(state.mode==='select'){
      const hover=analyzeCanyonWallAt(aim[0],aim[2]);const old=state.hover;
      if((hover?.featureId??'')!==(old?.featureId??'')||hover?.mode!==old?.mode||hover?.side!==old?.side||Boolean(hover)!==Boolean(old)||hover&&old&&Math.hypot(hover.point[0]-old.point[0],hover.point[2]-old.point[2])>1)useCanyonEdgeStore.setState({hover});
    }
  });

  if(!active)return null;
  const selection=ui.selection??ui.hover,proposal=ui.proposal,guide=[];
  if(selection){
    if(selection.mode==='NEW'){
      const end=proposal?.guideEnd??selection.point;for(let i=0;i<=20;i++){const x=selection.point[0]+(end[0]-selection.point[0])*i/20,z=selection.point[2]+(end[2]-selection.point[2])*i/20;guide.push([x,previewHeight(x,z,proposal)+.4,z])}
    }else{
      const operation=proposal?.operation??operationFor(ui,selection),axis=axisFor(selection,operation),distance=proposal?.distance??0;
      if(operation==='extend'){for(let i=0;i<=20;i++){const x=selection.point[0]+axis[0]*Math.max(12,distance)*i/20,z=selection.point[2]+axis[1]*Math.max(12,distance)*i/20;guide.push([x,previewHeight(x,z,proposal)+.4,z])}}
      else for(let i=0;i<=16;i++){const across=-6+(selection.width+10)*i/16+distance,x=selection.point[0]+selection.normal[0]*across,z=selection.point[2]+selection.normal[1]*across;guide.push([x,previewHeight(x,z,proposal)+.4,z])}
    }
  }
  const state=proposal?'PREVIEW':ui.selection?'SELECTED':'HOVER',end=guide.at(-1);
  const radius=end?Math.max(.12,camera.position.distanceTo(new THREE.Vector3(...end))*Math.tan(camera.fov*Math.PI/360)*12/gl.domElement.clientHeight):.2;
  return <>
    {proposal&&<group userData={{tgCanyonPreview:true,operation:proposal.operation}}><GeologyPlacementGhost proposal={proposal.record} replaceRecord={proposal.previous}/></group>}
    {guide.length>1&&<group userData={{tgCanyonGuide:true,state,selection}}>
      <Line points={guide} color="#08121c" lineWidth={ui.selection?8:6} depthTest={false} depthWrite={false} renderOrder={500} dashed={!ui.selection} dashSize={2} gapSize={1}/>
      <Line points={guide} color="#2a8fff" lineWidth={ui.selection?5:3.5} depthTest={false} depthWrite={false} renderOrder={501} dashed={!ui.selection} dashSize={2} gapSize={1}/>
      <Line points={guide} color="white" lineWidth={1.2} depthTest={false} depthWrite={false} renderOrder={502} dashed={!ui.selection} dashSize={2} gapSize={1}/>
      {[guide[0],end].map((p,i)=><mesh key={i} position={p} renderOrder={503}><sphereGeometry args={[radius,10,8]}/><meshBasicMaterial color={i===1?'white':'#2a8fff'} depthTest={false} depthWrite={false} wireframe={!ui.selection}/></mesh>)}
    </group>}
  </>;
}
