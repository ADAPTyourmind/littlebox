(function(root){
'use strict';
const DAY=86400000, cache=new Map();
const iso=d=>d.toISOString().slice(0,10);
const date=s=>new Date(s+'T00:00:00Z');
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;return new Date(Date.UTC(y,Math.floor(n/31)-1,n%31+1));}
function holidays(y){if(cache.has(y))return cache.get(y);const h=new Set(['01-01','04-21','05-01','09-07','10-12','11-02','11-15','12-25'].map(s=>y+'-'+s));if(y>=2024)h.add(y+'-11-20');const e=easter(y);[-48,-47,-2,60].forEach(n=>h.add(iso(new Date(+e+n*DAY))));cache.set(y,h);return h;}
function business(d){return d.getUTCDay()!==0&&d.getUTCDay()!==6&&!holidays(d.getUTCFullYear()).has(iso(d));}
function following(d){d=new Date(+d);while(!business(d))d=new Date(+d+DAY);return d;}
function count(a,b){let n=0;for(let d=new Date(+a);d<b;d=new Date(+d+DAY))if(business(d))n++;return n;}
function addMonths(d,n){const y=d.getUTCFullYear(),m=d.getUTCMonth()+n,day=d.getUTCDate(),last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(day,last)));}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function schedule(months,start=today()){if(!Number.isInteger(+months)||months<1||months>600)throw Error('Prazo inválido');const anchor=date(start);if(!Number.isFinite(+anchor))throw Error('Data inválida');const first=following(anchor),end=following(addMonths(anchor,+months));return {start:first,end,du:count(first,end),deposits:Array.from({length:+months},(_,i)=>following(addMonths(anchor,i+1)))};}
function svensson(t,p){if(!p||!['beta1','beta2','beta3','beta4','lambda1','lambda2'].every(k=>Number.isFinite(p[k]))||p.lambda1<=0||p.lambda2<=0)throw Error('Curva inválida');if(t===0)return p.beta1+p.beta2;const x=p.lambda1*t,z=p.lambda2*t,a=-Math.expm1(-x)/x;return p.beta1+p.beta2*a+p.beta3*(a-Math.exp(-x))+p.beta4*(-Math.expm1(-z)/z-Math.exp(-z));}
function factors(rate,pct,months,start=today()){const s=schedule(+months,start),annual=1+(rate/100)*pct;if(!(annual>0))throw Error('Taxa inválida');const growth=du=>Math.pow(annual,du/252);return {...s,initial: growth(s.du),annuity:s.deposits.reduce((sum,d)=>sum+growth(count(d,s.end)),0)};}
function selectedStart(){return root.document?.getElementById('businessStart')?.value||today();}
const api={iso,date,holidays,business,following,count,addMonths,today,schedule,svensson,factors,selectedStart};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Business252=api;
})(typeof window!=='undefined'?window:globalThis);
