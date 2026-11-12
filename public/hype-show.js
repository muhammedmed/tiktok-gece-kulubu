import {HYPE_SECONDS,hypeEnvelope} from './hype-motion.js';

// One clock for the whole floor; extra gifts never restart a figure mid-step.
export class HypeShow {
 constructor(){this.active=null;}
 start(event,now){this.update(now);if(this.active)return false;this.active={id:event.id,name:event.name||'Misafir',startedAt:now};return true;}
 update(now){if(this.active&&now-this.active.startedAt>=HYPE_SECONDS)this.active=null;return this.active;}
 energy(now){return this.active?hypeEnvelope(now-this.active.startedAt):0;}
 clear(){this.active=null;}
}

export {hypeCamera} from './hype-camera.js';
