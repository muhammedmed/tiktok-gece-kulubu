// Remember actual viewers, not array indexes: joins, removals and gift shots
// must not keep sending the automatic camera back to the first floor slots.
const identity=p=>p.viewerId||p.root.uuid||p;
export const onFloor=p=>p.role==='dance'&&!p.walking&&!p.giftActor&&!p.giftHidden&&!p.moneyHidden&&!p.moneyGuest&&!p.solo;
export class DanceTour {
 constructor(){this.clear();}
 clear(){this.seen=new Map();this.serial=0;this.key=null;this.current=null;this.lastCenter=null;}
 pick(people,key){
  const guests=people.filter(onFloor),active=new Set(guests);
  if(this.key===key&&this.current&&active.has(this.current.first)&&(!this.current.second||active.has(this.current.second))&&this.current.first.dancePartner===(this.current.second||null))return this.current;
  const ids=new Set(guests.map(identity));for(const id of this.seen.keys())if(!ids.has(id))this.seen.delete(id);
  const paired=new Set(),choices=[];
  for(const first of guests){
   if(paired.has(first))continue;
   const second=active.has(first.dancePartner)?first.dancePartner:null;
   paired.add(first);if(second)paired.add(second);
   const members=second?[first,second]:[first],seen=members.map(p=>this.seen.get(identity(p))||0);
   const x=members.reduce((n,p)=>n+p.root.position.x,0)/members.length,z=members.reduce((n,p)=>n+p.root.position.z,0)/members.length;
   choices.push({first,second,x,z,oldest:Math.min(...seen),average:seen.reduce((a,b)=>a+b,0)/seen.length,distance:this.lastCenter?Math.hypot(x-this.lastCenter.x,z-this.lastCenter.z):Math.hypot(x,z)});
  }
  choices.sort((a,b)=>a.oldest-b.oldest||a.average-b.average||b.distance-a.distance);
  this.key=key;this.current=choices[0]||null;
  if(this.current){this.serial++;for(const p of [this.current.first,this.current.second])if(p)this.seen.set(identity(p),this.serial);this.lastCenter={x:this.current.x,z:this.current.z};}
  return this.current;
 }
}
