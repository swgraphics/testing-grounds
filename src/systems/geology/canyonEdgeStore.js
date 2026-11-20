import {create} from 'zustand';
export const useCanyonEdgeStore=create(set=>({
  mode:'select',operation:'auto',parameters:{height:20,width:24,edgeDeformation:.35,seed:173,side:'right'},hover:null,selection:null,proposal:null,held:false,message:'',
  setMode(mode){window.dispatchEvent(new Event('tg-canyon-cancel-preview'));set({mode,selection:null,proposal:null,message:''})},
  setOperation(operation){window.dispatchEvent(new Event('tg-canyon-cancel-preview'));set({operation,proposal:null,message:''})},
  setParameter(key,value){set(state=>({parameters:{...state.parameters,[key]:value}}))},
  reset(){set({mode:'select',operation:'auto',hover:null,selection:null,proposal:null,held:false,message:''})},
}));
