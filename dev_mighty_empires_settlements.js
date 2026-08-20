// Mighty Empires development: terrain-aware settlement generation.
(() => {
  let currentCampaignId = null;
  let busy = false;

  const key = (q,r) => `${q},${r}`;
  const neighbours = (q,r) => {
    const odd=q&1;
    const ds=odd?[[1,0],[1,1],[0,1],[-1,1],[-1,0],[0,-1]]:[[1,-1],[1,0],[0,1],[-1,0],[-1,-1],[0,-1]];
    return ds.map(([dq,dr])=>[q+dq,r+dr]);
  };
  function captureCampaign(event){
    const button=event.target.closest?.('[data-open-campaign]');
    const card=button?.closest?.('.campaign-card');
    if(button?.dataset?.openCampaign&&card?.textContent?.includes('Mighty Empires')) currentCampaignId=button.dataset.openCampaign;
  }
  function ownerIsViewing(){return document.getElementById('meCampaignMeta')?.textContent?.includes('Campaign owner');}
  function mapExists(){return /\b\d+ hexes\b/.test(document.getElementById('meCampaignMeta')?.textContent||'');}
  async function loadHexes(){
    const {data,error}=await window.whrSupabase.from('mighty_empire_hexes').select('id,q,r,terrain_type,settlement_type,owner_id').eq('campaign_id',currentCampaignId);
    if(error)throw error; return data||[];
  }
  function score(hex,type,byKey){
    const adjacent=neighbours(hex.q,hex.r).map(([q,r])=>byKey.get(key(q,r))).filter(Boolean);
    const river=hex.terrain_type==='river_valley'||adjacent.some(h=>h.terrain_type==='river_valley');
    const coast=hex.terrain_type==='coastal'||adjacent.some(h=>h.terrain_type==='coastal');
    const high=hex.terrain_type==='highland'||adjacent.some(h=>h.terrain_type==='highland');
    let s=Math.random();
    if(type==='city'){if(river)s+=2.5;if(coast)s+=1.4;if(hex.terrain_type==='lowland')s+=1;}
    if(type==='fortress'){if(high)s+=2.2;if(coast)s+=.8;if(hex.terrain_type==='lowland')s+=.4;}
    if(type==='village'){if(hex.terrain_type==='lowland')s+=1.8;if(river)s+=1.2;if(hex.terrain_type==='coastal')s+=.5;}
    return s;
  }
  function farEnough(hex,chosen,minDistance){
    return chosen.every(c=>Math.abs(c.q-hex.q)+Math.abs(c.r-hex.r)>=minDistance);
  }
  async function generateSettlements(){
    if(busy||!currentCampaignId||!ownerIsViewing())return;
    if(!confirm('Generate independent settlements across this map?\n\nExisting villages, cities and fortresses will be replaced. Player capitals and ownership will be preserved.'))return;
    const button=document.getElementById('meGenerateSettlements'); busy=true;
    if(button){button.disabled=true;button.textContent='Generating…';}
    try{
      const hexes=await loadHexes(); const byKey=new Map(hexes.map(h=>[key(h.q,h.r),h]));
      const land=hexes.filter(h=>h.terrain_type!=='sea');
      const candidates=land.filter(h=>h.settlement_type!=='capital'&&!h.owner_id&&['lowland','river_valley','coastal','highland'].includes(h.terrain_type));
      const existingCapitals=hexes.filter(h=>h.settlement_type==='capital');
      const landCount=land.length;
      const targets={city:Math.max(1,Math.round(landCount/32)),fortress:Math.max(1,Math.round(landCount/25)),village:Math.max(2,Math.round(landCount/12))};
      const chosen=[...existingCapitals]; const assignments=[];
      for(const type of ['city','fortress','village']){
        const pool=candidates.filter(h=>!assignments.some(a=>a.hex.id===h.id)).sort((a,b)=>score(b,type,byKey)-score(a,type,byKey));
        for(const hex of pool){
          if(assignments.filter(a=>a.type===type).length>=targets[type])break;
          const minDistance=type==='village'?2:3;
          if(!farEnough(hex,chosen,minDistance))continue;
          assignments.push({hex,type}); chosen.push(hex);
        }
      }
      const {error:clearError}=await window.whrSupabase.from('mighty_empire_hexes').update({settlement_type:null,updated_at:new Date().toISOString()}).eq('campaign_id',currentCampaignId).in('settlement_type',['village','city','fortress']);
      if(clearError)throw clearError;
      for(const {hex,type} of assignments){
        const {error}=await window.whrSupabase.from('mighty_empire_hexes').update({settlement_type:type,updated_at:new Date().toISOString()}).eq('id',hex.id);
        if(error)throw error;
      }
      document.getElementById('meReload')?.click();
    }catch(error){alert(`Unable to generate settlements: ${error.message||error}`);}
    finally{busy=false;if(button){button.disabled=false;button.textContent='Generate Settlements';}}
  }
  function install(){
    const dialog=document.getElementById('mightyEmpiresCampaignDialog'); const actions=dialog?.querySelector('.me-header-actions');
    if(!dialog||!actions||!ownerIsViewing()||!mapExists()){document.getElementById('meGenerateSettlements')?.remove();return;}
    if(document.getElementById('meGenerateSettlements'))return;
    const b=document.createElement('button');b.id='meGenerateSettlements';b.className='me-btn secondary';b.type='button';b.textContent='Generate Settlements';b.onclick=generateSettlements;
    const realm=document.getElementById('meStartingRealms');actions.insertBefore(b,realm||actions.firstChild);
  }
  document.addEventListener('click',captureCampaign,true);
  const observer=new MutationObserver(()=>{if(document.getElementById('mightyEmpiresCampaignDialog')?.open)install();});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
})();
