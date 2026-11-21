import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { geologyDefinition } from '../../systems/geology/geologyDefinition';
import { createGeologyGeometry, previewGeologyRecord } from '../../systems/geology/geologyGeometry';
import { beginGeologyEdit, commitGeologyEdit, cancelGeologyEdit, removeGeologyFeature } from '../../systems/geology/geologyFeatures';
import { useInteractionStore } from '../../systems/interaction/interactionStore';
import { clearGameplayInput } from '../../systems/input/inputOwnership';
import { returnToWorldView, activateWorldTool } from '../../systems/ui/navigationActions';
import ObjectEditHistory from './ObjectEditHistory';
import './GeologyEditor.css';

function PreviewCamera({ zoom, controls, distance }) {
  const { camera } = useThree();
  useEffect(() => {
    const target = controls.current?.target ?? new THREE.Vector3(0, 12, 0);
    const direction = camera.position.clone().sub(target).normalize();
    if (direction.lengthSq() === 0) direction.set(1, .8, 1).normalize();
    camera.position.copy(target).addScaledVector(direction, distance / zoom);
    camera.updateProjectionMatrix(); controls.current?.update();
  }, [camera, zoom, controls, distance]);
  return null;
}
function PreviewFormation({ type, definition }) {
  const geometry = useMemo(() => createGeologyGeometry(previewGeologyRecord(type, definition)), [type, definition]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} userData={{geologyPreview:true}}><meshStandardMaterial color="#877765" roughness={.96} flatShading side={THREE.DoubleSide} /></mesh>;
}
export function GeologyPreview({ type, definition, zoom = 1 }) {
  const controls = useRef(null);
  return <Canvas camera={{position:[105,90,135],fov:45,near:.1,far:4000}} dpr={[1,1.5]}>
    <color attach="background" args={['#111111']} /><ambientLight intensity={1.5}/><directionalLight position={[35,70,45]} intensity={3}/><directionalLight position={[-40,15,-30]} intensity={1}/>
    <PreviewFormation type={type} definition={definition}/><gridHelper args={[240,24,'#484848','#242424']} position={[0,-.1,0]}/>
    <OrbitControls ref={controls} target={[0,12,0]} minDistance={5} maxDistance={1600}/><PreviewCamera zoom={zoom} controls={controls} distance={type==='canyon-wall'?300:180}/>
  </Canvas>;
}

const COMMON = [['height','HEIGHT',1,100,1,'m'],['width','WIDTH',8,160,1,'m'],['seed','EDGE RANDOMIZER',1,99999,1,''],['edgeDeformation','EDGE DEFORMATION',0,1,.01,''],['scale','SCALE',.25,3,.05,'×'],['rotation','ROTATION',-360,360,1,'°']];
export default function GeologyEditor({mesh,live,onChange,onSave,onCancel}) {
  const type=mesh.geologyType;
  const [draft,setDraft]=useState(()=>geologyDefinition(type,mesh.geologyDefinition??mesh.definition));
  const [zoom,setZoom]=useState(1),[message,setMessage]=useState('');
  const owns=useRef(false);
  const definition=live?mesh.geologyDefinition??mesh.definition:draft;
  function release(){if(owns.current){commitGeologyEdit();owns.current=false}if(useInteractionStore.getState().gestureOwner==='object-editor')useInteractionStore.getState().setGestureOwner(null)}
  function cancelGesture(){if(owns.current){cancelGeologyEdit();owns.current=false}if(useInteractionStore.getState().gestureOwner==='object-editor')useInteractionStore.getState().setGestureOwner(null)}
  function begin(pointer=false){if(live&&!owns.current)owns.current=beginGeologyEdit(mesh.id);if(live&&pointer){useInteractionStore.getState().setGestureOwner('object-editor');clearGameplayInput()}}
  function change(key,value){
    const next=geologyDefinition(type,{...definition,[key]:value});
    if(live){begin();try{onChange({geologyDefinition:next});setMessage('')}catch(error){setMessage(error.message);cancelGesture()}}
    else setDraft(next);
  }
  useEffect(()=>{
    const up=()=>release();const cancel=()=>cancelGesture();
    const adjustment=event=>{if(event.target?.closest?.('[data-geology-editor]'))release()};
    const key=event=>{if(event.key==='Escape'&&owns.current){event.preventDefault();event.stopImmediatePropagation();cancelGesture()}};
    window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('tg-return-to-world',cancel);window.addEventListener('keydown',key,true);
    window.addEventListener('tg-control-adjustment-end',adjustment);
    return()=>{window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('tg-return-to-world',cancel);window.removeEventListener('keydown',key,true);window.removeEventListener('tg-control-adjustment-end',adjustment);cancelGesture()};
  // The mounted editor is keyed by the immutable feature/template ID; handlers use its ownership ref.
  },[]);
  const parameters=[...COMMON,['length',type==='giant-rock'||type==='cliff-face'?'DEPTH':'LENGTH',8,240,1,'m'],...(type==='canyon-wall'?[['floorWidth','FLOOR WIDTH',4,Math.max(4,definition.width-4),1,'m']]:[])];
  return <div className="tg-mesh-edit-backdrop tg-object-editor-backdrop" role="dialog" aria-modal={!live} data-world-object-editor={live?true:undefined} data-geology-editor data-input-context="panel" aria-label="Edit geology object" onPointerDownCapture={()=>{if(live){useInteractionStore.getState().setGestureOwner('object-editor');clearGameplayInput()}}}>
    <div className="tg-mesh-edit-window tg-focused-object-editor">
      <div className="tg-mesh-edit-preview"><div className="tg-mesh-edit-preview-title">{mesh.name}</div><div style={{height:'100%',minHeight:280}}><GeologyPreview type={type} definition={definition} zoom={zoom}/></div></div>
      <div className="tg-mesh-edit-controls"><h2>EDIT OBJECT</h2><p className="tg-library-guidance">{live?'WORLD FORMATION — changes apply live. Undo restores the previous gesture.':'LIBRARY TEMPLATE — Apply these dimensions, then choose Place.'}</p>
        <fieldset className="tg-geology-properties"><legend>GEOLOGY</legend>{parameters.map(([key,label,min,max,step,unit])=><label key={key}><span>{label}</span><strong>{Number(definition[key]).toFixed(step<1?2:0)} {unit}</strong><input data-geology-property={key} aria-label={'Geology '+label.toLowerCase()} type="range" min={min} max={max} step={step} value={definition[key]} onPointerDown={()=>begin(true)} onChange={event=>change(key,Number(event.target.value))} onBlur={release}/></label>)}</fieldset>
        <details><summary>PREVIEW CAMERA</summary><label>PREVIEW ZOOM<input aria-label="Geology preview zoom" type="range" min=".25" max="3" step=".05" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/></label><p className="tg-library-guidance">Drag to orbit. Preview Zoom changes camera framing.</p></details>
        <p className="tg-library-guidance">{(definition.width*definition.scale).toFixed(1)} m wide · {(definition.height*definition.scale).toFixed(1)} m high · {(definition.length*definition.scale).toFixed(1)} m {type==='canyon-wall'?'long':'deep'}</p>
        {message&&<p role="alert">{message}</p>}
        <div className="tg-mesh-edit-footer">
          {live && type==='canyon-wall' && <button data-geology-refine onClick={()=>{release();onCancel();returnToWorldView();activateWorldTool('CANYON_EDGE')}}>DRAW CANYON EDGE</button>}
          {live?<><ObjectEditHistory/><button className="tg-mesh-cancel" data-geology-delete onClick={()=>{release();removeGeologyFeature(mesh.id);onCancel()}}>REMOVE FORMATION</button></>:<><button className="tg-mesh-save" data-geology-apply onClick={()=>onSave({geologyDefinition:definition,applyTemplate:true})}>APPLY TO TEMPLATE</button><button className="tg-mesh-save" onClick={()=>onSave({geologyDefinition:definition})}>SAVE LIBRARY COPY</button></>}
          <button className="tg-mesh-cancel" data-object-editor-close onClick={()=>{cancelGesture();onCancel()}}>{live?'BACK TO SOUTH':'CANCEL'}</button>
        </div>
      </div>
    </div>
  </div>;
}
