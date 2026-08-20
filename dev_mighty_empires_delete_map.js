(() => {
  let currentCampaignId = null;
  let deleting = false;

  function isMightyEmpiresOpenButton(button) {
    const card = button?.closest?.('.campaign-card');
    return !!(button?.dataset?.openCampaign && card && card.textContent.includes('Mighty Empires'));
  }

  function campaignOwnerIsViewing() {
    return document.getElementById('meCampaignMeta')?.textContent?.includes('Campaign owner');
  }

  function mapExists() {
    const meta = document.getElementById('meCampaignMeta')?.textContent || '';
    return /\b\d+ hexes\b/.test(meta);
  }

  function installDeleteButton() {
    const dialog = document.getElementById('mightyEmpiresCampaignDialog');
    const actions = dialog?.querySelector('.me-header-actions');
    if (!dialog || !actions) return;

    let button = document.getElementById('meDeleteMap');
    if (!campaignOwnerIsViewing() || !mapExists()) {
      button?.remove();
      return;
    }

    if (button) return;
    button = document.createElement('button');
    button.id = 'meDeleteMap';
    button.className = 'me-btn secondary';
    button.type = 'button';
    button.textContent = 'Delete Map';
    button.addEventListener('click', deleteMap);
    actions.insertBefore(button, actions.firstChild);
  }

  async function deleteMap() {
    if (deleting || !currentCampaignId || !window.whrSupabase) return;

    const confirmed = window.confirm(
      'Delete this Mighty Empires map?\n\nAll hexes and exploration data for this map will be removed. This cannot be undone.'
    );
    if (!confirmed) return;

    const button = document.getElementById('meDeleteMap');
    deleting = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Deleting…';
    }

    try {
      const { error } = await window.whrSupabase
        .from('mighty_empire_hexes')
        .delete()
        .eq('campaign_id', currentCampaignId);
      if (error) throw error;

      const dialog = document.getElementById('mightyEmpiresCampaignDialog');
      if (dialog?.open) dialog.close();
      await window.whrOpenMightyEmpires?.(currentCampaignId);
    } catch (error) {
      window.alert(`Unable to delete map: ${error.message || error}`);
      if (button) {
        button.disabled = false;
        button.textContent = 'Delete Map';
      }
    } finally {
      deleting = false;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-open-campaign]');
    if (isMightyEmpiresOpenButton(button)) currentCampaignId = button.dataset.openCampaign;
  }, true);

  const observer = new MutationObserver(() => installDeleteButton());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  document.addEventListener('click', event => {
    if (event.target.closest?.('#meReload')) setTimeout(installDeleteButton, 0);
  });
})();
