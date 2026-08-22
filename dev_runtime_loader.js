// Stable Dev runtime loader.
(() => {
  const previousArmyMonogram = armyMonogram;
  armyMonogram = function(name) {
    const cleaned = String(name || "").replace(/^the\s+/i, "").trim();
    const ampersandMatch = cleaned.match(/^([^\s&]+)\s*&\s*([^\s&]+)/);
    if (ampersandMatch) {
      return `${ampersandMatch[1][0]}&${ampersandMatch[2][0]}`.toUpperCase();
    }
    return previousArmyMonogram(name);
  };
  if (state.armyManifest) renderArmySelection();

  const previousAllowedMagicItems = getAllowedMagicItems;
  getAllowedMagicItems = function(unit, context) {
    let items = previousAllowedMagicItems(unit, context) || [];
    if (typeof window.whrMagicItemEligibleForBearer === "function") items = items.filter(item => window.whrMagicItemEligibleForBearer(item, unit, context));
    const selectedIds = context === "champion" ? (state.draft?.champion?.magicItems || []) : (state.draft?.magicItems || []);
    const selectedArmour = selectedIds.find(id => getMagicItem(id)?.category === "magic_armour");
    if (selectedArmour) items = items.filter(item => item.category !== "magic_armour" || item.id === selectedArmour);
    return [...new Map(items.map(item => [item.id, item])).values()];
  };
  const previousSelectArmy = selectArmy;
  selectArmy = async function(armyId) {
    await previousSelectArmy(armyId);
    if (!state.data) return;
    if (typeof window.whrApplyEffectiveRegimentMinimums === "function") window.whrApplyEffectiveRegimentMinimums();
    renderUnitBrowser(); renderArmy();
  };
  const add=(src,onload,onerror)=>{const s=document.createElement('script');s.src=src;s.async=false;if(onload)s.onload=onload;if(onerror)s.onerror=onerror;document.body.appendChild(s);return s;};
  add('chaos_daemon_regiment_items.js?v=1');
  add('dogs_of_war_regiments_of_renown.js?v=1');
  add('general_system.js?v=2',()=>add('general_overrides.js?v=1',()=>add('dev_roster_pad_sort.js?v=1')));
  const style=document.createElement('link');style.rel='stylesheet';style.href='dev_auth.css?v=1';document.head.appendChild(style);
  add('dev_auth.js?v=3',()=>{
    add('dev_auth_getuser_dedupe.js?v=2');
    add('dev_cloud_visibility_preserve.js?v=1',()=>{
      add('dev_cloud_saves.js?v=3',()=>{
        add('dev_landing_armies.js?v=1',()=>{
          const next=()=>{
            const files=['dev_retention.js?v=1','dev_shared_armies.js?v=3','dev_campaigns.js?v=2','dev_campaign_armies.js?v=1','dev_campaign_territories.js?v=1','dev_territory_permissions.js?v=1','dev_territory_random_server.js?v=1','dev_territory_specific_create.js?v=1','dev_campaign_delete.js?v=1','dev_campaign_dialog_guard.js?v=1','dev_mighty_empires_manual_builder_v3.js?v=1','dev_mighty_empires_tray_scroll.js?v=2','dev_mighty_empires_map_scroll.js?v=1','dev_modal_close.js?v=1'];
            const load=i=>{if(i>=files.length)return;add(files[i],()=>load(i+1),()=>{console.warn(`${files[i]} failed to load; continuing.`);load(i+1);});};load(0);
          };
          add('dev_privacy_account.js?v=3',next,()=>{console.warn('dev_privacy_account.js failed to load; continuing.');next();});
        });
      });
    });
  });
})();
