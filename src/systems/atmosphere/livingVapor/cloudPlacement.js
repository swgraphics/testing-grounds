import { BUILTIN_OBJECTS } from '../../objects/objectRegistry';
import { useInteractionStore } from '../../interaction/interactionStore';
import { returnToWorldView } from '../../ui/navigationActions';
import { cloudRecords, useCloudUI } from './cloudState.js';
import { useWorldStore } from '../../world/worldStore';
import { MAX_CLOUDS } from './settings.js';

// Dev Tools enters the same aerial placement contract as the Object Library.
export function beginCloudPlacement(family = 'cumulus', origin = 'east') {
  const ui = useCloudUI.getState();
  if (!ui.supported) {
    useCloudUI.setState({ message: 'Living Vapor requires WebGL2 and 3D texture support.' });
    return false;
  }
  if (Object.keys(cloudRecords(useWorldStore.getState().world)).length >= MAX_CLOUDS) {
    useCloudUI.setState({ message: `Cloud limit reached (${MAX_CLOUDS}). Delete a cloud to add another.` });
    return false;
  }
  const mesh = BUILTIN_OBJECTS.find(entry => entry.kind === 'cloud' && entry.family === family);
  if (!mesh) return false;
  window.dispatchEvent(new Event('pointerup'));
  window.dispatchEvent(new CustomEvent('tg-mesh-cancel-placement'));
  returnToWorldView();
  useCloudUI.setState({ creationFamily: family, tool: 'emit' });
  useInteractionStore.getState().activate({ target: `object:${mesh.id}`, tool: 'OBJECT', mode: 'place' });
  window.dispatchEvent(new CustomEvent('tg-cloud-place-request', { detail: { mesh, origin } }));
  return true;
}
