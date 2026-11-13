// Load before swapping: a slow or failed photo must not erase the initial or
// the last successful photo. Weak keys release state when an actor is removed.
const portraits = new WeakMap();
export function updatePortrait(person, data, now = Date.now()) {
 const cell = person.tag.querySelector('em');
 if (data.avatar) person.avatar = data.avatar;
 const initial = Array.from(data.name || person.name || '?')[0].toLocaleUpperCase('tr');
 if (!cell.querySelector('img')) cell.textContent = initial;
 const url = person.avatar;
 if (!url) return;
 let state = portraits.get(cell);
 if (!state || state.url !== url) {
  state = {url, attempts:0, pending:false, loaded:false, retryAt:0};
  portraits.set(cell, state);
 }
 // Retry transient failures on subsequent state updates, with bounded backoff.
 if (state.pending || state.loaded || state.attempts >= 3 || now < state.retryAt) return;
 state.pending = true;
 state.attempts++;
 const img = cell.ownerDocument.createElement('img');
 img.alt = '';
 img.referrerPolicy = 'no-referrer';
 img.decoding = 'async';
 img.onload = () => {
  if (portraits.get(cell) !== state) return;
  state.pending = false;
  state.loaded = true;
  cell.replaceChildren(img);
 };
 img.onerror = () => {
  if (portraits.get(cell) !== state) return;
  state.pending = false;
  state.retryAt = Date.now() + (state.attempts === 1 ? 5000 : 30000);
 };
 img.src = url;
}
