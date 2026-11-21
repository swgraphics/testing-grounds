import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Line} from '@react-three/drei';
import * as THREE from 'three';
import {useInteractionStore} from '../../systems/interaction/interactionStore';
import {clearGameplayInput,gameplayInputAllowed} from '../../systems/input/inputOwnership';
import {raycastCommittedTerrain} from '../../systems/terrain/raycastTerrain';
import {getCommittedTerrainHeightAt as heightAt} from '../../systems/terrain/terrainHeight';
import {useCanyonEdgeStore} from '../../systems/geology/canyonEdgeStore';
import {analyzeCanyonWallAt,canyonBankGuide,canyonSelectionParameters,prepareCanyonOperation,canyonChangeProposal,newCanyonEdgeProposal,commitCanyonProposal} from '../../systems/geology/canyonEdgeOperations';
import {captureGeologyFoundation} from '../../systems/geology/geologyFeatures';
import {compileGeologyField,GEOLOGY_SHAPE_KEYS} from '../../systems/geology/geologyField';
import GeologyPlacementGhost from './GeologyPlacementGhost';

const UP=new THREE.Vector3(0,1,0);
const limited=n=>Math.max(-120,Math.min(120,n));
function rayTerrain(camera,raycaster){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  return raycastCommittedTerrain(raycaster.ray)?.toArray()??null;
}
function previewHeight(x,z,proposal){
  if(!proposal)return heightAt(x,z);
  return heightAt(x,z)+compileGeologyField(proposal.record).heightAt(x,z)-(proposal.previous?compileGeologyField(proposal.previous).heightAt(x,z):0);
}
function operationFor(ui,selection){return ui.operation==='auto'?(selection.mode==='END'?'extend':'widen'):ui.operation}
function axisFor(selection,operation){const sign=selection.endpoint==='start'?-1:1;return operation==='extend'?selection.tangent.map(v=>v*sign):selection.normal}

export default function CanyonEdgeSystem(){
  const {camera,gl}=useThree(),active=useInteractionStore(s=>s.activeTool==='CANYON_EDGE'),ui=useCanyonEdgeStore();
  const stroke=useRef(null),pending=useRef(null),lastHover=useRef(0),padPrevious=useRef({rt:false,b:false,a:false});
  const raycaster=useRef(new THREE.Raycaster());
  const committing=useRef(false);
  function releaseOwner(){if(useInteractionStore.getState().gestureOwner==='canyon-edge')useInteractionStore.getState().setGestureOwner(null);clearGameplayInput()}
  function cancel(){stroke.current=null;pending.current=null;useCanyonEdgeStore.setState({hover:null,selection:null,draftParameters:null,proposal:null,held:false});releaseOwner()}
  function commit(proposal){
    let id=null;committing.current=true;try{id=commitCanyonProposal(proposal)}catch(error){useCanyonEdgeStore.setState({message:error.message})}finally{committing.current=false}
    if(id){window.dispatchEvent(new CustomEvent('crash-unit-action',{detail:{action:'worldTransform',duration:620}}));useCanyonEdgeStore.setState({message:'COMMITTED — select a wall to continue.'})}
    else useCanyonEdgeStore.setState({message:'Drag farther to change this wall.'});
    stroke.current=null;pending.current=null;useCanyonEdgeStore.setState({hover:null,selection:null,draftParameters:null,proposal:null,held:false});releaseOwner();
  }
  function proposalFor(g){
    const parameters=g.parameters;
    if(g.mode==='new'){const proposal=newCanyonEdgeProposal(g.selection.point,g.end,parameters,g.prepared.foundation);return proposal?{...proposal,guideEnd:g.end}:null}
    const changed=['height','width','edgeDeformation','seed'].some(key=>parameters[key]!==g.sourceParameters[key]);
    if(!changed&&(g.operation==='extend'?g.distance<4:Math.abs(g.distance)<.5))return null;
    const proposal=canyonChangeProposal(g.selection,g.distance,g.operation,g.prepared,parameters);
    return proposal?.existing&&JSON.stringify(proposal.record.definition)===JSON.stringify(proposal.previous.definition)?null:proposal;
  }
  function update(g){try{useCanyonEdgeStore.setState({proposal:proposalFor(g),held:true,message:''})}catch(error){useCanyonEdgeStore.setState({message:error.message,proposal:null})}}
  function begin(input,screen={x:gl.domElement.clientWidth/2,y:gl.domElement.clientHeight/2}){
    const state=useCanyonEdgeStore.getState(),hit=rayTerrain(camera,raycaster.current);
    if(!hit)return false;
    const selection=state.selection??(state.mode==='new'?{mode:'NEW',point:hit,side:state.parameters.side}:analyzeCanyonWallAt(hit[0],hit[2]));
    if(!selection){useCanyonEdgeStore.setState({message:'No raised wall here. Choose NEW EDGE to create a wall.'});return false}
    const operation=state.mode==='new'?'new':operationFor(state,selection);
    const sourceParameters=pending.current?.sourceParameters??(state.mode==='new'?{...state.parameters}:canyonSelectionParameters(selection));
    const parameters={...(state.draftParameters??sourceParameters)};
    const prepared=pending.current?.prepared??(state.mode==='new'?{foundation:captureGeologyFoundation()}:prepareCanyonOperation(selection,operation,parameters));
    const g={mode:state.mode,selection,prepared,parameters,sourceParameters,operation,input,start:screen,aim:hit,distance:input==='gamepad'?(state.proposal?.distance??0):0,end:state.proposal?.guideEnd??selection.point.slice()};
    stroke.current=g;pending.current={...g};useCanyonEdgeStore.setState({hover:null,selection,draftParameters:parameters,held:true,message:''});useInteractionStore.getState().setGestureOwner('canyon-edge');clearGameplayInput();return true;
  }
  function finish(valid){
    const g=stroke.current;if(!g)return;
    if(!valid){cancel();return}
    const proposal=useCanyonEdgeStore.getState().proposal;
    if(proposal){commit(proposal);return}
    pending.current={...g};stroke.current=null;useCanyonEdgeStore.setState({proposal:null,held:false});releaseOwner();
  }

  useEffect(()=>{
    if(!active)return;
    const pad=navigator.getGamepads?.().find(p=>p?.connected);padPrevious.current={rt:Boolean(pad?.buttons[7]?.pressed),b:Boolean(pad?.buttons[1]?.pressed),a:Boolean(pad?.buttons[0]?.pressed)};
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
    const previewParameters=()=>{
      const g=pending.current;if(!g||stroke.current)return;
      const state=useCanyonEdgeStore.getState();g.parameters={...(state.draftParameters??g.sourceParameters)};
      try{useCanyonEdgeStore.setState({proposal:proposalFor(g),held:false})}catch(error){useCanyonEdgeStore.setState({proposal:null,message:error.message})}
    };
    const changeOperation=()=>{
      const g=pending.current;if(!g||stroke.current)return;
      g.operation=operationFor(useCanyonEdgeStore.getState(),g.selection);g.distance=0;
      g.prepared=prepareCanyonOperation(g.selection,g.operation,g.parameters);previewParameters();
    };
    const confirm=()=>{const proposal=useCanyonEdgeStore.getState().proposal;if(proposal&&!stroke.current)commit(proposal)};
    const contextualCancel=event=>{if(stroke.current||pending.current){event.preventDefault();cancel()}};
    const unsubscribe=useInteractionStore.subscribe(state=>{if(state.activeTool!=='CANYON_EDGE')cancel()});
    const invalidate=event=>{
      if(event.type==='terrain-settings-changed'&&![...GEOLOGY_SHAPE_KEYS,'terrainEditVersion','terrainVertexEditVersion'].includes(event.detail?.key))return;
      if(!committing.current&&(stroke.current||pending.current)){cancel();useCanyonEdgeStore.setState({message:'Terrain changed — select the wall again.'})}
    };
    const sourceEvents=['tg-world-replaced','geology-terrain-changed','terrain-settings-changed','tg-current-chunk-changed'];
    sourceEvents.forEach(name=>window.addEventListener(name,invalidate));
    window.addEventListener('tg-canyon-parameters-preview',previewParameters);window.addEventListener('tg-canyon-operation-changed',changeOperation);window.addEventListener('tg-canyon-confirm-preview',confirm);window.addEventListener('tg-cancel-tool-preview',contextualCancel);
    window.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);window.addEventListener('blur',cancel);window.addEventListener('tg-canyon-cancel-preview',cancel);window.addEventListener('tg-return-to-world',cancel);
    return()=>{window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);window.removeEventListener('tg-canyon-cancel-preview',cancel);window.removeEventListener('tg-return-to-world',cancel);window.removeEventListener('tg-canyon-parameters-preview',previewParameters);window.removeEventListener('tg-canyon-operation-changed',changeOperation);window.removeEventListener('tg-canyon-confirm-preview',confirm);window.removeEventListener('tg-cancel-tool-preview',contextualCancel);sourceEvents.forEach(name=>window.removeEventListener(name,invalidate));unsubscribe();cancel();useCanyonEdgeStore.getState().reset()};
  // Active sessions read canonical stores and gesture refs; camera/canvas identities are stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active,camera,gl]);

  useFrame((_,delta)=>{
    if(!active)return;
    const pad=navigator.getGamepads?.().find(p=>p?.connected),rt=Boolean(pad?.buttons[7]?.pressed),b=Boolean(pad?.buttons[1]?.pressed),a=Boolean(pad?.buttons[0]?.pressed),previous=padPrevious.current;
    if(b){if(!previous.b)cancel();padPrevious.current={rt,b,a};return}
    if(a&&!previous.a&&gameplayInputAllowed()){
      const proposal=useCanyonEdgeStore.getState().proposal;
      if(proposal)commit(proposal);else if(begin('gamepad-select'))finish(true);
    }
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
    padPrevious.current={rt,b,a};
    const now=performance.now();if(stroke.current||now-lastHover.current<90||!gameplayInputAllowed())return;lastHover.current=now;
    const aim=rayTerrain(camera,raycaster.current);if(!aim)return;
    const state=useCanyonEdgeStore.getState();
    if(pending.current&&state.selection){
      const p=pending.current;
      if(p.mode==='new')p.end=aim;
      else{const axis=axisFor(p.selection,p.operation);p.distance=limited((aim[0]-p.aim[0])*axis[0]+(aim[2]-p.aim[2])*axis[1])}
      try{useCanyonEdgeStore.setState({proposal:proposalFor(p)})}catch(error){useCanyonEdgeStore.setState({proposal:null,message:error.message})}
    }else if(state.mode==='select'){
      const hover=analyzeCanyonWallAt(aim[0],aim[2]);const old=state.hover;
      if((hover?.featureId??'')!==(old?.featureId??'')||hover?.mode!==old?.mode||hover?.side!==old?.side||Boolean(hover)!==Boolean(old)||hover&&old&&Math.hypot(hover.point[0]-old.point[0],hover.point[2]-old.point[2])>1)useCanyonEdgeStore.setState({hover});
    }
  },-1); // Claim raw A/RT before default-priority player and camera subscribers.

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
  const rim=selection?.mode!=='NEW'?(proposal?.existing?canyonBankGuide(proposal.record,selection.side).map(([x,z])=>[x,previewHeight(x,z,proposal)+.55,z]):selection?.path??[]):[];
  const radius=end?Math.max(.12,camera.position.distanceTo(new THREE.Vector3(...end))*Math.tan(camera.fov*Math.PI/360)*12/gl.domElement.clientHeight):.2;
  return <>
    {proposal&&<group userData={{tgCanyonPreview:true,operation:proposal.operation}}><GeologyPlacementGhost proposal={proposal.record} replaceRecord={proposal.previous}/></group>}
    {guide.length>1&&<group userData={{tgCanyonGuide:true,state,selection}}>
      {rim.length>1&&<><Line points={rim} color="#08121c" lineWidth={6} depthTest={false} depthWrite={false} renderOrder={497}/><Line points={rim} color="#2a8fff" lineWidth={ui.selection?3:2} depthTest={false} depthWrite={false} dashed={!ui.selection} dashSize={2} gapSize={1} renderOrder={498}/></>}
      <Line points={guide} color="#08121c" lineWidth={ui.selection?8:6} depthTest={false} depthWrite={false} renderOrder={500} dashed={!ui.selection} dashSize={2} gapSize={1}/>
      <Line points={guide} color="#2a8fff" lineWidth={ui.selection?5:3.5} depthTest={false} depthWrite={false} renderOrder={501} dashed={!ui.selection} dashSize={2} gapSize={1}/>
      <Line points={guide} color="white" lineWidth={1.2} depthTest={false} depthWrite={false} renderOrder={502} dashed={!ui.selection} dashSize={2} gapSize={1}/>
      {[guide[0],end].map((p,i)=><mesh key={i} position={p} rotation={[0,0,Math.PI/4]} renderOrder={503}>{ui.selection?<octahedronGeometry args={[radius*1.5,0]}/>:<sphereGeometry args={[radius,10,8]}/>}<meshBasicMaterial color={i===1?'white':'#2a8fff'} depthTest={false} depthWrite={false} wireframe={!ui.selection}/></mesh>)}
    </group>}
  </>;
}
