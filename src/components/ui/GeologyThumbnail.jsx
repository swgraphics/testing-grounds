import {memo,useMemo} from 'react';
import {createGeologyGeometry,previewGeologyRecord} from '../../systems/geology/geologyGeometry';

export default memo(function GeologyThumbnail({type,definition}){
  const paths=useMemo(()=>{
    const geometry=createGeologyGeometry(previewGeologyRecord(type,definition)),p=geometry.attributes.position,index=geometry.index;
    const projected=Array.from({length:p.count},(_,i)=>[(p.getX(i)-p.getZ(i))*.7,(p.getX(i)+p.getZ(i))*.24-p.getY(i)*.9]);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const [x,y]of projected){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
    const scale=85/Math.max(maxX-minX,maxY-minY,1),groups=['','',''];
    for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];if(ids.every(id=>Math.abs(p.getY(id))<.01))continue;const slope=(p.getY(ids[0])-p.getY(ids[1]))+(p.getY(ids[2])-p.getY(ids[1]));const group=slope>2?2:slope< -2?0:1;groups[group]+='M'+ids.map(id=>[(projected[id][0]-(minX+maxX)/2)*scale+50,(projected[id][1]-(minY+maxY)/2)*scale+50].map(v=>v.toFixed(2)).join(',')).join('L')+'Z'}
    geometry.dispose();return groups;
  },[type,definition]);
  return <svg viewBox="0 0 100 100" width="80" height="64" role="img" aria-label={type+' procedural preview'}>{paths.map((d,i)=><path key={i} d={d} fill={['#665f54','#9c907b','#c7b99f'][i]} stroke="#282b2e" strokeWidth=".35"/>)}</svg>;
});
