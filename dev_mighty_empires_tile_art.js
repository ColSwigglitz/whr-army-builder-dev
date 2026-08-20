// Mighty Empires development: local coastal artwork renderer.
// Coastline is derived from the rendered map. Each artwork tile is rendered as
// an SVG view into the local source sheet so the full scanned hex can rotate
// cleanly without the sprite crop sliding out of the visible hex.
(() => {
  const BASE='assets/mighty-empires/coastal/source/';
  const SHEETS={1:`${BASE}coastal_set_1.jpg`,2:`${BASE}coastal_set_2.jpg`};
  const CENTRES=[[84,77],[336,77],[210,146],[84,216],[336,216],[210,285],[84,355],[336,355],[210,424],[84,494],[336,494],[210,563],[84,633],[336,633]];
  const TILES=[];
  for(const set of [1,2]) CENTRES.forEach(([cx,cy],i)=>TILES.push({id:`coastal${set}_${String(i+1).padStart(2,'0')}`,set,cx,cy}));

  function installStyles(){
    if(document.getElementById('meLocalTileStyles'))return;
    const s=document.createElement('style');
    s.id='meLocalTileStyles';
    s.textContent=`
      .me-hex{width:104px!important;height:90px!important;overflow:hidden!important;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)!important;border:0!important;position:absolute!important}
      .me-tile-art{position:absolute;inset:0;width:104px;height:90px;display:block;z-index:0;pointer-events:none;transform-origin:52px 45px;overflow:visible}
      .me-hex.has-coastal-art{background:#9fcbd5!important}
      .me-hex .me-hex-label,.me-hex .me-feature{position:relative;z-index:3}
    `;
    document.head.appendChild(s);
  }

  const key=(q,r)=>`${q},${r}`;
  function coords(el){
    const m=(el.querySelector('.me-hex-label')?.textContent||'').match(/(\d+)\s*,\s*(\d+)/);
    return m?[Number(m[1]),Number(m[2])]:null;
  }
  function neighbours(q,r){
    const odd=q&1;
    const ds=odd?[[0,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]]:[[0,-1],[1,-1],[1,0],[0,1],[-1,0],[-1,-1]];
    return ds.map(([dq,dr])=>[q+dq,r+dr]);
  }
  function isSea(el){return !!el?.classList.contains('sea');}
  function isLand(el){return !!el&&!isSea(el);}
  function hash(q,r){let n=((q+17)*73856093)^((r+31)*19349663);n^=n>>>13;return Math.abs(n>>>0);}

  function makeTileArt(tile,rotation){
    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('me-tile-art');
    svg.dataset.tile=tile.id;
    svg.setAttribute('viewBox',`${tile.cx-82} ${tile.cy-71} 164 142`);
    svg.setAttribute('preserveAspectRatio','xMidYMid slice');
    svg.setAttribute('aria-hidden','true');
    svg.style.transform=`rotate(${rotation}deg)`;
    const image=document.createElementNS(NS,'image');
    image.setAttribute('href',SHEETS[tile.set]);
    image.setAttribute('x','0');
    image.setAttribute('y','0');
    image.setAttribute('width','504');
    image.setAttribute('height','713');
    image.setAttribute('preserveAspectRatio','none');
    svg.appendChild(image);
    return svg;
  }

  function decorate(){
    installStyles();
    const map=document.getElementById('meMap');
    if(!map)return false;
    const els=[...map.querySelectorAll('.me-hex')];
    if(!els.length)return false;
    const byCoord=new Map();
    els.forEach(el=>{const c=coords(el);if(c)byCoord.set(key(c[0],c[1]),el);});

    els.forEach(el=>{
      el.querySelector('.me-tile-art')?.remove();
      el.classList.remove('has-coastal-art');
      const c=coords(el);if(!c||!isLand(el))return;
      const [q,r]=c;
      const seaEdges=neighbours(q,r).map(([nq,nr])=>isSea(byCoord.get(key(nq,nr))));
      if(!seaEdges.some(Boolean))return;

      const h=hash(q,r);
      const tile=TILES[h%TILES.length];
      const firstSea=Math.max(0,seaEdges.findIndex(Boolean));
      const rotation=(firstSea*60)%360;
      el.prepend(makeTileArt(tile,rotation));
      el.classList.add('has-coastal-art');
    });
    return true;
  }

  function retryDecorate(){[0,100,300,700,1400].forEach(ms=>setTimeout(decorate,ms));}
  installStyles();
  retryDecorate();
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-open-campaign],#meReload,#meGenerate,#meStartingRealms'))retryDecorate();
    if(e.target.closest?.('#meMap .me-hex'))setTimeout(decorate,0);
  },true);
})();
