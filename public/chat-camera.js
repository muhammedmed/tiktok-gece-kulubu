// Chat never interrupts a gift or an entrance, and never queues expired messages.
export class ChatCamera {
 constructor(){this.clear();}
 clear(){this.nextAt=0;this.lastByViewer=new Map();}
 focus(person,queue,now,onStart){
  if(!person?.viewerId||person.npc||person.role!=='dance'||person.walking||!(person.chatUntil>Date.now()))return false;
  if(queue.current||queue.items.length||now<this.nextAt||now-(this.lastByViewer.get(person.viewerId)??-Infinity)<15)return false;
  this.nextAt=now+5;
  this.lastByViewer.delete(person.viewerId);this.lastByViewer.set(person.viewerId,now);
  if(this.lastByViewer.size>100)this.lastByViewer.delete(this.lastByViewer.keys().next().value);
  queue.start({key:'chat:'+person.viewerId,kind:'chat',person,title:'Sohbet',priority:0,duration:4,
   returnView:'dance',returnDuration:1,onStart},now);
  return true;
 }
}
