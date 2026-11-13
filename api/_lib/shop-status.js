'use strict';
const zone='America/New_York';
const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function parts(date){return Object.fromEntries(fmt.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}
function key(date){const p=parts(date);return `${p.year}-${p.month}-${p.day}`;}
function wall(date,time){const [y,m,d]=date.split('-').map(Number),[h,n]=time.split(':').map(Number);const target=Date.UTC(y,m-1,d,h,n);let t=target;for(let i=0;i<4;i++){const p=parts(new Date(t));const actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);if(actual===target)return t;t+=target-actual;}return NaN;}
const days=['Su','Mo','Tu','We','Th','Fr','Sa'];
const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
function unknown(now=new Date()){return {status:'unknown',nextChange:null,note:'',label:'Hours unavailable',checkedAt:now.toISOString()};}
function compute(b,now=new Date()){
 if(!b||!Array.isArray(b.hours)||!b.hours.length||!Array.isArray(b.holidays))return unknown(now);
 const seen=new Set();
 for(const h of b.hours){if(!Array.isArray(h.days)||!h.days.length||!time.test(h.opens)||!time.test(h.closes)||h.opens>=h.closes)return unknown(now);for(const d of h.days){if(!days.includes(d)||seen.has(d))return unknown(now);seen.add(d);}}
 const overrides=new Map();
 for(const h of b.holidays){const date=String(h.date||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||overrides.has(date)||typeof h.closed!=='boolean'||(!h.closed&&(!time.test(h.opens)||!time.test(h.closes)||h.opens>=h.closes)))return unknown(now);overrides.set(date,h);}
 const today=key(now), anchor=new Date(today+'T12:00:00Z');const intervals=[];
 for(let i=0;i<15;i++){const d=new Date(+anchor+i*86400000),date=d.toISOString().slice(0,10),override=overrides.get(date),schedule=override?(override.closed?null:override):b.hours.find(h=>h.days.includes(days[d.getUTCDay()]));if(schedule){const start=wall(date,schedule.opens),end=wall(date,schedule.closes);if(!Number.isFinite(start)||!Number.isFinite(end))return unknown(now);intervals.push({start,end});}}
 const current=intervals.find(i=>i.start<=+now&&+now<i.end),next=current?current.end:intervals.find(i=>i.start>+now)?.start;
 const nextDate=next?new Date(next):null;
 const clock=nextDate?new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',...(current||key(nextDate)===today?{}:{weekday:'short'})}).format(nextDate):'';
 return {status:current?'open':'closed',nextChange:nextDate?.toISOString()||null,note:String(overrides.get(today)?.note||'').replace(/[<>\x00-\x1f]/g,'').slice(0,80),label:current?`Open · closes ${clock} ET`:next?`Closed · opens ${clock} ET`:'Closed · check upcoming hours',checkedAt:now.toISOString()};
}
module.exports={compute,unknown,wall};
