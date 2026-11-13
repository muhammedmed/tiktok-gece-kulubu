import {updatePortrait} from './portrait.js';

export function setupNightScoreboard() {
 const card = document.getElementById('nightStarCard'), name = document.getElementById('nightStarName');
 const count = document.getElementById('floorLiveCount'), portrait = card.querySelector('em');
 let identity = null, person = {tag:card, name:''};
 return state => {
  count.textContent = String(state.players.filter(p => p.role === 'dance').length);
  const leader = state.nightStar?.leader;
  if (identity !== (leader?.id || null)) {
   identity = leader?.id || null;
   // A new element also invalidates any late image callback for the old leader.
   const next = portrait.cloneNode(false);
   const old = card.querySelector('em'); old.replaceWith(next);
   person = {tag:card, name:leader?.name || ''};
  }
  card.classList.toggle('has-star', Boolean(leader));
  name.textContent = leader?.name || 'İlk yıldız bekleniyor';
  if (leader) { person.name = leader.name; updatePortrait(person, leader); }
  else card.querySelector('em').textContent = '✦';
 };
}
