const $=s=>document.querySelector(s), fmt=v=>'$'+v.toLocaleString('en-US',{maximumFractionDigits:0});
const S={branch:'A',dist:'Uniform',pct:100,n:10000};let chart,timer,first=true;
const COL={Uniform:'#12263a',Normal:'#0f7b6c'};
function seg(id,key){$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 $(id).querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));S[key]=b.dataset.v;run();});}
seg('#branch','branch');seg('#dist','dist');seg('#n','n');
$('#pct').addEventListener('input',e=>{S.pct=+e.target.value;label();clearTimeout(timer);timer=setTimeout(run,160);});
function label(){const m=INFO[S.branch].mean_profit,t=m*S.pct/100;$('#pctv').textContent=S.pct+'%';
 $('#tgt').textContent=`Target ${fmt(t)} · rata-rata historis ${fmt(m)}/bulan`;}
function count(el,to){if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=to.toFixed(1)+'%';return;}
 const t0=performance.now(),d=900;(function f(t){const k=Math.min((t-t0)/d,1),e=1-Math.pow(1-k,3);el.textContent=(to*e).toFixed(1)+'%';if(k<1)requestAnimationFrame(f);})(t0);}
const targetLine={id:'tl',afterDatasetsDraw(c,_,o){const x=c.scales.x,i=o.idx;if(i==null)return;const px=x.getPixelForValue(i),{top,bottom}=c.chartArea,g=c.ctx;
 g.save();g.strokeStyle='#e0a800';g.lineWidth=3;g.setLineDash([7,5]);g.beginPath();g.moveTo(px,top);g.lineTo(px,bottom);g.stroke();
 g.setLineDash([]);g.fillStyle='#12263a';g.font='600 12px Instrument Sans';g.textAlign='center';g.fillText('Target '+o.text,px,top-6);g.restore();}};
async function run(){label();const r=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:S.branch,pct:S.pct,n:S.n})});
 const d=await r.json(),keys=S.dist==='Both'?['Uniform','Normal']:[S.dist];
 const idx=d.centers.findIndex(c=>c>=d.target);
 $('#meta').textContent=`${d.n.toLocaleString('id-ID')} skenario × ${d.n_tx} transaksi per bulan, seed NIM.`;
 $('#tags').innerHTML=keys.map(k=>`<div class="tag"><small>Peluang ${k}</small><b data-p="${d.dist[k].prob*100}">0%</b></div>`).join('');
 document.querySelectorAll('#tags b').forEach(b=>count(b,+b.dataset.p));
 $('#stats tbody').innerHTML=keys.map(k=>`<tr><td>${k}</td><td>${fmt(d.dist[k].mean)}</td><td>${fmt(d.dist[k].std)}</td><td>${(d.dist[k].prob*100).toFixed(2)}%</td></tr>`).join('');
 const ds=keys.map(k=>({label:k,data:d.dist[k].counts,borderWidth:0,borderRadius:2,
  backgroundColor:keys.length>1?COL[k]+'aa':d.centers.map(c=>c>=d.target?'#0f7b6c':'#9fb0bf')}));
 if(!chart){chart=new Chart($('#chart'),{type:'bar',data:{labels:d.centers,datasets:ds},plugins:[targetLine],
  options:{maintainAspectRatio:false,animation:{duration:first?1000:550,easing:'easeOutCubic'},categoryPercentage:1,barPercentage:.96,
  scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7,callback:function(v){return fmt(this.getLabelForValue(v))}}},y:{grid:{color:'#c9d3dc'},title:{display:true,text:'Jumlah skenario'}}},
  plugins:{legend:{display:keys.length>1,position:'bottom'},tl:{},tooltip:{callbacks:{title:i=>'Profit sekitar '+fmt(+i[0].label)}}}}});}
 chart.data.labels=d.centers;chart.data.datasets=ds;chart.options.plugins.legend.display=keys.length>1;chart.options.plugins.tl={idx:idx<0?d.centers.length-1:idx,text:fmt(d.target)};chart.update();first=false;
 const [a,b]=[d.dist.Uniform.prob,d.dist.Normal.prob];
 $('#note').textContent=S.dist==='Both'?`Selisih peluang antara asumsi Uniform dan Normal: ${(Math.abs(a-b)*100).toFixed(1)} poin persen. Semakin besar selisihnya, semakin sensitif hasil terhadap asumsi distribusi.`:
 'Batang hijau adalah skenario yang mencapai target, batang abu-abu yang belum. Garis kuning menandai target.';}
label();run();
