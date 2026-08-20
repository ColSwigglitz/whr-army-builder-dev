// Mighty Empires development: stable local coastal tile renderer using local source sheets.
(() => {
  const BASE='assets/mighty-empires/coastal/source/';
  const SHEETS={1:`${BASE}coastal_set_1.jpg`,2:`${BASE}coastal_set_2.jpg`};
  const CENTRES=[[84,77],[336,77],[210,146],[84,216],[336,216],[210,285],[84,355],[336,355],[210,424],[84,494],[336,494],[210,563],[84,633],[336,633]];
  const EDGE_SETS={
    1:[['sea','sea','land','land','land','sea'],['sea','sea','sea','sea','land','sea'],['land','land','land','sea','land','land'],['sea','sea','sea','sea','land','sea'],['land','land','land','sea','sea','land'],['sea','land','land','land','land','sea'],['sea','land','land','land','land','sea'],['land','land','land','sea','sea','land'],['sea','sea','land','land','land','sea'],['land','land','land','sea','land','land'],['sea','sea','sea','land','land','sea'],['land','sea','sea','sea','sea','land'],['sea','sea','land','land','land','sea'],['land','land','land','sea','land','land']],
    2:[['sea','land','land','land','land','land'],['land','sea','sea','sea','sea','land'],['sea','sea','sea','sea','land','land'],['land','sea','sea','sea','sea','land'],['sea','land','land','land','sea','land'],['sea','sea','land','land','land','sea'],['land','sea','sea','land','sea','sea'],['sea','land','land','land','sea','land'],['land','land','sea','sea','land','land'],['sea','land','land','land','land','land'],['land','land','sea','sea','land','land'],['sea','sea','sea','sea','land','sea'],['land','sea','sea','sea','sea','land'],['sea','land','land','land','land','sea']]
  };
  const TILES=[];
  for(const set of [1,2]) CENTRES.forEach(([cx,cy],i)=>TILES.push({id:`coastal${set}_${String(i+1).padStart(2,'0')}`,set,cx,cy,edges:EDGE_SETS[set][i]}));
  const byId=new Map(TILES.map(t=>[t.id,t]));
  let campaignId=null,hexes=[],loading=false;

  function installStyles(){
    if(document.getElementById('meLocalTileStyles'))return;
    const s=document.createElement('style');s.id='meLocalTileStyles';s.textContent=`
      .me-hex{width:104px!important;height:90px!important;overflow:hidden!important;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)!important;border:0!important}
      .me-tile-art{position:absolute;left:-7px;top:-7px;width:118px;height:104px;display:block;z-index:0;pointer-events:none;background-repeat:no-repeat;background-size:327.6px 463.45px;transform-origin:59px 52px}
      .me-hex.coastal{background:#9fcbd5!important}
      .me-hex .me-hex-label,.me-hex .me-feature{position:relative;z-index:3}
      .me-rotate-tile{margin-top:8px;width:100%}
    `;document.head.appendChild(s);
  }
  const key=(q,r)=>`${q},${r}`;
  function dirs(h){const o=h.q&1;return o?[[h.q,h.r-1],[h.q+1,h.r],[h.q+1,h.r+1],[h.q,h.r+1],[h.q-1,h.r+1],[h.q-1,h.r]]:[[h.q,h.r-1],[h.q+1,h.r-1],[h.q+1,h.r],[h.q,h.r+1],[h.q-1,h.r],[h.q-1,h.r-1]];}
  function desired(h,map){return dirs(h).map(([q,r])=>{const n=map.get(key(q,r));return !n||n.terrain_type==='sea'?'sea':'land';});}
  function rotated(edges,steps){return edges.map((_,i)=>edges[(i-steps+6)%6]);}
  function hash(h){return Math.abs(((h.q*73856093)^(h.r*19349663))>>>0);}
  function choose(h,map){const want=desired(h,map);let best=null;for(const t of TILES)for(let s=0;s<6;s++){const got=rotated(t.edges,s);let mismatch=0;for(let i=0;i<6;i++)if(got[i]!==want[i])mismatch++;const tie=(hash(h)+s*31+t.id.charCodeAt(t.id.length-1))%997;if(!best||mismatch<best.mismatch||(mismatch===best.mismatch&&tie<best.tie))best={tile:t,rotation:s*60,mismatch,tie};}return best;}
  function owner(){return document.getElementById('meCampaignMeta')?.textContent?.includes('Campaign owner');}
  async function loadHexes(){
    if(!campaignId||loading||!window.whrSupabase)return;
    loading=true;
    try{const {data,error}=await window.whrSupabase.from('mighty_empire_hexes').select('id,q,r,terrain_type,terrain_variant,rotation').eq('campaign_id',campaignId);if(error)throw error;hexes=data||[];await decorate();}
    catch(e){console.warn('Unable to load local Mighty Empires tile art',e);}finally{loading=false;}
  }
  async function persist(h,tile,rotation){
    if(!owner())return;
    const {error}=await window.whrSupabase.from('mighty_empire_hexes').update({terrain_variant:tile.id,rotation,updated_at:new Date().toISOString()}).eq('id',h.id);
    if(!error){h.terrain_variant=tile.id;h.rotation=rotation;}
  }
  function styleArt(art,tile,rotation){
    const scale=.65;
    const x=-(tile.cx-80)*scale-7;
    const y=-(tile.cy-80)*scale-7;
    art.style.backgroundImage=`url('${SHEETS[tile.set]}')`;
    art.style.backgroundPosition=`${x}px ${y}px`;
    art.style.transform=`rotate(${rotation}deg)`;
  }
  async function decorate(){
    const mapEl=document.getElementById('meMap');if(!mapEl||!hexes.length)return;
    const map=new Map(hexes.map(h=>[key(h.q,h.r),h]));
    const pending=[];
    mapEl.querySelectorAll('.me-hex').forEach(b=>{
      const m=(b.querySelector('.me-hex-label')?.textContent||'').match(/(\d+)\s*,\s*(\d+)/);if(!m)return;
      const h=map.get(key(Number(m[1]),Number(m[2])));if(!h)return;
      b.style.left=`${h.q*78}px`;b.style.top=`${h.r*90+(h.q%2?45:0)}px`;
      b.querySelector('.me-tile-art')?.remove();
      if(h.terrain_type!=='coastal')return;
      let tile=byId.get(h.terrain_variant),rotation=Number(h.rotation)||0;
      if(!tile){const c=choose(h,map);tile=c.tile;rotation=c.rotation;pending.push(persist(h,tile,rotation));}
      const art=document.createElement('span');art.className='me-tile-art';styleArt(art,tile,rotation);b.prepend(art);
    });
    installRotate();
    if(pending.length)await Promise.allSettled(pending);
  }
  function installRotate(){
    const side=document.getElementById('meSidebar'),selected=document.querySelector('#meMap .me-hex.selected');if(!side)return;
    side.querySelector('#meRotateTile')?.remove();if(!selected||!owner())return;
    const h=hexes.find(x=>x.id===selected.dataset.hexId);if(h?.terrain_type!=='coastal')return;
    const btn=document.createElement('button');btn.id='meRotateTile';btn.className='me-btn secondary me-rotate-tile';btn.type='button';btn.textContent='Rotate Tile 60°';
    btn.onclick=async()=>{btn.disabled=true;const next=((Number(h.rotation)||0)+60)%360;const {error}=await window.whrSupabase.from('mighty_empire_hexes').update({rotation:next,updated_at:new Date().toISOString()}).eq('id',h.id);if(error){alert(`Unable to rotate tile: ${error.message}`);btn.disabled=false;return;}h.rotation=next;await decorate();};side.appendChild(btn);
  }
  function captureCampaign(event){
    const button=event.target.closest?.('[data-open-campaign]');
    const card=button?.closest?.('.campaign-card');
    if(!button?.dataset?.openCampaign||!card?.textContent?.includes('Mighty Empires'))return;
    campaignId=button.dataset.openCampaign;hexes=[];setTimeout(loadHexes,150);
  }
  installStyles();
  document.addEventListener('click',captureCampaign,true);
  document.addEventListener('click',e=>{if(e.target.closest?.('#meReload'))setTimeout(loadHexes,150);if(e.target.closest?.('#meMap .me-hex'))setTimeout(installRotate,0);});
})();
