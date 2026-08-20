// Mighty Empires development: contiguous-map guard and separate Starting Realms setup.
(() => {
  let currentCampaignId = null;
  let busy = false;
  let lastNormalisedMapSignature = '';

  const key = (q, r) => `${q},${r}`;
  const neighbours = (q, r) => {
    const odd = q & 1;
    const ds = odd
      ? [[1,0],[1,1],[0,1],[-1,1],[-1,0],[0,-1]]
      : [[1,-1],[1,0],[0,1],[-1,0],[-1,-1],[0,-1]];
    return ds.map(([dq, dr]) => [q + dq, r + dr]);
  };

  function captureCampaign(event) {
    const button = event.target.closest?.('[data-open-campaign]');
    const card = button?.closest?.('.campaign-card');
    if (!button?.dataset?.openCampaign || !card?.textContent?.includes('Mighty Empires')) return;
    currentCampaignId = button.dataset.openCampaign;
  }

  function ownerIsViewing() {
    return document.getElementById('meCampaignMeta')?.textContent?.includes('Campaign owner');
  }

  function mapExists() {
    return /\b\d+ hexes\b/.test(document.getElementById('meCampaignMeta')?.textContent || '');
  }

  async function loadHexes() {
    if (!currentCampaignId || !window.whrSupabase) return [];
    const { data, error } = await window.whrSupabase
      .from('mighty_empire_hexes')
      .select('id,q,r,terrain_type,terrain_variant,settlement_type,owner_id,special_state')
      .eq('campaign_id', currentCampaignId);
    if (error) throw error;
    return data || [];
  }

  async function loadMembers() {
    const { data, error } = await window.whrSupabase
      .from('campaign_members')
      .select('user_id,role,joined_at')
      .eq('campaign_id', currentCampaignId)
      .order('joined_at');
    if (error) throw error;
    return data || [];
  }

  function landComponents(hexes) {
    const byKey = new Map(hexes.map(h => [key(h.q, h.r), h]));
    const land = new Set(hexes.filter(h => h.terrain_type !== 'sea').map(h => key(h.q, h.r)));
    const seen = new Set();
    const components = [];

    for (const start of land) {
      if (seen.has(start)) continue;
      const queue = [start];
      const component = [];
      seen.add(start);
      while (queue.length) {
        const k = queue.shift();
        const hex = byKey.get(k);
        if (!hex) continue;
        component.push(hex);
        for (const [nq, nr] of neighbours(hex.q, hex.r)) {
          const nk = key(nq, nr);
          if (land.has(nk) && !seen.has(nk)) {
            seen.add(nk);
            queue.push(nk);
          }
        }
      }
      components.push(component);
    }
    return components;
  }

  async function ensureSingleLandmass() {
    if (!ownerIsViewing() || !mapExists() || busy) return false;
    const hexes = await loadHexes();
    if (!hexes.length) return false;
    const signature = `${currentCampaignId}:${hexes.length}:${hexes.map(h => `${h.q},${h.r},${h.terrain_type}`).sort().join('|')}`;
    if (signature === lastNormalisedMapSignature) return false;
    lastNormalisedMapSignature = signature;

    const components = landComponents(hexes);
    if (components.length <= 1) return false;

    // Keep the largest connected land component. Everything else becomes sea,
    // guaranteeing there are no offshore islands to complicate campaigns.
    components.sort((a, b) => b.length - a.length);
    const remove = components.slice(1).flat();
    if (!remove.length) return false;

    busy = true;
    try {
      for (const hex of remove) {
        const { error } = await window.whrSupabase
          .from('mighty_empire_hexes')
          .update({
            terrain_type: 'sea',
            settlement_type: null,
            owner_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', hex.id);
        if (error) throw error;
      }
      document.getElementById('meReload')?.click();
      return true;
    } finally {
      busy = false;
    }
  }

  function hexDistance(a, b) {
    // Convert odd-q offset coordinates to cube coordinates for proper hex distance.
    const aq = a.q;
    const ar = a.r - (a.q - (a.q & 1)) / 2;
    const ax = aq, az = ar, ay = -ax - az;
    const bq = b.q;
    const br = b.r - (b.q - (b.q & 1)) / 2;
    const bx = bq, bz = br, by = -bx - bz;
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
  }

  function chooseCapitals(hexes, count) {
    const candidates = hexes.filter(h =>
      (h.terrain_type === 'lowland' || h.terrain_type === 'river_valley') &&
      h.settlement_type !== 'fortress' && h.settlement_type !== 'city'
    );
    if (!candidates.length || count < 1) return [];

    const minQ = Math.min(...hexes.map(h => h.q));
    const maxQ = Math.max(...hexes.map(h => h.q));
    const minR = Math.min(...hexes.map(h => h.r));
    const maxR = Math.max(...hexes.map(h => h.r));
    const centre = { q:(minQ + maxQ) / 2, r:(minR + maxR) / 2 };

    if (count === 1) {
      return [candidates.slice().sort((a,b) =>
        (Math.abs(a.q-centre.q)+Math.abs(a.r-centre.r)) -
        (Math.abs(b.q-centre.q)+Math.abs(b.r-centre.r))
      )[0]];
    }

    // Start on the interior edge rather than dead-centre, then use farthest-point
    // sampling so every additional player is as well separated as possible.
    const first = candidates.slice().sort((a,b) => {
      const da = Math.abs(a.q-centre.q) + Math.abs(a.r-centre.r);
      const db = Math.abs(b.q-centre.q) + Math.abs(b.r-centre.r);
      const target = Math.max(maxQ-minQ, maxR-minR) * .28;
      return Math.abs(da-target) - Math.abs(db-target) || a.q-b.q || a.r-b.r;
    })[0];

    const chosen = [first];
    while (chosen.length < count) {
      const remaining = candidates.filter(c => !chosen.some(x => x.id === c.id));
      if (!remaining.length) break;
      remaining.sort((a,b) => {
        const amin = Math.min(...chosen.map(c => hexDistance(a,c)));
        const bmin = Math.min(...chosen.map(c => hexDistance(b,c)));
        if (bmin !== amin) return bmin - amin;
        const ac = Math.abs(a.q-centre.q)+Math.abs(a.r-centre.r);
        const bc = Math.abs(b.q-centre.q)+Math.abs(b.r-centre.r);
        return ac - bc || a.q-b.q || a.r-b.r;
      });
      chosen.push(remaining[0]);
    }
    return chosen;
  }

  async function setupStartingRealms() {
    if (busy || !currentCampaignId || !ownerIsViewing()) return;
    const confirmed = window.confirm(
      'Set up starting realms for every current campaign member?\n\n' +
      'Existing Mighty Empires capital markers and hex ownership will be reset. Each player will receive a well-spaced capital and the adjacent land hexes.'
    );
    if (!confirmed) return;

    const button = document.getElementById('meStartingRealms');
    busy = true;
    if (button) { button.disabled = true; button.textContent = 'Setting up…'; }

    try {
      await ensureSingleLandmass();
      const [hexes, members] = await Promise.all([loadHexes(), loadMembers()]);
      if (!members.length) throw new Error('This campaign has no members.');

      const capitals = chooseCapitals(hexes, members.length);
      if (capitals.length < members.length) throw new Error('There are not enough suitable lowland or river-valley hexes for all campaign members.');

      // Starting realms are a clean setup step, distinct from world generation.
      const { error: clearError } = await window.whrSupabase
        .from('mighty_empire_hexes')
        .update({ owner_id:null, settlement_type:null, updated_at:new Date().toISOString() })
        .eq('campaign_id', currentCampaignId);
      if (clearError) throw clearError;

      const byKey = new Map(hexes.map(h => [key(h.q,h.r), h]));
      const claimed = new Set();

      for (let i=0; i<members.length; i++) {
        const member = members[i];
        const capital = capitals[i];
        const realmHexes = [capital];
        for (const [nq,nr] of neighbours(capital.q, capital.r)) {
          const neighbour = byKey.get(key(nq,nr));
          if (neighbour && neighbour.terrain_type !== 'sea') realmHexes.push(neighbour);
        }

        // Spacing should prevent overlaps, but never steal a hex already given to
        // an earlier realm if a very small map forces two starting areas together.
        for (const hex of realmHexes) {
          if (claimed.has(hex.id)) continue;
          claimed.add(hex.id);
          const update = {
            owner_id: member.user_id,
            settlement_type: hex.id === capital.id ? 'capital' : null,
            updated_at: new Date().toISOString()
          };
          const { error } = await window.whrSupabase
            .from('mighty_empire_hexes')
            .update(update)
            .eq('id', hex.id);
          if (error) throw error;
        }
      }

      document.getElementById('meReload')?.click();
    } catch (error) {
      window.alert(`Unable to set up starting realms: ${error.message || error}`);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = 'Set Up Starting Realms'; }
    }
  }

  async function installControls() {
    const dialog = document.getElementById('mightyEmpiresCampaignDialog');
    const actions = dialog?.querySelector('.me-header-actions');
    if (!dialog || !actions || !ownerIsViewing() || !mapExists()) {
      document.getElementById('meStartingRealms')?.remove();
      return;
    }

    let button = document.getElementById('meStartingRealms');
    if (!button) {
      button = document.createElement('button');
      button.id = 'meStartingRealms';
      button.className = 'me-btn secondary';
      button.type = 'button';
      button.textContent = 'Set Up Starting Realms';
      button.addEventListener('click', setupStartingRealms);
      const deleteButton = document.getElementById('meDeleteMap');
      actions.insertBefore(button, deleteButton || actions.firstChild);
    }

    try { await ensureSingleLandmass(); }
    catch (error) { console.warn('Mighty Empires landmass normalisation failed', error); }
  }

  document.addEventListener('click', captureCampaign, true);
  document.addEventListener('click', event => {
    if (event.target.closest?.('#meReload')) setTimeout(installControls, 50);
  });

  const observer = new MutationObserver(() => {
    if (document.getElementById('mightyEmpiresCampaignDialog')?.open) installControls();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
})();
