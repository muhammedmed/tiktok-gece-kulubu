export function avatarUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function userAvatar(user = {}) {
  for (const source of [user.avatarThumb, user.avatarMedium, user.avatarLarge,
    user.avatar_thumb, user.avatar_medium, user.avatar_large, user.profilePictureUrl, user.profilePicture]) {
    const candidates = typeof source === 'string' ? [source] : Array.isArray(source) ? source : source?.urlList || source?.url_list || [];
    if (!Array.isArray(candidates)) continue;
    for (const candidate of candidates) { const url = avatarUrl(candidate); if (url) return url; }
  }
  return '';
}


const types = new Map([
  ['WebcastChatMessage', 'chat'], ['WebcastLikeMessage', 'like'], ['WebcastGiftMessage', 'gift']
]);
const closeReasons = new Map([
  [4400, 'Kullanıcı adı veya bağlantı ayarları geçersiz.'], [4401, 'Euler API anahtarı geçersiz.'],
  [4403, 'Bu hesaba bağlanma izni yok.'], [4404, 'Bu hesap şu anda yayında değil.'],
  [4429, 'Euler bağlantı sınırına ulaşıldı.'], [4005, 'Yayın sona erdi.']
]);

// One decoder per live session. Keep deduplication across transient reconnects.
export async function loadGiftCatalog(key, request = fetch) {
  const signal=AbortSignal.timeout(4500);
  const listing=await request('https://api.eulerstream.com/webcast/gifts?region=TR&webcast_language=en',
    {headers:{'x-api-key':key},redirect:'error',signal});
  if(!listing.ok) throw Error('Katalog alınamadı');
  const {url}=await listing.json();
  if(new URL(url).protocol!=='https:') throw Error('Geçersiz katalog adresi');
  const response=await request(url,{signal});
  if(!response.ok) throw Error('Katalog alınamadı');
  const body=await response.json();
  const gifts=new Map();
  for(const g of body?.data?.gifts || []) {
    if(g.id && g.name) gifts.set(String(g.id),{name:String(g.name),coins:Number(g.diamond_count)});
  }
  return gifts;
}

export function eventDecoder(canCue = () => true, catalog = new Map()) {
  const seen = new Set();
  const pending = new Map();
  return ({type: method, data}) => {
    const type = types.get(method);
    if (!type || !data?.user) return;
    const user = data.user;
    const identity = user.idStr || user.userId || user.id || user.displayId || user.uniqueId;
    if (!identity) return;
    const id = String(identity);
    const event = {type, id, name: String(user.nickname || user.displayId || user.uniqueId || id).slice(0, 32)};
    const avatar = userAvatar(user);
    if (avatar) event.avatar = avatar;
    if (type === 'chat') {
      event.text = String(data.content || data.comment || '').slice(0, 256);
      event.username = String(user.displayId || user.uniqueId || event.name).slice(0, 64);
    }
    if (type === 'like') {
      // count is this user's batch; total/totalLikeCount is the whole room.
      const value = data.count ?? data.likeCount;
      const count = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)) ? Number(value) : NaN;
      if (Number.isSafeInteger(count) && count > 0) event.amount = count;
    }
    const giftType = data.gift?.type ?? data.giftDetails?.giftType ?? data.giftType;
    if (type === 'gift') {
      event.giftId = String(data.giftId || data.gift?.id || data.giftDetails?.giftId || '');
      const cached = catalog.get(event.giftId);
      event.gift = String(data.gift?.name || data.giftName || data.giftDetails?.giftName || data.extendedGiftInfo?.name || cached?.name || '').slice(0, 80);
      const price = Number(data.gift?.diamondCount ?? data.gift?.diamond_count ?? data.giftDetails?.diamondCount ??
        data.extendedGiftInfo?.diamond_count ?? data.diamondCount ?? cached?.coins);
      if (Number.isSafeInteger(price) && price > 0) event.coins = price;
      if(event.giftId && (event.gift || event.coins) && (cached || catalog.size < 20000)) {
        catalog.set(event.giftId,{name:event.gift,coins:event.coins});
      }
      const streakKey = [id,event.giftId,data.groupId || ''].join('/');
      const partial = Number(giftType) === 1 && ![true,1,'1'].includes(data.repeatEnd);
      if (partial) {
        if (data.groupId && Number(data.groupId) !== 0 && seen.has(['series',id,data.giftId,data.groupId].join('/'))) return;
        const last = pending.get(streakKey);
        if (last && Date.now()-last < 120000) return;
        if (!canCue(event)) return;
        pending.set(streakKey,Date.now());
        if (pending.size > 2048) pending.delete(pending.keys().next().value);
        return {...event,type:'giftCue'};
      }
      event.cued = pending.delete(streakKey);
      event.amount = data.repeatCount || 1;

    }
    const msgId = data.common?.msgId || data.msgId;
    const key = type === 'gift' && Number(giftType) === 1 && data.groupId && data.groupId !== '0'
      ? ['series', id, event.giftId, data.groupId].join('/')
      : msgId && String(msgId) !== '0' ? method + '/' + msgId : null;
    if (key) {
      if (seen.has(key)) return;
      seen.add(key);
      if (seen.size > 10000) seen.delete(seen.values().next().value);
      if (type === 'chat') event.messageId = String(msgId);
    }
    return event;
  };
}

export function openLive({handle, key, onStatus, onEvent, canCue, catalog, waitForLive = false, Socket = WebSocket}) {
  let socket, retryTimer, timeout, stopped = false, retries = 0;
  let lastStatus, lastDetail, offlineChecks = 0;
  const gifts=new Map(),decode = eventDecoder(canCue,gifts);
  let waiting=catalog?[]:null;
  function dispatch(msg){const event=decode(msg);if(event)onEvent(event);}
  function flush(){const queued=waiting;waiting=null;if(!stopped)queued?.forEach(dispatch);}
  if(catalog) catalog(key).then(result=>{for(const [id,gift] of result)gifts.set(id,gift);}).catch(()=>{}).finally(flush);
  function report(status, detail) {
    if (status === lastStatus && detail === lastDetail) return;
    lastStatus = status;
    lastDetail = detail;
    onStatus(status, detail);
  }
  function afterClose(code, terminal = false) {
    if (waitForLive && (code === 4404 || code === 4005)) {
      retries = 0;
      report('waiting', '@' + handle + ' yayını bekleniyor. Yayın açılınca otomatik bağlanılacak.');
      // Start promptly when the host is setting up; limit requests if the studio stays open overnight.
      retryTimer = setTimeout(connect, ++offlineChecks <= 3 ? 15000 : 90000);
      return;
    }
    if (waitForLive && code === 4429) {
      const delay = Math.min(900, 60 * 2 ** Math.min(retries++, 4));
      report('retry', 'Euler bağlantı sınırına ulaşıldı. Otomatik olarak tekrar denenecek.');
      retryTimer = setTimeout(connect, delay * 1000);
      return;
    }
    if (closeReasons.has(code) || (!waitForLive && (terminal || retries >= 5))) {
      stopped = true;
      report('error', closeReasons.get(code) || 'Bağlantı kurulamadı. Ağı kontrol edip tekrar bağlanın.');
      return;
    }
    const delay = Math.min(30, 2 ** Math.min(++retries, 5));
    report('retry', 'Bağlantı koptu. ' + delay + ' saniye sonra tekrar denenecek.');
    retryTimer = setTimeout(connect, delay * 1000);
  }
  function connect() {
    if (stopped) return;
    const quiet = waitForLive && ['waiting', 'retry'].includes(lastStatus);
    if (!quiet) report('connecting', '@' + handle + ' yayınına bağlanılıyor…');
    const url = new URL('wss://ws.eulerstream.com');
    url.search = new URLSearchParams({uniqueId: handle, apiKey: key, 'features.bundleEvents': 'true',
      'features.rawMessages': 'false', 'features.schemaVersion': 'v2'}).toString();
    const ws = socket = new Socket(url);
    ws.binaryType = 'arraybuffer';
    timeout = setTimeout(() => ws.close(), 25000);
    function connected() {
      clearTimeout(timeout);
      retries = 0;
      offlineChecks = 0;
      report('live', '@' + handle + ' yayını bağlı');
    }
    function finishRoom(code) {
      socket = null;
      clearTimeout(timeout);
      ws.close();
      afterClose(code, true);
    }
    ws.onmessage = ({data}) => {
      if (stopped || ws !== socket) return;
      let packet;
      try { packet = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); }
      catch { return; }
      for (const msg of packet?.messages ?? (Array.isArray(packet) ? packet : [packet])) {
        if (!msg || typeof msg !== 'object') continue;
        if (msg.type === 'roomInfo' || msg.type === 'tiktok.connect' || types.has(msg.type)) connected();
        if (msg.type === 'tiktok.disconnect' && closeReasons.has(msg.data?.reason)) {
          finishRoom(msg.data.reason);
          return;
        }
        if (msg.type === 'room.status') {
          const status = msg.data?.state;
          if (status === 'connected') connected();
          if ((!quiet || lastStatus === 'live') && (status === 'connecting' || status === 'reconnecting')) report('connecting', 'Yayın bağlantısı kuruluyor…');
          if (['offline', 'ended'].includes(status) || (status === 'error' && msg.data.terminal)) {
            const code = status === 'offline' ? 4404 : status === 'ended' ? 4005 : Number(msg.data.code);
            finishRoom(code);
            return;
          }
        }
        if(types.has(msg.type)){
          if(waiting?.length>=512)flush();
          if(waiting)waiting.push(msg);else dispatch(msg);
        }
      }
    };
    ws.onerror = () => {}; // The close event owns retries and user-facing errors.
    ws.onclose = ({code}) => {
      if (stopped || ws !== socket) return;
      socket = null;
      clearTimeout(timeout);
      afterClose(code);
    };
  }
  connect();
  return () => {
    stopped = true;
    clearTimeout(timeout);
    clearTimeout(retryTimer);
    socket?.close();
  };
}
