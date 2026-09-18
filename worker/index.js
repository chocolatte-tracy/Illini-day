const ASSETS = /*__ASSET_MAP__*/;
const EVENT_FEED = "https://one.illinois.edu/ical/urbanachampaign/ical_urbanachampaign.ics";
const CAMPUS_CALENDAR = "https://one.illinois.edu/events";
const ILLINOIS_CALENDAR = "https://calendars.illinois.edu/list/7";
const KRANNERT_CALENDAR = "https://krannertcenter.com/events";
const UNION_CALENDAR = "https://union.illinois.edu/see-and-do/events";
const SOURCES = [
  { name: "Illinois General Events", url: ILLINOIS_CALENDAR, kind: "html" },
  { name: "OneIllinois student events", url: EVENT_FEED, page: CAMPUS_CALENDAR, kind: "ics" },
  { name: "Krannert Center", url: KRANNERT_CALENDAR, kind: "html" },
  { name: "Illini Union", url: UNION_CALENDAR, kind: "html" },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": status === 200 ? "public, max-age=180" : "no-store" } });
}

function decodeText(value = "") {
  return value.replace(/\\[nN]/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function stripHtml(value = "") { return decodeText(value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")); }
function absoluteUrl(value = "", base) { try { return new URL(value, base).href; } catch { return base; } }
function localDateTime(value) {
  if (!value) return null;
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return match ? { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` } : null;
}
function safeEvent(raw, source, base, index) {
  const start = localDateTime(raw.startDate), end = localDateTime(raw.endDate);
  if (!start || !raw.name) return null;
  const location = typeof raw.location === "string" ? raw.location : raw.location?.name || raw.location?.address?.streetAddress || "Location on official page";
  const title = stripHtml(raw.name), note = stripHtml(raw.description || "Open the official event page for details.").slice(0, 280);
  if (/(21\+|\b(?:bar crawl|casino|sportsbook|cannabis|marijuana|beer tasting|wine tasting)\b)/i.test(`${title} ${note}`)) return null;
  return { id: `live-${source.name.toLowerCase().replace(/\W+/g,"-")}-${index}`, kind: "event", type: "Campus", title, date: start.date, start: start.time, end: end?.time || null, allDay: false, place: stripHtml(location), note, url: absoluteUrl(raw.url || raw['@id'] || base, base), source: source.name, sources: [source.name] };
}
function parseJsonLd(html, source, base) {
  const rows = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const parsed = JSON.parse(match[1]); const queue = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed]; for (const item of queue) { const type = Array.isArray(item?.['@type']) ? item['@type'] : [item?.['@type']]; if (type.some(x => /event/i.test(x || ""))) { const event = safeEvent(item, source, base, rows.length); if (event) rows.push(event); } } } catch {}
  }
  return rows;
}
function parseIllinoisCalendar(html, source) {
  const jsonLd = parseJsonLd(html, source, source.url); if (jsonLd.length) return jsonLd;
  const rows = []; let currentDate = null;
  const tokens = [...html.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  for (let i=0;i<tokens.length;i++) {
    const heading=stripHtml(tokens[i][2]), dateMatch=heading.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (tokens[i][1]==="2" && dateMatch) { const d=new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]} 12:00:00`); currentDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; continue; }
    if (tokens[i][1]!=="3" || !currentDate) continue;
    const anchor=tokens[i][2].match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i); if(!anchor)continue;
    const block=html.slice(tokens[i].index+tokens[i][0].length,tokens[i+1]?.index||html.length), plain=stripHtml(block);
    const tm=plain.match(/(?:Time\s*:?)?\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i); if(!tm)continue;
    let hour=Number(tm[1]),minute=Number(tm[2]||0);if(/p/i.test(tm[3])&&hour<12)hour+=12;if(/a/i.test(tm[3])&&hour===12)hour=0;
    const loc=plain.match(/Location\s*:?\s*(.+?)(?:\s{2,}|Sponsor|Cost|Contact|$)/i)?.[1]||"Location on official page";
    rows.push({id:`illinois-${rows.length}`,kind:"event",type:"Campus",title:stripHtml(anchor[2]),date:currentDate,start:`${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`,end:null,allDay:false,place:loc.slice(0,120),note:"Listed on the official Illinois events calendar.",url:absoluteUrl(anchor[1],source.url),source:source.name,sources:[source.name]});
  }
  return rows;
}

function parseIcsDate(raw = "", params = "") {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{8}$/.test(value)) return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, time: "09:00", allDay: true };
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return null;
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}`, allDay: false, utc: value.endsWith("Z"), timezone: params.match(/TZID=([^;:]+)/)?.[1] || null };
}

function parseIcs(text, sourceName = "OneIllinois student events") {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1).map(part => part.split("END:VEVENT")[0]);
  return blocks.map((block, index) => {
    const fields = {};
    for (const line of block.split(/\r?\n/)) {
      const cut = line.indexOf(":");
      if (cut < 0) continue;
      const left = line.slice(0, cut);
      const key = left.split(";")[0].toUpperCase();
      if (!(key in fields)) fields[key] = { value: line.slice(cut + 1), params: left.slice(key.length) };
    }
    const start = parseIcsDate(fields.DTSTART?.value, fields.DTSTART?.params);
    const end = parseIcsDate(fields.DTEND?.value, fields.DTEND?.params);
    if (!start) return null;
    const title = decodeText(fields.SUMMARY?.value) || "Campus event";
    const description = decodeText(fields.DESCRIPTION?.value).slice(0, 280);
    const location = decodeText(fields.LOCATION?.value) || "Location listed on event page";
    if (/(21\+|\b(?:bar crawl|casino|sportsbook|cannabis|marijuana|beer tasting|wine tasting)\b)/i.test(`${title} ${description}`)) return null;
    return { id: `live-${decodeText(fields.UID?.value) || index}`, kind: "event", type: "Campus", title, date: start.date, start: start.time, end: end?.time || (start.allDay ? "10:00" : null), allDay: start.allDay, place: location, note: description || "Open the official event page for the latest details.", url: decodeText(fields.URL?.value) || CAMPUS_CALENDAR, source: sourceName, sources: [sourceName] };
  }).filter(Boolean);
}

function canvasFeedDate(raw = "") {
  const value = String(raw).trim();
  if (/^\d{8}$/.test(value)) return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, time: "09:00", allDay: true };
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(?:\d{2})?(Z)?$/);
  if (!match) return null;
  if (match[6]) {
    const instant = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])));
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
    const read = type => parts.find(part => part.type === type)?.value;
    return { date: `${read("year")}-${read("month")}-${read("day")}`, time: `${read("hour")}:${read("minute")}`, allDay: false };
  }
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}`, allDay: false };
}

function parseCanvasCalendarFeed(text, feedOrigin = "https://canvas.illinois.edu") {
  const unfolded = String(text || "").replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1).map(part => part.split("END:VEVENT")[0]);
  return blocks.map((block, index) => {
    const fields = {};
    for (const line of block.split(/\r?\n/)) {
      const cut = line.indexOf(":");
      if (cut < 0) continue;
      const left = line.slice(0, cut), key = left.split(";")[0].toUpperCase();
      if (!(key in fields)) fields[key] = { value: line.slice(cut + 1), params: left.slice(key.length) };
    }
    const start = canvasFeedDate(fields.DTSTART?.value), end = canvasFeedDate(fields.DTEND?.value);
    if (!start) return null;
    const title = decodeText(fields.SUMMARY?.value) || "Canvas calendar item";
    const description = decodeText(fields.DESCRIPTION?.value).slice(0, 800);
    if (/(21\+|\b(?:bar crawl|casino|sportsbook|cannabis|marijuana|beer tasting|wine tasting)\b)/i.test(`${title} ${description}`)) return null;
    const uid = decodeText(fields.UID?.value) || `canvas-${index}`;
    const location = decodeText(fields.LOCATION?.value) || "Canvas / course location";
    const categories = decodeText(fields.CATEGORIES?.value || fields["X-CANVAS-CATEGORY"]?.value || "");
    const haystack = `${title} ${categories} ${description}`;
    const type = /exam|midterm|final|quiz|assignment|project|due|deadline/i.test(haystack) ? "Study" : /class|lecture|discussion|lab/i.test(haystack) ? "Class" : "Campus";
    const course = decodeText(fields["X-CANVAS-COURSE"]?.value || fields["X-CANVAS-CONTEXT"]?.value || "Canvas course");
    const url = decodeText(fields.URL?.value || fields["X-CANVAS-URL"]?.value || "");
    return { id: `canvas-calendar-${uid}`, sourceId: uid, source: "canvas-calendar", kind: "event", type, title, date: start.date, start: start.time, end: start.allDay ? "10:00" : (end?.time || ""), allDay: start.allDay, place: location, note: description || `Imported from your Canvas calendar${categories ? ` · ${categories}` : ""}.`, url: /^https?:\/\//i.test(url) ? url : `${feedOrigin}/calendar`, canvasArea: "Calendar", course };
  }).filter(item => item && item.start && item.end);
}

function canvasItemIsFuture(item, nowValue = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(nowValue);
  const read = type => parts.find(part => part.type === type)?.value;
  const today = `${read("year")}-${read("month")}-${read("day")}`, nowMinutes = Number(read("hour")) * 60 + Number(read("minute"));
  if (item.date > today) return true;
  if (item.date < today) return false;
  if (item.allDay) return true;
  const [hour, minute] = String(item.start || "00:00").split(":").map(Number);
  return hour * 60 + minute >= nowMinutes;
}

function chicagoDate() { const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),read=type=>parts.find(x=>x.type===type)?.value;return `${read("year")}-${read("month")}-${read("day")}`; }
function queryTargetsToday(query) { return /\b(today|today's|tonight)\b|今天|今日|今晚/i.test(query); }
function dateWindow(query, requestedDate) {
  const shiftDate=(date,days)=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)};
  const actualToday=chicagoDate();
  let base = queryTargetsToday(query)||/\btomorrow\b|明天/i.test(query) ? actualToday : /^\d{4}-\d{2}-\d{2}$/.test(requestedDate || "") ? requestedDate : actualToday;
  const lower = query.toLowerCase();
  if (lower.includes("tomorrow")||query.includes("明天")) base=shiftDate(base,1);
  let start=base,end;
  if (queryTargetsToday(query) || lower.includes("tomorrow") || query.includes("明天")) end=shiftDate(start,1);
  else if (lower.includes("weekend")) { const weekday=new Date(`${start}T12:00:00Z`).getUTCDay();start=shiftDate(start,(6-weekday+7)%7);end=shiftDate(start,2); }
  else end=shiftDate(start,14);
  return { start, end };
}

function rankEvents(events, query, requestedDate) {
  const { start, end } = dateWindow(query, requestedDate);
  const stop = new Set(["uiuc", "event", "events", "campus", "today", "tonight", "tomorrow", "this", "week", "weekend", "after", "before", "find", "show", "what", "happening", "near", "free"]);
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !stop.has(word));
  const after = query.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let afterMinutes = null;
  if (after) { let hour = Number(after[1]); if (after[3]?.toLowerCase() === "pm" && hour < 12) hour += 12; afterMinutes = hour * 60 + Number(after[2] || 0); }
  return events.filter(event => event.date >= start && event.date < end).filter(event => afterMinutes === null || Number(event.start.slice(0, 2)) * 60 + Number(event.start.slice(3, 5)) >= afterMinutes).map(event => {
    const haystack = `${event.title} ${event.note} ${event.place}`.toLowerCase();
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 4 : 0), 0) + (event.date === start ? 2 : 0);
    return { event, score };
  }).filter(row => !words.length || row.score > 0).sort((a, b) => b.score - a.score || `${a.event.date}${a.event.start}`.localeCompare(`${b.event.date}${b.event.start}`)).slice(0, 8).map(row => row.event);
}

async function fetchEventSource(source) {
  const response = await fetch(source.url, { headers: { "user-agent": "Illini Day campus planner/2.0" }, cf: { cacheTtl: 180 } });
  if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
  const text = await response.text();
  if (source.kind === "ics") return parseIcs(text, source.name);
  return source.url === ILLINOIS_CALENDAR ? parseIllinoisCalendar(text, source) : parseJsonLd(text, source, source.url);
}
function mergeEvents(all) {
  const merged=[];
  for(const item of all){const key=`${item.title.toLowerCase().replace(/\W+/g," ").trim()}|${item.date}`,same=merged.find(x=>x._key===key);if(!same){merged.push({...item,_key:key});continue}same.sources=[...new Set([...(same.sources||[same.source]),...(item.sources||[item.source])])];if(same.start===item.start)same.crossSource=true;if(item.url!==CAMPUS_CALENDAR)same.url=item.url;}
  return merged.map(({_key,...event})=>event);
}
async function verifyEvent(event) {
  if(event.crossSource)return {...event,verified:true,verification:`Time matched across ${event.sources.length} independent official listings.`};
  if(!/^https:\/\/(?:[^/]+\.)?(?:illinois\.edu|one\.illinois\.edu|krannertcenter\.com)\//i.test(event.url||""))return {...event,verified:false,verification:"Open the official page and confirm the time before scheduling."};
  try{const response=await fetch(event.url,{headers:{"user-agent":"Illini Day campus planner/2.0"},cf:{cacheTtl:180}});if(!response.ok)throw new Error();const html=await response.text(),details=parseJsonLd(html,{name:"Official detail page",url:event.url},event.url)[0];if(!details)return {...event,verified:false,verification:"The official detail page did not expose a machine-readable time. Review it before adding."};const corrected=details.date!==event.date||details.start!==event.start;return {...event,date:details.date,start:details.start,end:details.end||event.end,place:details.place||event.place,verified:true,timeCorrected:corrected,verification:corrected?"Time corrected from the official event detail page and verified again.":"Time matches the official event detail page."};}catch{return {...event,verified:false,verification:"The official detail page could not be rechecked right now. Review it before adding."}}
}
async function searchEvents(query, date) {
  const settled=await Promise.allSettled(SOURCES.map(fetchEventSource)),successful=settled.flatMap(x=>x.status==="fulfilled"?x.value:[]);
  if(!successful.length)throw new Error("All campus event sources are unavailable");
  const ranked=rankEvents(mergeEvents(successful),query,date),results=await Promise.all(ranked.map(verifyEvent));
  return {mode:"events",results,source:"Multiple UIUC official sources",sourceUrl:ILLINOIS_CALENDAR,sources:SOURCES.map(s=>({name:s.name,url:s.page||s.url})),fetchedAt:new Date().toISOString()};
}

function distanceKm(a,b){const r=6371,dLat=(b[0]-a[0])*Math.PI/180,dLon=(b[1]-a[1])*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.sqrt(x))}
function cuisineTerms(query){const q=query.toLowerCase(),choices=[['thai',/thai|泰国菜/],['chinese',/chinese|中餐|中国菜/],['sichuan',/sichuan|szechuan|川菜/],['korean',/korean|韩餐|韩国菜/],['indian',/indian|印度菜/],['mexican',/mexican|墨西哥菜/],['japanese',/japanese|日料|日本菜/],['sushi',/sushi|寿司/],['ramen',/ramen|拉面/],['pizza',/pizza|披萨/],['burger',/burger|汉堡/],['vegetarian',/vegetarian|素食/],['vegan',/vegan|纯素/],['halal',/halal|清真/],['mediterranean',/mediterranean|地中海/],['middle eastern',/middle eastern|中东菜/],['vietnamese',/vietnamese|越南菜/],['italian',/italian|意大利菜/]];return choices.filter(([,pattern])=>pattern.test(q)).map(([name])=>name)}
const CUISINE_ALIASES={chinese:['chinese','sichuan','szechuan','cantonese','taiwanese','dim_sum','hot_pot','asian'],sichuan:['sichuan','szechuan'],japanese:['japanese','sushi','ramen'],vegetarian:['vegetarian','vegan'],middle_eastern:['middle_eastern','mediterranean','lebanese','turkish']};
function restaurantMatches(place,wanted){if(!wanted.length)return true;const text=`${place.title||''} ${place.cuisine||''} ${place.type||''} ${place.place||''}`.toLowerCase().replace(/[;,]/g,' ');return wanted.some(term=>(CUISINE_ALIASES[term.replace(/ /g,'_')]||[term]).some(alias=>text.includes(alias.replace(/_/g,' '))||text.includes(alias)))}
function restaurantResult(raw,index,center,originName,source){const title=raw.title||raw.name||raw.display_name?.split(',')[0];if(!title)return null;const point=[Number(raw.lat),Number(raw.lon)];if(!point.every(Number.isFinite))return null;const type=raw.type||raw.amenity||'restaurant',cuisine=raw.cuisine||(!/^(restaurant|fast_food|cafe)$/i.test(type)?type:''),place=raw.place||raw.display_name||[raw.address,raw.city,'Illinois'].filter(Boolean).join(', '),distance=distanceKm(center,point),text=`${title} ${type} ${cuisine} ${place}`.toLowerCase();if(/\b(pub|bar|nightclub|casino|adult|biergarten)\b/.test(text))return null;return {id:`place-${raw.id||index}`,kind:'food',type:'Food',title,place,note:`${cuisine?cuisine.replace(/[;_]/g,' '):String(type).replace(/_/g,' ')} · ${distance.toFixed(1)} km from ${originName}. Verify current hours in Google Maps.`,url:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title}, ${place}`)}`,source,sources:[source,'Google Maps verification'],lat:String(point[0]),lon:String(point[1]),distanceKm:Number(distance.toFixed(2)),origin:originName,cuisine}}
async function fetchOverpassRestaurants(center){const query=`[out:json][timeout:15];nwr(around:8000,${center[0]},${center[1]})["amenity"~"^(restaurant|fast_food|cafe)$"];out center tags 120;`,response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'Illini Day campus planner/2.1'},body:`data=${encodeURIComponent(query)}`});if(!response.ok)throw new Error(`Restaurant directory returned ${response.status}`);const data=await response.json();return (data.elements||[]).map(element=>{const tags=element.tags||{},lat=element.lat??element.center?.lat,lon=element.lon??element.center?.lon,address=[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' ');return {id:`osm-${element.type}-${element.id}`,title:tags.name||tags['name:en'],lat,lon,type:tags.amenity,cuisine:tags.cuisine||'',address,city:tags['addr:city']||'Champaign-Urbana',place:[address,tags['addr:city']||'Champaign-Urbana','Illinois'].filter(Boolean).join(', ')}}).filter(x=>x.title&&x.lat&&x.lon)}
async function searchRestaurants(query,origin) {
  const meaningful = query.replace(/\b(find|show|me|food|restaurant|restaurants|lunch|dinner|eat|near|my|next|class|uiuc|campus)\b/gi, " ").replace(/\s+/g, " ").trim();
  const wanted=cuisineTerms(query),term = wanted.length?`${wanted.join(' ')} restaurant`:meaningful?`${meaningful} restaurant`:"restaurant",originName=origin||'Illini Tower',center=await geocode(originName);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2"); url.searchParams.set("q", `${term}, Champaign-Urbana, Illinois`); url.searchParams.set("limit", "50"); url.searchParams.set("addressdetails", "1");url.searchParams.set("extratags","1");url.searchParams.set("countrycodes","us");url.searchParams.set("viewbox",`${center[1]-0.07},${center[0]+0.05},${center[1]+0.07},${center[0]-0.05}`);url.searchParams.set("bounded","1");
  const settled=await Promise.allSettled([fetch(url,{headers:{"user-agent":"Illini Day campus planner/2.1"},cf:{cacheTtl:600}}).then(async response=>{if(!response.ok)throw new Error(`Map search returned ${response.status}`);return (await response.json()).map(place=>({id:`nominatim-${place.osm_type}-${place.osm_id}`,title:place.name||place.display_name?.split(',')[0],lat:place.lat,lon:place.lon,type:place.type,cuisine:place.extratags?.cuisine||'',place:place.display_name}))}),fetchOverpassRestaurants(center)]),raw=settled.flatMap(item=>item.status==='fulfilled'?item.value:[]);if(!raw.length)throw new Error('Restaurant sources are temporarily unavailable');
  const seen=new Set(),results=raw.map((place,index)=>restaurantResult(place,index,center,originName,place.id?.startsWith('osm-')?'OpenStreetMap restaurant directory':'OpenStreetMap live search')).filter(Boolean).filter(place=>restaurantMatches(place,wanted)).filter(place=>{const key=place.title.toLowerCase().replace(/\W+/g,' ').trim();if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12);
  const googleSearch=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${meaningful||'restaurant'} near ${originName}, UIUC`)}`;
  return {mode:'food',results,origin:originName,filters:{cuisine:wanted,excluded:['pub','bar','nightclub','casino','adult-only venue'],sortedBy:'distance'},source:'OpenStreetMap live place data',sourceUrl:'https://www.openstreetmap.org/',sources:[{name:'OpenStreetMap name search',url:'https://nominatim.openstreetmap.org/'},{name:'OpenStreetMap restaurant directory',url:'https://overpass-api.de/'},{name:'Verify or explore more in Google Maps',url:googleSearch}],fetchedAt:new Date().toISOString()};
}

async function handleSearch(url) {
  const query = (url.searchParams.get("query") || "").slice(0, 240).trim();
  const date = url.searchParams.get("date") || "";
  const origin = (url.searchParams.get("origin") || "Illini Tower").slice(0, 160);
  if (!query) return json({ error: "Please enter a search." }, 400);
  const isFood = /\b(food|restaurant|lunch|dinner|eat|cafe|coffee|pizza|sushi|ramen|burger|chinese|korean|indian|thai|mexican)\b|餐厅|饭店|附近.*(?:吃|餐)|中餐|川菜|泰国菜|韩餐|日料|拉面|寿司|印度菜|墨西哥菜/i.test(query);
  try { return json(isFood ? await searchRestaurants(query,origin) : await searchEvents(query, date)); }
  catch (error) { return json({ error: "Live sources are temporarily unavailable.", detail: String(error.message || error) }, 502); }
}

const CAMPUS_POINTS={"illini tower":[40.10755,-88.23084],"siebel center for computer science":[40.11379,-88.22491],"siebel center":[40.11379,-88.22491],"lincoln hall":[40.10676,-88.22821],"campus instructional facility":[40.11055,-88.22684],"cif":[40.11055,-88.22684],"main library":[40.10454,-88.22834],"illini union":[40.10925,-88.22723],"arc":[40.10177,-88.23605],"krannert center":[40.10836,-88.22231],"gregory hall":[40.1059,-88.22712],"grainger engineering library":[40.11263,-88.22603],"engineering library":[40.11263,-88.22603]};
function routeLink(from,to){return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from+", UIUC")}&destination=${encodeURIComponent(to+", UIUC")}&travelmode=walking`}
async function geocode(place){const n=place.toLowerCase().trim(),known=CAMPUS_POINTS[n]||Object.entries(CAMPUS_POINTS).find(([k])=>n.includes(k)||k.includes(n))?.[1];if(known)return known;const u=new URL("https://nominatim.openstreetmap.org/search");u.searchParams.set("format","jsonv2");u.searchParams.set("q",`${place}, University of Illinois Urbana Champaign`);u.searchParams.set("limit","1");const r=await fetch(u,{headers:{"user-agent":"Illini Day campus planner/2.0"},cf:{cacheTtl:86400}});if(!r.ok)throw new Error("Place lookup failed");const rows=await r.json();if(!rows[0])throw new Error("Place not found");return [Number(rows[0].lat),Number(rows[0].lon)]}
async function handleWalk(url){const from=(url.searchParams.get("from")||"").slice(0,160),to=(url.searchParams.get("to")||"").slice(0,160);if(!from||!to)return json({error:"Both places are required"},400);if(from.toLowerCase()===to.toLowerCase())return json({minutes:0,distanceKm:0,method:"Same place",googleUrl:routeLink(from,to)});try{const [a,b]=await Promise.all([geocode(from),geocode(to)]),payload={locations:[{lat:a[0],lon:a[1]},{lat:b[0],lon:b[1]}],costing:"pedestrian",units:"kilometers"},r=await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(payload))}`,{headers:{"user-agent":"Illini Day campus planner/2.0"},cf:{cacheTtl:3600}});if(!r.ok)throw new Error("Route service failed");const data=await r.json(),summary=data.trip?.summary;if(!summary)throw new Error("No pedestrian route");return json({minutes:Math.max(1,Math.ceil(summary.time/60)),distanceKm:Number(summary.length.toFixed(2)),method:"Pedestrian route estimate",googleUrl:routeLink(from,to)});}catch{try{const [a,b]=await Promise.all([geocode(from),geocode(to)]),lat=(a[0]+b[0])/2*Math.PI/180,dy=(a[0]-b[0])*111.32,dx=(a[1]-b[1])*111.32*Math.cos(lat),km=Math.sqrt(dx*dx+dy*dy)*1.22;return json({minutes:Math.max(3,Math.ceil(km/0.075)+2),distanceKm:Number(km.toFixed(2)),method:"Campus distance estimate",googleUrl:routeLink(from,to)});}catch{return json({error:"Could not estimate this route",googleUrl:routeLink(from,to)},502)}}}

const GITHUB_PAGES_ORIGIN="https://chocolatte-tracy.github.io",SESSION_LIFETIME_MS=30*24*60*60*1000;
function privateJson(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store"}})}
function injectedAccount(request){const userId=request.headers.get("oai-authenticated-user-id"),email=request.headers.get("oai-authenticated-user-email");return userId&&email?{id:userId,email}:null}
function bearerToken(request){const match=(request.headers.get("authorization")||"").match(/^Bearer\s+([A-Za-z0-9_-]{32,})$/i);return match?.[1]||null}
async function tokenHash(token){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,"0")).join("")}
function newSessionToken(){const bytes=crypto.getRandomValues(new Uint8Array(32)),binary=String.fromCharCode(...bytes);return btoa(binary).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"")}
async function accountFrom(request,env){const injected=injectedAccount(request);if(injected)return injected;const token=bearerToken(request);if(!token||!env?.DB)return null;const hash=await tokenHash(token),row=await env.DB.prepare("SELECT user_id, email FROM auth_session WHERE token_hash = ? AND expires_at > ? LIMIT 1").bind(hash,Date.now()).first();return row?{id:row.user_id,email:row.email}:null}
async function requireAccount(request,env){const account=await accountFrom(request,env);return account?{account}:{response:privateJson({error:"Sign in is required."},401)}}
async function handleAuthExchange(request,env){const account=injectedAccount(request);if(!account)return privateJson({error:"Sign in is required."},401);if(!env?.DB)return privateJson({error:"Account storage is temporarily unavailable."},503);const token=newSessionToken(),hash=await tokenHash(token),expiresAt=Date.now()+SESSION_LIFETIME_MS;await env.DB.prepare("DELETE FROM auth_session WHERE expires_at <= ?").bind(Date.now()).run();await env.DB.prepare("INSERT OR REPLACE INTO auth_session (token_hash,user_id,email,expires_at,created_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)").bind(hash,account.id,account.email,expiresAt).run();return privateJson({token,user:account,expiresAt})}
async function handleAuthLogout(request,env){const token=bearerToken(request);if(token&&env?.DB){const hash=await tokenHash(token);await env.DB.prepare("DELETE FROM auth_session WHERE token_hash = ?").bind(hash).run()}return privateJson({signedOut:true})}
function parseStored(row){
  const parse=(value,fallback)=>{try{return JSON.parse(value)}catch{return fallback}};
  return {events:parse(row.events_json,[]),todos:parse(row.todos_json,[]),preferences:parse(row.preferences_json,{}),version:Number(row.version)||1,updatedAt:row.updated_at};
}
async function handleAccount(request,env){const auth=await requireAccount(request,env);if(auth.response)return auth.response;return privateJson({user:{id:auth.account.id,email:auth.account.email}})}
async function handleState(request,env){
  const auth=await requireAccount(request,env);if(auth.response)return auth.response;
  if(!env?.DB)return privateJson({error:"Schedule storage is temporarily unavailable."},503);
  if(request.method==="GET"){
    const row=await env.DB.prepare("SELECT events_json, todos_json, preferences_json, version, updated_at FROM user_state WHERE user_id = ? LIMIT 1").bind(auth.account.id).first();
    return privateJson(row?{exists:true,...parseStored(row)}:{exists:false,events:[],todos:[],preferences:{},version:0,updatedAt:null});
  }
  const length=Number(request.headers.get("content-length")||0);if(length>2_000_000)return privateJson({error:"Schedule data is too large."},413);
  let body;try{body=await request.json()}catch{return privateJson({error:"Invalid JSON body."},400)}
  if(!Array.isArray(body.events)||!Array.isArray(body.todos)||!body.preferences||typeof body.preferences!=="object"||Array.isArray(body.preferences))return privateJson({error:"Events, tasks, or preferences have an invalid format."},400);
  const eventsJson=JSON.stringify(body.events),todosJson=JSON.stringify(body.todos),preferencesJson=JSON.stringify(body.preferences);
  if(eventsJson.length+todosJson.length+preferencesJson.length>1_900_000)return privateJson({error:"Schedule data is too large."},413);
  await env.DB.prepare(`INSERT INTO user_state (user_id,email,events_json,todos_json,preferences_json,version,updated_at)
    VALUES (?,?,?,?,?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,events_json=excluded.events_json,todos_json=excluded.todos_json,preferences_json=excluded.preferences_json,version=user_state.version+1,updated_at=CURRENT_TIMESTAMP`).bind(auth.account.id,auth.account.email,eventsJson,todosJson,preferencesJson).run();
  const row=await env.DB.prepare("SELECT version, updated_at FROM user_state WHERE user_id = ? LIMIT 1").bind(auth.account.id).first();
  return privateJson({saved:true,version:Number(row?.version)||1,updatedAt:row?.updated_at||new Date().toISOString()});
}

function canvasDate(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,16)}
function canvasKind(text=""){return /exam|midterm|final|quiz|test/i.test(text)?"Exam prep":/project|presentation/i.test(text)?"Project":"Assignment"}
function canvasSummary(html=""){return stripHtml(String(html)).slice(0,600)}
function findCanvasDate(text=""){const m=text.match(/(?:due|deadline|exam|test|quiz|presentation|submit(?:ted)?\s+by)\s*(?:on|:)?\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm))?)/i);if(!m)return null;const year=new Date().getFullYear(),raw=/\d{4}/.test(m[1])?m[1]:`${m[1]}, ${year}`,d=new Date(raw);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,16)}
async function canvasGet(base,path,token){const response=await fetch(`${base}${path}`,{headers:{authorization:`Bearer ${token}`,accept:"application/json"}});if(!response.ok)throw new Error(response.status===401?"Canvas rejected this token.":`Canvas returned ${response.status}.`);return response.json()}
async function handleCanvasSync(request,env){
  const auth=await requireAccount(request,env);if(auth.response)return auth.response;
  let body;try{body=await request.json()}catch{return privateJson({error:"Invalid request."},400)}
  const token=String(body.token||"").trim(),rawBase=String(body.baseUrl||"https://canvas.illinois.edu").trim();if(!token)return privateJson({error:"Paste a Canvas access token."},400);
  let parsed;try{parsed=new URL(rawBase)}catch{return privateJson({error:"Enter a valid Canvas URL."},400)}
  if(parsed.protocol!=="https:"||!(parsed.hostname==="canvas.illinois.edu"||parsed.hostname.endsWith(".instructure.com")))return privateJson({error:"Use your official Canvas HTTPS address."},400);
  const base=parsed.origin,now=new Date(),start=new Date(now.getTime()-14*86400000).toISOString(),end=new Date(now.getTime()+180*86400000).toISOString();
  try{
    const courses=(await canvasGet(base,"/api/v1/courses?enrollment_state=active&per_page=50",token)).filter(c=>!c.access_restricted_by_date).slice(0,12),courseMap=new Map(courses.map(c=>[String(c.id),c.name||c.course_code||"Canvas course"]));
    const planner=await canvasGet(base,`/api/v1/planner/items?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}&per_page=100`,token),items=[];
    for(const row of planner){const object=row.plannable||{},due=canvasDate(object.due_at||row.plannable_date||row.end_at);if(!due)continue;const courseId=String(row.course_id||row.context?.id||""),course=courseMap.get(courseId)||row.context?.title||"Canvas",title=object.title||object.name||row.context?.title||"Canvas item",url=object.html_url||row.html_url||`${base}/courses/${courseId}`;items.push({sourceId:`planner:${row.plannable_type||"item"}:${row.plannable_id||row.id}`,title,course,deadline:due,kind:canvasKind(title),note:canvasSummary(object.description||row.details||"Canvas To Do item."),url,canvasArea:"To Do"})}
    const context=courses.map(c=>`context_codes[]=${encodeURIComponent(`course_${c.id}`)}`).join("&"),announcements=context?await canvasGet(base,`/api/v1/announcements?${context}&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}&per_page=100`,token):[];
    for(const a of announcements){const summary=canvasSummary(a.message),deadline=findCanvasDate(summary);if(!deadline||!/(assignment|project|exam|midterm|final|quiz|test|due|deadline|submit|presentation)/i.test(`${a.title} ${summary}`))continue;const courseId=String((a.context_code||"").replace("course_","")),course=courseMap.get(courseId)||"Canvas announcement";items.push({sourceId:`announcement:${a.id}`,title:a.title||"Course announcement",course,deadline,kind:canvasKind(`${a.title} ${summary}`),note:summary,url:a.html_url||`${base}/courses/${courseId}/announcements`,canvasArea:"Announcement"})}
    for(const course of courses){let modules=[];try{modules=await canvasGet(base,`/api/v1/courses/${course.id}/modules?include[]=items&per_page=100`,token)}catch{continue}for(const module of modules){for(const item of module.items||[]){const text=`${item.title||""} ${module.name||""}`,deadline=findCanvasDate(text);if(!deadline||!/(assignment|project|exam|midterm|final|quiz|test|due|deadline|presentation)/i.test(text))continue;items.push({sourceId:`module:${course.id}:${item.id}`,title:item.title||module.name||"Module item",course:courseMap.get(String(course.id))||"Canvas course",deadline,kind:canvasKind(text),note:`Module: ${module.name||"Course module"}. ${item.title||""}`.slice(0,600),url:item.html_url||`${base}/courses/${course.id}/modules`,canvasArea:"Module"})}}}
    const unique=[...new Map(items.map(item=>[item.sourceId,item])).values()].sort((a,b)=>a.deadline.localeCompare(b.deadline));return privateJson({items:unique,courses:courses.length,syncedAt:new Date().toISOString()});
  }catch(error){return privateJson({error:String(error?.message||"Canvas sync failed.")},502)}
}

async function handleCanvasFeedSync(request,env){
  const auth=await requireAccount(request,env);if(auth.response)return auth.response;
  let body;try{body=await request.json()}catch{return privateJson({error:"Invalid request."},400)}
  const raw=String(body.feedUrl||"").trim();if(!raw)return privateJson({error:"Paste your Canvas Calendar Feed URL."},400);if(raw.length>2400)return privateJson({error:"That feed URL is too long."},400);
  let parsed;try{parsed=new URL(raw)}catch{return privateJson({error:"Enter a valid Canvas HTTPS feed URL."},400)}
  const host=parsed.hostname.toLowerCase();if(parsed.protocol!=="https:"||!(host==="canvas.illinois.edu"||host.endsWith(".instructure.com")))return privateJson({error:"Use the HTTPS Calendar Feed URL from your official Canvas site."},400);
  if(parsed.username||parsed.password)return privateJson({error:"For safety, the feed URL cannot include a username or password."},400);
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    const response=await fetch(parsed.toString(),{signal:controller.signal,headers:{accept:"text/calendar,text/plain;q=0.9,*/*;q=0.1","user-agent":"Illini Day Canvas calendar importer/1.0"},cf:{cacheTtl:60}});clearTimeout(timer);
    if(!response.ok)throw new Error(response.status===401||response.status===403?"Canvas rejected this feed URL. Copy a fresh Calendar Feed URL from Canvas.":`Canvas returned ${response.status}.`);
    const text=await response.text();if(text.length>2_000_000)throw new Error("The Canvas feed is too large to import at once.");
    const parsedEvents=parseCanvasCalendarFeed(text,parsed.origin),events=parsedEvents.filter(event=>canvasItemIsFuture(event));if(!events.length)throw new Error("No upcoming calendar items were found in that feed.");
    return privateJson({events,skippedPast:parsedEvents.length-events.length,source:"Canvas Calendar Feed",feedHost:parsed.hostname,syncedAt:new Date().toISOString()});
  }catch(error){return privateJson({error:String(error?.name==="AbortError"?"Canvas feed request timed out.":error?.message||"Canvas calendar feed could not be read.")},502)}
}

function assetResponse(pathname) {
  const asset = ASSETS[pathname === "/index.html" ? "/" : pathname];
  if (!asset) return null;
  const binary = atob(asset.body); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, { headers: { "content-type": asset.type, "cache-control": "no-cache, no-store, must-revalidate", "pragma": "no-cache", "expires": "0" } });
}

function corsOrigin(request){const origin=request.headers.get("origin");return origin===GITHUB_PAGES_ORIGIN?origin:null}
function withCors(response,request){const origin=corsOrigin(request);if(!origin)return response;const headers=new Headers(response.headers),vary=headers.get("vary");headers.set("access-control-allow-origin",origin);headers.set("access-control-allow-headers","authorization, content-type");headers.set("access-control-allow-methods","GET, PUT, POST, OPTIONS");headers.set("vary",vary?`${vary}, Origin`:"Origin");return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function corsPreflight(request){return corsOrigin(request)?new Response(null,{status:204,headers:{"access-control-allow-origin":GITHUB_PAGES_ORIGIN,"access-control-allow-headers":"authorization, content-type","access-control-allow-methods":"GET, PUT, POST, OPTIONS","access-control-max-age":"86400","vary":"Origin"}}):new Response(null,{status:403})}

export default {
  async fetch(request, env, ctx) {
    void ctx;
    const url = new URL(request.url);
    if(request.method==="OPTIONS"&&url.pathname.startsWith("/api/"))return corsPreflight(request);
    let response;
    if (request.method === "POST" && url.pathname === "/api/auth/exchange") response=await handleAuthExchange(request,env);
    else if (request.method === "POST" && url.pathname === "/api/auth/logout") response=await handleAuthLogout(request,env);
    else if (request.method === "GET" && url.pathname === "/api/account") response=await handleAccount(request,env);
    else if ((request.method === "GET" || request.method === "PUT") && url.pathname === "/api/state") { try { response=await handleState(request,env); } catch (error) { response=privateJson({error:"Could not access your schedule right now.",detail:String(error?.message||error)},503); } }
    else if (request.method === "POST" && url.pathname === "/api/canvas/sync") response=await handleCanvasSync(request,env);
    else if (request.method === "POST" && url.pathname === "/api/canvas/feed") response=await handleCanvasFeedSync(request,env);
    else if (request.method === "GET" && url.pathname === "/api/search") response=await handleSearch(url);
    else if (request.method === "GET" && url.pathname === "/api/walk") response=await handleWalk(url);
    else if (request.method !== "GET" && request.method !== "HEAD") response=new Response("Method not allowed", { status: 405 });
    else response=assetResponse(url.pathname) || new Response("Not found", { status: 404 });
    return url.pathname.startsWith("/api/")?withCors(response,request):response;
  },
};
