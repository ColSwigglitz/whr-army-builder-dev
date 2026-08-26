// Ogre Mercenaries: Lead-belchers are a normal Ogre regiment and must allow
// six models. The compact payload currently carries a stale upper size bound
// which causes the shared regiment editor to reject 6 and restore the previous
// value. Patch the loaded unit before the browser/editor renders it.
(() => {
  const isOgre = () => state.data?.faction?.id === "ogre_mercenaries" && state.selectedArmyId === "ogre_mercenaries";
  const isLeadBelcher = unit => /lead[ -]?belcher/i.test(String(unit?.name || "")) || /lead[ _-]?belcher/i.test(String(unit?.id || ""));

  function patchLeadBelchers() {
    if (!isOgre()) return;
    for (const unit of state.data?.faction?.regiments || []) {
      if (!isLeadBelcher(unit)) continue;
      unit.size = { ...(unit.size || {}), maximum: Math.max(6, Number(unit.size?.maximum || 0)) || 6 };
    }
  }

  const oldSelectArmy = selectArmy;
  selectArmy = async function(armyId) {
    await oldSelectArmy(armyId);
    if (!isOgre()) return;
    patchLeadBelchers();
    renderUnitBrowser();
    renderArmy();
  };

  const oldLoadRoster = loadRoster;
  loadRoster = async function(id) {
    const result = await oldLoadRoster(id);
    if (isOgre()) patchLeadBelchers();
    return result;
  };
})();
