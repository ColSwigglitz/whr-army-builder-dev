// Dev performance guard: collapse bursts of identical Supabase auth.getUser()
// calls made by independently loaded account/campaign extensions.
(() => {
  const client = window.whrSupabase;
  if (!client?.auth?.getUser || client.auth.__whrGetUserDeduped) return;

  const originalGetUser = client.auth.getUser.bind(client.auth);
  let inFlight = null;
  let lastResult = null;
  let lastResultAt = 0;
  const CACHE_MS = 1500;

  client.auth.getUser = async function(...args) {
    const now = Date.now();
    if (!args.length && lastResult && now - lastResultAt < CACHE_MS) return lastResult;
    if (!args.length && inFlight) return inFlight;

    const request = originalGetUser(...args);
    if (args.length) return request;

    inFlight = Promise.resolve(request)
      .then(result => {
        lastResult = result;
        lastResultAt = Date.now();
        return result;
      })
      .finally(() => { inFlight = null; });

    return inFlight;
  };

  client.auth.__whrGetUserDeduped = true;

  client.auth.onAuthStateChange(() => {
    lastResult = null;
    lastResultAt = 0;
    inFlight = null;
  });
})();
