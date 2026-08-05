const LAT=38.3633556,LON=-97.6833972;
const $=id=>document.getElementById(id);
let hourlyCache=null;

const round=(n,d=0)=>n==null||Number.isNaN(Number(n))?'':Number(Number(n).toFixed(d));
function wetBulbF(tF,rh){if(tF==null||rh==null)return null;const c=(tF-32)*5/9;const w=c*Math.atan(.151977*Math.sqrt(rh+8.313659))+Math.atan(c+rh)-Math.atan(rh-1.676331)+.00391838*Math.pow(rh,1.5)*Math.atan(.023101*rh)-4.686035;return w*9/5+32}
function localDateKey(date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function hourKey(date){return`${localDateKey(date)}T${String(date.getHours()).padStart(2,'0')}:00`}
function hourEnding(date){return`HE${String(date.getHours()+1).padStart(2,'0')}`}
function currentHour(){const d=new Date();d.setMinutes(0,0,0);return d}

async function loadHourly(){
  const params=new URLSearchParams({latitude:LAT,longitude:LON,timezone:'America/Chicago',temperature_unit:'fahrenheit',hourly:'temperature_2m,relative_humidity_2m',past_days:'2',forecast_days:'1'});
  const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{cache:'no-store'});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json(),hourly=data.hourly||{};
  hourlyCache={times:hourly.time||[],temps:hourly.temperature_2m||[],humidity:hourly.relative_humidity_2m||[]};
  hourlyCache.index=new Map(hourlyCache.times.map((time,index)=>[time,index]));
  return hourlyCache;
}

function recordFor(stamp,data){
  const index=data.index.get(hourKey(stamp));
  if(index==null)return{stamp,wet:null,dry:null,rh:null};
  const dry=data.temps[index]??null,rh=data.humidity[index]??null;
  return{stamp,wet:wetBulbF(dry,rh),dry,rh};
}

function last24Completed(data){
  const end=currentHour(),records=[];
  for(let hoursBack=24;hoursBack>=1;hoursBack--){const stamp=new Date(end);stamp.setHours(end.getHours()-hoursBack);records.push(recordFor(stamp,data))}
  return records;
}

function formatCell(value,suffix=''){return value==null?'—':`${round(value)}${suffix}`}
function showToast(text){const toast=$('toast');if(!toast)return;toast.textContent=text;toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2200)}

async function renderMatchedTable(){
  try{
    const data=await loadHourly(),records=last24Completed(data),table=$('rollingBody')?.closest('table');
    if(table)table.querySelector('thead').innerHTML='<tr><th>Date</th><th>Hour Ending</th><th>Wet Bulb</th><th>Dry Bulb</th><th>Humidity</th></tr>';
    $('rollingBody').innerHTML=records.map(r=>`<tr><td>${r.stamp.toLocaleDateString()}</td><td>${hourEnding(r.stamp)}</td><td>${formatCell(r.wet,'°F')}</td><td>${formatCell(r.dry,'°F')}</td><td>${formatCell(r.rh,'%')}</td></tr>`).join('');
    const subtitle=document.querySelector('.modal-head p');if(subtitle)subtitle.textContent='Last 24 completed hour-ending observations';
    $('modal').classList.remove('hidden');
  }catch(error){console.error(error);showToast('Hourly data is unavailable')}
}

async function exportMatchedRows(){
  try{
    const data=await loadHourly(),now=new Date(),completedBefore=currentHour(),csvRows=[];
    for(let dayOffset=-2;dayOffset<=0;dayOffset++){
      const day=new Date(now);day.setDate(now.getDate()+dayOffset);day.setHours(0,0,0,0);
      csvRows.push([day.toLocaleDateString()]);
      csvRows.push(['','Wet Bulb (F)','Dry Bulb (F)','Humidity (%)']);
      for(let hour=0;hour<24;hour++){
        const stamp=new Date(day);stamp.setHours(hour);
        const completed=stamp<completedBefore;
        const record=completed?recordFor(stamp,data):{wet:null,dry:null,rh:null};
        csvRows.push([hourEnding(stamp),record.wet==null?'':round(record.wet),record.dry==null?'':round(record.dry),record.rh==null?'':round(record.rh)]);
      }
      if(dayOffset<0)csvRows.push([]);
    }
    const csv='\ufeff'+csvRows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`bpu-weather-3-day-${localDateKey(now)}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
    showToast('Completed-hour weather file downloaded');
  }catch(error){console.error(error);showToast('Hourly data is unavailable')}
}

async function copyMatchedRows(){
  try{
    const data=hourlyCache||await loadHourly(),records=last24Completed(data);
    const text=['Date\tHour Ending\tWet Bulb (F)\tDry Bulb (F)\tHumidity (%)',...records.map(r=>`${r.stamp.toLocaleDateString()}\t${hourEnding(r.stamp)}\t${round(r.wet)}\t${round(r.dry)}\t${round(r.rh)}`)].join('\n');
    await navigator.clipboard.writeText(text);showToast('Matching completed-hour data copied');
  }catch(error){console.error(error);showToast('Clipboard access was blocked')}
}

function simplifyOperationsIndicators(){
  const grid=$('eventIndicators');
  if(!grid)return;
  const cards=[...grid.children];
  cards.forEach(card=>{
    const name=card.querySelector('strong')?.textContent?.trim().toLowerCase()||'';
    if(name!=='precipitation'&&name!=='nws alerts')card.remove();
  });
  grid.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  const remaining=[...grid.children];
  const overall=$('eventOverall');
  if(overall){
    const hasAlert=remaining.some(card=>card.classList.contains('alerting'));
    const hasWatch=remaining.some(card=>card.classList.contains('watch'));
    overall.className=`event-state ${hasAlert?'alerting':hasWatch?'watch':'normal'}`;
    overall.textContent=hasAlert?'Alert':hasWatch?'Watch':'Normal';
  }
}

const indicatorGrid=$('eventIndicators');
if(indicatorGrid){
  const observer=new MutationObserver(simplifyOperationsIndicators);
  observer.observe(indicatorGrid,{childList:true});
  simplifyOperationsIndicators();
}

$('rollingBtn').onclick=renderMatchedTable;
$('exportBtn').onclick=exportMatchedRows;
$('copyBtn').onclick=copyMatchedRows;
