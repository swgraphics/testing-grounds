import { useEffect, useState } from 'react';
import { useWorldStore } from '../../systems/world/worldStore';
import { getExpansionCandidates } from '../../systems/world/terrainRegions';
import { addTerrainChunk } from '../../systems/world/terrainExpansion';
export default function ChunkCreationDialog({onClose,onCreated,initialGrid='',playerPosition=[0,0,0]}) {
 const world=useWorldStore(s=>s.world),candidates=getExpansionCandidates(world,playerPosition);
 const [grid,setGrid]=useState(()=>candidates.find(c=>c.grid===initialGrid)?.grid ?? candidates[0]?.grid ?? '');
 const [name,setName]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const escape=e=>{if(e.key==='Escape'){e.preventDefault();onClose()}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[onClose]);
 const target=candidates.find(c=>c.grid===grid);
 function create(event){event.preventDefault();const result=addTerrainChunk({grid,name});if(!result.ok){setError(result.message);return;}onCreated?.(result);onClose();}
 return <div className="tg-chunk-dialog-backdrop" role="presentation" onPointerDown={onClose}>
 <form className="tg-chunk-dialog" role="dialog" aria-modal="true" aria-label="Add terrain chunk" onSubmit={create} onKeyDown={e=>{if(e.key!=='Tab')return;const controls=[...e.currentTarget.querySelectorAll('select,input,button:not(:disabled)')],index=controls.indexOf(document.activeElement);e.preventDefault();controls[(index+(e.shiftKey?-1:1)+controls.length)%controls.length]?.focus()}} onPointerDown={e=>e.stopPropagation()}>
 <div className="tg-chunk-dialog-title">ADD WORLD CHUNK</div>
 <div className="tg-chunk-dialog-copy">Extend the world with connected terrain. Existing areas and edits stay in place.</div>
 <label><span>GRID COORDINATE</span><select autoFocus aria-label="New terrain location" value={grid} onChange={e=>setGrid(e.target.value)} required>{candidates.map(c=><option key={c.grid} value={c.grid}>{c.grid} / X {c.position[0]}, Z {c.position[2]} / {c.size}M</option>)}</select></label>
 <label><span>CHUNK NAME</span><input value={name} onChange={e=>setName(e.target.value)} placeholder={'CHUNK '+grid} maxLength={32}/></label>
 {target&&<p className="tg-chunk-dialog-copy">{target.size} x {target.size}M terrain // X {target.position[0]} / Z {target.position[2]}</p>}
 {(error||!target)&&<p role="alert">{error||'No supported adjacent terrain location is available.'}</p>}
 <div className="tg-chunk-dialog-actions"><button type="button" onClick={onClose}>CANCEL</button><button type="submit" disabled={!target}>CREATE CHUNK</button></div>
 </form></div>;
}
