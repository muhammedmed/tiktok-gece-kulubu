import {avatarUrl} from './live.js';

const calendar = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit'});
export class NightStars {
 constructor(saved = [], now = Date.now) {
  this.now = now;
  this.accounts = new Map(Array.isArray(saved) ? saved : []);
 }
 bucket(handle) {
  const account = String(handle || '').toLowerCase(), day = calendar.format(this.now());
  let bucket = this.accounts.get(account);
  if (!bucket || bucket.day !== day) {
   bucket = {day, people:[], seen:[]};
   this.accounts.set(account, bucket);
  }
  return bucket;
 }
 record(handle, event) {
  if (!handle || !event.id || !['gift','chat','like'].includes(event.type)) return false;
  const bucket = this.bucket(handle), id = String(event.id);
  let person = bucket.people.find(p => p.id === id), changed = false;
  if (person) {
   const name = String(event.name || person.name).slice(0,32), avatar = avatarUrl(event.avatar) || person.avatar;
   changed = name !== person.name || avatar !== person.avatar;
   person.name = name; person.avatar = avatar;
  }
  // Only finalized gifts count: a streak preview already starts the animation,
  // but its final repeatCount is the total, not an additional gift.
  const count = Number(event.amount ?? 1), unit = Number(event.coins), total = count * unit;
  if (event.type !== 'gift' || !Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(unit) || unit < 1 || !Number.isSafeInteger(total)) return changed;
  const receipt = event.giftEventId;
  if (receipt && bucket.seen.includes(receipt)) return changed;
  if (!person) {
   person = {id, name:String(event.name || id).slice(0,32), avatar:avatarUrl(event.avatar), coins:0};
   bucket.people.push(person);
  }
  if (!Number.isSafeInteger(person.coins + total)) return changed;
  person.coins += total;
  if (receipt) { bucket.seen.push(receipt); if (bucket.seen.length > 20000) bucket.seen.shift(); }
  return true;
 }
 snapshot(handle) {
  const bucket = this.bucket(handle);
  // Stable order keeps the earlier supporter in front on an equal total.
  const leader = bucket.people.reduce((best,p) => !best || p.coins > best.coins ? p : best, null);
  return {day:bucket.day, leader:leader ? {...leader} : null};
 }
 serialize() { return [...this.accounts]; }
}
