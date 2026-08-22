// Targeted Tomb Kings fix: Tomb Guard Tomb Champion is an additional Tomb Guard model + 30 pts.
(() => {
  const previousSelectArmy = selectArmy;

  function applyTombGuardChampionFix() {
    if (state.data?.faction?.id !== "tomb_kings") return;
    const tombGuards = state.data.faction.regiments?.find(unit => unit.id === "tomb_guards");
    if (!tombGuards?.champion) return;

    tombGuards.champion.cost = {
      ...(tombGuards.champion.cost || {}),
      base: 30,
      add: { type: "unit_model_cost" }
    };
  }

  selectArmy = async function(armyId) {
    await previousSelectArmy(armyId);
    applyTombGuardChampionFix();
    if (state.data?.faction?.id === "tomb_kings") {
      renderUnitBrowser();
      renderArmy();
    }
  };

  window.whrApplyTombGuardChampionFix = applyTombGuardChampionFix;
})();