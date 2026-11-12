const valid=g=>g==='female'||g==='male';
export const viewerKey=value=>String(value??'').trim().replace(/^@/,'').toLowerCase();
export function characterCommand(text){const command=String(text??'').trim().toLocaleLowerCase('tr-TR');return ['kadın','kadin'].includes(command)?'female':command==='erkek'?'male':null;}
export class ViewerPreferences{
 constructor(storage){this.storage=storage;this.key='ala-character-choices-v1';this.choices=new Map();try{for(const [id,g]of JSON.parse(storage?.getItem(this.key)||'[]'))if(viewerKey(id)&&valid(g))this.choices.set(viewerKey(id),g);}catch{}}
 get(id,fallback='female'){return this.choices.get(viewerKey(id))||(valid(fallback)?fallback:'female');}
 has(id){return this.choices.has(viewerKey(id));}
 set(id,gender){const key=viewerKey(id);if(!key||!valid(gender))return false;this.choices.set(key,gender);try{this.storage?.setItem(this.key,JSON.stringify([...this.choices]));return true;}catch{return false;}}
 acceptChat(id,text){const gender=characterCommand(text);return gender?this.set(id,gender):false;}
}
