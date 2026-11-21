import {create} from 'zustand';
export const useCanyonEdgeStore=create((set,get)=>({
  mode:'select',operation:'auto',parameters:{height:20,width:24,edgeDeformation:.35,seed:173,side:'right'},draftParameters:null,hover:null,selection:null,proposal:null,held:false,message:'',
  setMode(mode){if(!['select','new'].includes(mode))return;window.dispatchEvent(new Event('tg-canyon-cancel-preview'));set({mode,selection:null,draftParameters:null,proposal:null,message:''})},
  setOperation(operation){if(!['auto','widen','extend','deform'].includes(operation))return;set({operation,proposal:null,message:''});window.dispatchEvent(new Event('tg-canyon-operation-changed'))},
  setParameter(key,value){
    const state=get();if(state.held)return;
    if(key==='side'){if(!['left','right'].includes(value))return}else{
      if(!Number.isFinite(Number(value)))return;
      const ranges={height:state.selection?[.25,300]:[1,100],width:state.selection?[1,480]:[8,160],edgeDeformation:[0,1],seed:[1,state.selection?.featureId?199999:99999]};
      if(!ranges[key])return;value=Math.max(ranges[key][0],Math.min(ranges[key][1],Number(value)));if(key==='seed')value=Math.round(value);
    }
    const target=state.selection?'draftParameters':'parameters';set({[target]:{...(state[target]??state.parameters),[key]:value},message:''});
    if(state.selection)window.dispatchEvent(new Event('tg-canyon-parameters-preview'));
  },
  reset(){set({mode:'select',operation:'auto',draftParameters:null,hover:null,selection:null,proposal:null,held:false,message:''})},
}));
