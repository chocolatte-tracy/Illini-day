import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const chicagoToday=()=>{const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),read=type=>parts.find(x=>x.type===type)?.value;return `${read("year")}-${read("month")}-${read("day")}`},shiftDate=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)},todayDate=chicagoToday(),tomorrowDate=shiftDate(todayDate,1),icsDate=date=>date.replaceAll('-',''),longDate=date=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:ai-talk
DTSTART;TZID=America/Chicago:${icsDate(todayDate)}T170000
DTEND;TZID=America/Chicago:${icsDate(todayDate)}T180000
SUMMARY:Responsible AI at Illinois
LOCATION:Siebel Center for Design
DESCRIPTION:A public lecture on responsible artificial intelligence.
URL:https://one.illinois.edu/event/ai-talk
END:VEVENT
BEGIN:VEVENT
UID:concert
DTSTART;TZID=America/Chicago:${icsDate(tomorrowDate)}T193000
DTEND;TZID=America/Chicago:${icsDate(tomorrowDate)}T213000
SUMMARY:Krannert Evening Concert
LOCATION:Krannert Center
DESCRIPTION:Live campus music performance.
URL:https://one.illinois.edu/event/concert
END:VEVENT
BEGIN:VEVENT
UID:restricted
DTSTART;TZID=America/Chicago:${icsDate(todayDate)}T200000
DTEND;TZID=America/Chicago:${icsDate(todayDate)}T210000
SUMMARY:21+ Wine Tasting
LOCATION:Off campus
END:VEVENT
END:VCALENDAR`;
const canvasFeed = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:canvas-assignment-1
DTSTART;TZID=America/Chicago:${icsDate(tomorrowDate)}T100000
DTEND;TZID=America/Chicago:${icsDate(tomorrowDate)}T113100
SUMMARY:CS 124 Project 1 Due
LOCATION:Canvas / CS 124
CATEGORIES:Assignment
DESCRIPTION:Submit your project notes and review the rubric.
URL:https://canvas.illinois.edu/courses/124/assignments/1
END:VEVENT
BEGIN:VEVENT
UID:canvas-utc-exam
DTSTART:${icsDate(tomorrowDate)}T230000Z
DTEND:${icsDate(tomorrowDate)}T233000Z
SUMMARY:Midterm Exam
LOCATION:Lincoln Hall
CATEGORIES:Exam
DESCRIPTION:Bring your student ID.
END:VEVENT
BEGIN:VEVENT
UID:canvas-all-day
DTSTART;VALUE=DATE:${icsDate(tomorrowDate)}
DTEND;VALUE=DATE:${icsDate(shiftDate(tomorrowDate,1))}
SUMMARY:Read course announcement
DESCRIPTION:Check the instructor's announcement before class.
END:VEVENT
BEGIN:VEVENT
UID:canvas-past-item
DTSTART;TZID=America/Chicago:${icsDate(shiftDate(todayDate,-1))}T100000
DTEND;TZID=America/Chicago:${icsDate(shiftDate(todayDate,-1))}T110000
SUMMARY:Old completed assignment
DESCRIPTION:This past item must not be imported.
END:VEVENT
BEGIN:VEVENT
UID:canvas-restricted
DTSTART;TZID=America/Chicago:${icsDate(todayDate)}T200000
DTEND;TZID=America/Chicago:${icsDate(todayDate)}T210000
SUMMARY:21+ Wine Tasting
END:VEVENT
END:VCALENDAR`;

globalThis.fetch = async input => {
  const url = String(input);
  if (url.startsWith("https://canvas.illinois.edu/feeds/calendars/")) return new Response(canvasFeed, { status: 200, headers: { "content-type": "text/calendar" } });
  if (url.includes("one.illinois.edu/ical")) return new Response(ics, { status: 200 });
  if (url === "https://calendars.illinois.edu/list/7") return new Response(`<h2>${longDate(todayDate)}</h2><h3><a href="https://calendars.illinois.edu/detail/ai-talk">Responsible AI at Illinois</a></h3><div>Time: 5:00 pm&nbsp;&nbsp; Location: Siebel Center for Design&nbsp;&nbsp; Sponsor: UIUC</div>`, { status: 200 });
  if (url === "https://krannertcenter.com/events") return new Response(`<script type="application/ld+json">{"@type":"Event","name":"Krannert Evening Concert","startDate":"${tomorrowDate}T19:30:00","endDate":"${tomorrowDate}T21:30:00","location":{"name":"Krannert Center"},"description":"Live campus music performance.","url":"https://krannertcenter.com/events/concert"}</script>`, { status: 200 });
  if (url === "https://union.illinois.edu/see-and-do/events") return new Response(`<html><body>No structured events</body></html>`, { status: 200 });
  if (url.includes("/event/ai-talk") || url.includes("/detail/ai-talk")) return new Response(`<script type="application/ld+json">{"@type":"Event","name":"Responsible AI at Illinois","startDate":"${todayDate}T17:00:00","endDate":"${todayDate}T18:00:00","location":{"name":"Siebel Center for Design"},"url":"${url}"}</script>`, { status: 200 });
  if (url.includes("/event/concert") || url.includes("/events/concert")) return new Response(`<script type="application/ld+json">{"@type":"Event","name":"Krannert Evening Concert","startDate":"${tomorrowDate}T19:30:00","endDate":"${tomorrowDate}T21:30:00","location":{"name":"Krannert Center"},"url":"${url}"}</script>`, { status: 200 });
  if (url.includes("valhalla1.openstreetmap.de")) return new Response(JSON.stringify({trip:{summary:{time:720,length:0.8}}}),{status:200,headers:{"content-type":"application/json"}});
  if (url.includes("overpass-api.de")) return new Response(JSON.stringify({elements:[
    {type:"node",id:11,lat:40.108,lon:-88.225,tags:{name:"Golden Wheat Chinese Restaurant",amenity:"restaurant",cuisine:"chinese;sichuan","addr:street":"Green Street","addr:city":"Champaign"}},
    {type:"node",id:12,lat:40.109,lon:-88.226,tags:{name:"Campus Hot Pot",amenity:"restaurant",cuisine:"hot_pot","addr:street":"Green Street","addr:city":"Champaign"}},
    {type:"node",id:13,lat:40.110,lon:-88.227,tags:{name:"Unrelated Pizza",amenity:"restaurant",cuisine:"pizza","addr:city":"Urbana"}}
  ]}),{status:200,headers:{"content-type":"application/json"}});
  if (url.includes("nominatim")) return new Response(JSON.stringify([
    { osm_type: "node", osm_id: 1, name: "Siam Terrace", display_name: "Siam Terrace, Urbana, Illinois", type: "thai", lat: "40.11", lon: "-88.21" },
    { osm_type: "node", osm_id: 2, name: "Sample Bar", display_name: "Sample Bar, Champaign, Illinois", type: "bar", lat: "40.11", lon: "-88.23" }
  ]), { status: 200, headers: { "content-type": "application/json" } });
  throw new Error(`Unexpected fetch: ${url}`);
};

const worker = (await import(pathToFileURL(new URL("./dist/server/index.js", import.meta.url).pathname))).default;
class FakeD1 {
  constructor(){this.rows=new Map();this.sessions=new Map();this.bridges=new Map()}
  prepare(sql){
    const db=this,normalized=sql.replace(/\s+/g," ").trim().toLowerCase();
    return {args:[],bind(...args){this.args=args;return this},async first(){
      if(normalized.includes("from auth_session")){const row=db.sessions.get(this.args[0]);return row&&row.expires_at>Number(this.args[1])?row:null}
      if(normalized.includes("from canvas_bridge")){const row=db.bridges.get(this.args[0]);return row&&row.expires_at>Number(this.args[1])?row:null}
      return db.rows.get(this.args[0])||null
    },async run(){
      if(normalized.startsWith("insert or replace into auth_session")){const [token_hash,user_id,email,expires_at]=this.args;db.sessions.set(token_hash,{token_hash,user_id,email,expires_at});return {success:true,meta:{changes:1}}}
      if(normalized.startsWith("delete from auth_session where expires_at")){for(const [key,row] of db.sessions)if(row.expires_at<=Number(this.args[0]))db.sessions.delete(key);return {success:true,meta:{changes:1}}}
      if(normalized.startsWith("delete from auth_session where token_hash")){db.sessions.delete(this.args[0]);return {success:true,meta:{changes:1}}}
      if(normalized.startsWith("insert into canvas_bridge")){const [code_hash,user_id,email,expires_at]=this.args;db.bridges.set(code_hash,{code_hash,user_id,email,expires_at});return {success:true,meta:{changes:1}}}
      if(normalized.startsWith("delete from canvas_bridge where expires_at")){for(const [key,row] of db.bridges)if(row.expires_at<=Number(this.args[0]))db.bridges.delete(key);return {success:true,meta:{changes:1}}}
      if(normalized.startsWith("delete from canvas_bridge where code_hash")){db.bridges.delete(this.args[0]);return {success:true,meta:{changes:1}}}
      const [id,email,events_json,todos_json,preferences_json]=this.args,old=db.rows.get(id),version=(old?.version||0)+1,updated_at=new Date().toISOString();db.rows.set(id,{user_id:id,email,events_json,todos_json,preferences_json,version,updated_at});return {success:true,meta:{changes:1}}
    }}
  }
}
const authHeaders=(id,email)=>({"oai-authenticated-user-id":id,"oai-authenticated-user-email":email});
async function api(query, date = todayDate, origin = "Illini Tower") {
  const response = await worker.fetch(new Request(`https://example.test/api/search?query=${encodeURIComponent(query)}&date=${date}&origin=${encodeURIComponent(origin)}`), {}, {});
  assert.equal(response.status, 200);
  return response.json();
}

const home = await worker.fetch(new Request("https://example.test/"), {}, {});
assert.equal(home.status, 200); assert.match(await home.text(), /Illini Day/); assert.equal(home.headers.get("x-content-type-options"), "nosniff");
const appAsset = await worker.fetch(new Request("https://example.test/app.js?v=20260916.1"), {}, {});
assert.equal(appAsset.status, 200); assert.match(appAsset.headers.get("cache-control"), /no-store/);
const today = await api("events today");
assert.equal(today.results.length, 1); assert.equal(today.results[0].title, "Responsible AI at Illinois");
assert.equal(today.results[0].verified, true); assert.ok(today.sources.length >= 4);
const late = await api("events after 6 pm", tomorrowDate);
assert.equal(late.results[0].title, "Krannert Evening Concert");
const music = await api("music this week");
assert.equal(music.results[0].place, "Krannert Center");
const food = await api("thai restaurant near campus");
assert.equal(food.results.length, 1); assert.equal(food.results[0].title, "Siam Terrace");
assert.ok(food.results[0].url.includes("google.com/maps"));
assert.equal(food.origin,"Illini Tower");assert.ok(food.results[0].distanceKm>0);assert.equal(food.sources.length,3);assert.ok(food.filters.excluded.includes("bar"));
const chinese = await api("Chinese restaurant near campus");
assert.deepEqual(chinese.results.map(x=>x.title).sort(),["Campus Hot Pot","Golden Wheat Chinese Restaurant"]);assert.equal(chinese.sources.length,3);assert.ok(chinese.results.every(x=>/chinese|hot pot/i.test(`${x.title} ${x.note}`)));
const walkResponse=await worker.fetch(new Request("https://example.test/api/walk?from=Illini%20Tower&to=Lincoln%20Hall"),{},{});const walk=await walkResponse.json();
assert.equal(walkResponse.status,200);assert.equal(walk.minutes,12);assert.ok(walk.googleUrl.includes("google.com/maps/dir"));
const database=new FakeD1(),env={DB:database};
const anonymousAccount=await worker.fetch(new Request("https://example.test/api/account"),env,{});assert.equal(anonymousAccount.status,401);
const account=await worker.fetch(new Request("https://example.test/api/account",{headers:authHeaders("user-a","a@example.com")}),env,{});assert.equal(account.status,200);assert.equal((await account.json()).user.email,"a@example.com");assert.match(account.headers.get("cache-control"),/no-store/);
const pagesOrigin="https://chocolatte-tracy.github.io";
const preflight=await worker.fetch(new Request("https://example.test/api/account",{method:"OPTIONS",headers:{origin:pagesOrigin,"access-control-request-method":"GET","access-control-request-headers":"authorization"}}),env,{});assert.equal(preflight.status,204);assert.equal(preflight.headers.get("access-control-allow-origin"),pagesOrigin);
const extensionOrigin="chrome-extension://test-extension";
const extensionPreflight=await worker.fetch(new Request("https://example.test/api/canvas/page-import",{method:"OPTIONS",headers:{origin:extensionOrigin,"access-control-request-method":"POST","access-control-request-headers":"content-type"}}),env,{});assert.equal(extensionPreflight.status,204);assert.equal(extensionPreflight.headers.get("access-control-allow-origin"),extensionOrigin);
const deniedPreflight=await worker.fetch(new Request("https://example.test/api/account",{method:"OPTIONS",headers:{origin:"https://attacker.example","access-control-request-method":"GET"}}),env,{});assert.equal(deniedPreflight.status,403);assert.equal(deniedPreflight.headers.get("access-control-allow-origin"),null);
const exchange=await worker.fetch(new Request("https://example.test/api/auth/exchange",{method:"POST",headers:{...authHeaders("user-a","a@example.com"),origin:pagesOrigin}}),env,{}),exchangePayload=await exchange.json();assert.equal(exchange.status,200);assert.equal(exchange.headers.get("access-control-allow-origin"),pagesOrigin);assert.ok(exchangePayload.token.length>=32);
const bearerHeaders={authorization:`Bearer ${exchangePayload.token}`,origin:pagesOrigin};
const bearerAccount=await worker.fetch(new Request("https://example.test/api/account",{headers:bearerHeaders}),env,{});assert.equal(bearerAccount.status,200);assert.equal((await bearerAccount.json()).user.id,"user-a");
const bridgeStart=await worker.fetch(new Request("https://example.test/api/canvas/bridge/start",{method:"POST",headers:{...authHeaders("user-a","a@example.com"),origin:pagesOrigin,"content-type":"application/json"},body:"{}"}),env,{}),bridgePayload=await bridgeStart.json();assert.equal(bridgeStart.status,200);assert.ok(bridgePayload.code.length>=32);assert.ok(bridgePayload.expiresAt>Date.now());
const browserPage={url:"https://canvas.illinois.edu/courses/241/modules",title:"Week 5",area:"Module",course:"MATH 241",module:"Week 5",items:[{sourceId:"course-241-module-5-item-1",title:"Review chapter 8 before quiz",module:"Week 5",note:"<strong>Teacher reminder:</strong> quiz Friday",deadline:"2026-10-03T23:59",url:"https://canvas.illinois.edu/courses/241/modules/items/1"}]};
const pageImport=await worker.fetch(new Request("https://example.test/api/canvas/page-import",{method:"POST",headers:{origin:extensionOrigin,"content-type":"application/json"},body:JSON.stringify({code:bridgePayload.code,page:browserPage})}),env,{}),pagePayload=await pageImport.json();assert.equal(pageImport.status,200);assert.equal(pageImport.headers.get("access-control-allow-origin"),extensionOrigin);assert.equal(pagePayload.source,"Canvas browser page");assert.equal(pagePayload.items[0].canvasArea,"Module");assert.equal(pagePayload.items[0].deadline,"2026-10-03T23:59");assert.doesNotMatch(pagePayload.items[0].note,/<strong>/);assert.equal(pagePayload.items[0].course,"MATH 241");
const reusedBridge=await worker.fetch(new Request("https://example.test/api/canvas/page-import",{method:"POST",headers:{origin:extensionOrigin,"content-type":"application/json"},body:JSON.stringify({code:bridgePayload.code,page:browserPage})}),env,{});assert.equal(reusedBridge.status,401);
const invalidBridgeStart=await worker.fetch(new Request("https://example.test/api/canvas/bridge/start",{method:"POST",headers:authHeaders("user-a","a@example.com"),body:"{}"}),env,{}),invalidBridgePayload=await invalidBridgeStart.json();assert.equal(invalidBridgeStart.status,200);
const invalidPage=await worker.fetch(new Request("https://example.test/api/canvas/page-import",{method:"POST",headers:{origin:extensionOrigin,"content-type":"application/json"},body:JSON.stringify({code:invalidBridgePayload.code,page:{url:"https://evil.example/not-canvas",items:[{title:"Fake task"}]}})}),env,{});assert.equal(invalidPage.status,400);
const anonymousState=await worker.fetch(new Request("https://example.test/api/state"),env,{});assert.equal(anonymousState.status,401);
const initialA=await worker.fetch(new Request("https://example.test/api/state",{headers:authHeaders("user-a","a@example.com")}),env,{});assert.equal((await initialA.json()).exists,false);
const sampleState={events:[{id:"private-a",title:"A only"}],todos:[{id:"task-a",title:"A task"}],preferences:{view:"day",focus:todayDate}};
const saveA=await worker.fetch(new Request("https://example.test/api/state",{method:"PUT",headers:{...authHeaders("user-a","a@example.com"),"content-type":"application/json"},body:JSON.stringify(sampleState)}),env,{});assert.equal(saveA.status,200);assert.equal((await saveA.json()).version,1);
const staleSave=await worker.fetch(new Request("https://example.test/api/state",{method:"PUT",headers:{...authHeaders("user-a","a@example.com"),"content-type":"application/json"},body:JSON.stringify({...sampleState,expectedVersion:0})}),env,{});assert.equal(staleSave.status,409);assert.equal((await staleSave.json()).conflict,true);
const readA=await worker.fetch(new Request("https://example.test/api/state",{headers:authHeaders("user-a","a@example.com")}),env,{}),stateA=await readA.json();assert.equal(stateA.events[0].id,"private-a");assert.equal(stateA.todos[0].id,"task-a");
const readB=await worker.fetch(new Request("https://example.test/api/state",{headers:authHeaders("user-b","b@example.com")}),env,{});assert.equal((await readB.json()).exists,false);
const invalid=await worker.fetch(new Request("https://example.test/api/state",{method:"PUT",headers:{...authHeaders("user-a","a@example.com"),"content-type":"application/json"},body:JSON.stringify({events:{},todos:[],preferences:{}})}),env,{});assert.equal(invalid.status,400);
const canvasImport=await worker.fetch(new Request("https://example.test/api/canvas/feed",{method:"POST",headers:{...authHeaders("user-a","a@example.com"),"content-type":"application/json"},body:JSON.stringify({feedUrl:"https://canvas.illinois.edu/feeds/calendars/user-a.ics?verifier=abc"})}),env,{}),canvasPayload=await canvasImport.json();
assert.equal(canvasImport.status,200);assert.equal(canvasPayload.source,"Canvas Calendar Feed");assert.equal(canvasPayload.events.length,3);assert.ok(canvasPayload.events.every(event=>event.source==="canvas-calendar"));
assert.equal(canvasPayload.events.find(event=>event.sourceId==="canvas-assignment-1").start,"10:00");assert.equal(canvasPayload.events.find(event=>event.sourceId==="canvas-utc-exam").date,tomorrowDate);assert.equal(canvasPayload.events.find(event=>event.sourceId==="canvas-all-day").end,"10:00");
assert.equal(canvasPayload.skippedPast,1);assert.equal(canvasPayload.events.some(event=>event.sourceId==="canvas-past-item"),false);
const badCanvasHost=await worker.fetch(new Request("https://example.test/api/canvas/feed",{method:"POST",headers:{...authHeaders("user-a","a@example.com"),"content-type":"application/json"},body:JSON.stringify({feedUrl:"https://calendar.example.com/canvas.ics"})}),env,{});assert.equal(badCanvasHost.status,400);
const bearerState=await worker.fetch(new Request("https://example.test/api/state",{headers:bearerHeaders}),env,{});assert.equal((await bearerState.json()).events[0].id,"private-a");
const logout=await worker.fetch(new Request("https://example.test/api/auth/logout",{method:"POST",headers:bearerHeaders}),env,{});assert.equal(logout.status,200);
const revoked=await worker.fetch(new Request("https://example.test/api/account",{headers:bearerHeaders}),env,{});assert.equal(revoked.status,401);
console.log("authentication bridge, extension CORS, account isolation, Canvas feed, browser page import, sync, live-search, restaurant, and route checks passed");
