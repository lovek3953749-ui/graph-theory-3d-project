import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { nodes, edges } from "./graph-data.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const nodeMap = new Map(nodes.map(n => [n.id, n]));
const adjacency = Object.fromEntries(nodes.map(n => [n.id, []]));
edges.forEach(([a,b,w]) => { adjacency[a].push([b,w]); adjacency[b].push([a,w]); });
let currentPath = [], sceneApi = null, selectedNode = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function edgeKey(a,b){ return [a,b].sort().join("::"); }
function isPathEdge(a,b,path=currentPath){ return path.some((v,i)=>i<path.length-1 && edgeKey(v,path[i+1])===edgeKey(a,b)); }
function graphDensity(){ return (2*edges.length)/(nodes.length*(nodes.length-1)); }
function setStats(){
  $("#stat-nodes").textContent=nodes.length; $("#stat-edges").textContent=edges.length;
  $("#stat-density").textContent=graphDensity().toFixed(2);
  $("#stat-connectivity").textContent=connectedComponents().length===1?"CONNECTED":"DISCONNECTED";
}
function connectedComponents(){
  const seen=new Set(), groups=[];
  for(const n of nodes){ if(seen.has(n.id))continue; const stack=[n.id], group=[]; seen.add(n.id);
    while(stack.length){const v=stack.pop();group.push(v);for(const [u] of adjacency[v])if(!seen.has(u)){seen.add(u);stack.push(u);}}
    groups.push(group);
  } return groups;
}
function renderMiniGraph(){
  const host=$("#mini-graph"), w=host.clientWidth||500, h=host.clientHeight||210;
  const coords={"Main Gate":[.10,.54],"Library":[.36,.18],"Hostel":[.32,.83],"Academic Block":[.65,.22],"Cafeteria":[.67,.76],"Sports Complex":[.91,.48]};
  const xy=id=>[coords[id][0]*w,coords[id][1]*h];
  let svg=`<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" role="img" aria-label="Campus graph with six vertices and nine weighted edges">`;
  for(const [a,b,cost] of edges){const [x1,y1]=xy(a),[x2,y2]=xy(b),mx=(x1+x2)/2,my=(y1+y2)/2;
    svg+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#63869a" stroke-width="1.6" opacity=".8"/><rect x="${mx-9}" y="${my-8}" width="18" height="15" rx="4" fill="#102638"/><text x="${mx}" y="${my+3}" fill="#8caebe" font-size="9" text-anchor="middle">${cost}</text>`;}
  for(const n of nodes){const [x,y]=xy(n.id);svg+=`<circle cx="${x}" cy="${y}" r="15" fill="#123b50" stroke="#51e0dc" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="20" fill="none" stroke="#51e0dc" opacity=".15"/><text x="${x}" y="${y+3}" fill="#eaffff" font-size="8" text-anchor="middle">${n.short.slice(0,3)}</text>`;}
  host.innerHTML=svg+"</svg>";
}

function initSelects(){
  const options=nodes.map(n=>`<option value="${escapeHtml(n.id)}">${escapeHtml(n.id)}</option>`).join("");
  $("#source-select").innerHTML=options; $("#target-select").innerHTML=options;
  $("#source-select").value="Main Gate"; $("#target-select").value="Sports Complex";
}
function reconstruct(prev,target){if(!prev.has(target)&&target!==$("#source-select").value)return [];const path=[target];while(prev.has(path[0]))path.unshift(prev.get(path[0]));return path;}
function dijkstra(source,target){
  const dist=new Map(nodes.map(n=>[n.id,Infinity])),prev=new Map(),visited=[],unvisited=new Set(nodes.map(n=>n.id));
  dist.set(source,0);
  while(unvisited.size){let u=null;for(const v of unvisited)if(u===null||dist.get(v)<dist.get(u))u=v;
    if(u===null||dist.get(u)===Infinity)break;unvisited.delete(u);visited.push(u);if(u===target)break;
    for(const [v,w] of adjacency[u])if(unvisited.has(v)&&dist.get(u)+w<dist.get(v)){dist.set(v,dist.get(u)+w);prev.set(v,u);}
  }
  return {path:reconstruct(prev,target),cost:dist.get(target),visited,trace:visited.map((v,i)=>`Settled ${v} · d=${dist.get(v)}`)};
}
function bfs(source,target){
  const q=[source],seen=new Set([source]),prev=new Map(),order=[];
  while(q.length){const u=q.shift();order.push(u);if(u===target)break;for(const [v] of adjacency[u])if(!seen.has(v)){seen.add(v);prev.set(v,u);q.push(v);}}
  const path=seen.has(target)?reconstruct(prev,target):[];
  return {path,cost:path.length?path.length-1:Infinity,visited:order,trace:order.map((v,i)=>`Layer visit ${i+1}: ${v}`)};
}
function dfs(source,target){
  const stack=[source],seen=new Set(),prev=new Map(),order=[];
  while(stack.length){const u=stack.pop();if(seen.has(u))continue;seen.add(u);order.push(u);if(u===target)break;
    [...adjacency[u]].reverse().forEach(([v])=>{if(!seen.has(v)){prev.set(v,u);stack.push(v);}});
  }
  const path=seen.has(target)?reconstruct(prev,target):[];
  return {path,cost:path.length?path.slice(1).reduce((s,v,i)=>s+adjacency[v].find(x=>x[0]===path[i])[1],0):Infinity,visited:order,trace:order.map((v,i)=>`Depth-first visit ${i+1}: ${v}`)};
}
function bellmanFord(source,target){
  const dist=new Map(nodes.map(n=>[n.id,Infinity])),prev=new Map(),trace=[];dist.set(source,0);
  const directed=[];edges.forEach(([a,b,w])=>{directed.push([a,b,w],[b,a,w]);});
  for(let i=0;i<nodes.length-1;i++){let changed=false;for(const [u,v,w] of directed)if(dist.get(u)!==Infinity&&dist.get(u)+w<dist.get(v)){dist.set(v,dist.get(u)+w);prev.set(v,u);changed=true;trace.push(`Relaxed ${u} → ${v}: ${dist.get(v)}`);}if(!changed)break;}
  const path=dist.get(target)===Infinity?[]:reconstruct(prev,target);
  return {path,cost:dist.get(target),visited:[...dist].filter(([,d])=>d<Infinity).map(([v])=>v),trace:trace.slice(0,14)};
}
function kruskal(){
  const parent=Object.fromEntries(nodes.map(n=>[n.id,n.id]));
  const find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));
  const sorted=[...edges].sort((a,b)=>a[2]-b[2]),chosen=[];let cost=0;
  for(const [a,b,w] of sorted){const x=find(a),y=find(b);if(x!==y){parent[x]=y;chosen.push([a,b,w]);cost+=w;}}
  return {path:[],cost,visited:chosen.flatMap(e=>e.slice(0,2)).filter((v,i,a)=>a.indexOf(v)===i),trace:chosen.map(([a,b,w])=>`Selected ${a} — ${b} · weight ${w}`),treeEdges:chosen};
}
function prim(source){
  const visited=new Set([source]),chosen=[],trace=[];let cost=0;
  while(visited.size<nodes.length){let best=null;for(const u of visited)for(const [v,w] of adjacency[u])if(!visited.has(v)&&(!best||w<best[2]))best=[u,v,w];
    if(!best)break;chosen.push(best);visited.add(best[1]);cost+=best[2];trace.push(`Added ${best[0]} — ${best[1]} · weight ${best[2]}`);
  }
  return {path:[],cost,visited:[...visited],trace,treeEdges:chosen};
}
function greedyColor(){
  const colors={},palette=["#51e0dc","#ffc86a","#8b9cff","#ef8cae","#80dfa9","#c89cff"];
  for(const n of nodes){const used=new Set(adjacency[n.id].map(([v])=>colors[v]).filter(x=>x!==undefined));let c=0;while(used.has(c))c++;colors[n.id]=c;}
  return {path:[],cost:new Set(Object.values(colors)).size,visited:nodes.map(n=>n.id),trace:nodes.map(n=>`${n.id} assigned color ${colors[n.id]+1}`),colors,palette};
}
function matchingDemo(){
  const left=["Students A","Students B","Students C"],right=["Project 1","Project 2","Project 3"];
  const links=[["Students A","Project 1"],["Students A","Project 2"],["Students B","Project 2"],["Students C","Project 2"],["Students C","Project 3"]];
  const matchRight={};
  function augment(u,seen){for(const [,v] of links.filter(e=>e[0]===u)){if(seen.has(v))continue;seen.add(v);if(!matchRight[v]||augment(matchRight[v],seen)){matchRight[v]=u;return true;}}return false;}
  left.forEach(u=>augment(u,new Set()));
  const pairs=Object.entries(matchRight).map(([v,u])=>`${u} → ${v}`);
  return {path:[],cost:pairs.length,visited:left,trace:pairs,extra:"Illustrative bipartite assignment example (three students and three projects)."};
}
function runAlgorithm(){
  const kind=$("#algorithm-select").value,source=$("#source-select").value,target=$("#target-select").value;
  const names={dijkstra:"Dijkstra shortest path",bfs:"Breadth-first search",dfs:"Depth-first search",bellman:"Bellman–Ford",kruskal:"Kruskal minimum spanning tree",prim:"Prim minimum spanning tree",color:"Greedy graph coloring",matching:"Bipartite matching"};
  const hints={dijkstra:"Dijkstra is valid because every sample edge has a non-negative weight.",bfs:"BFS finds a path with the fewest edges in an unweighted interpretation; it does not minimize weighted distance.",dfs:"DFS explores deeply before backtracking. Its first-found route is not guaranteed to be shortest.",bellman:"Bellman–Ford supports negative edge weights and can detect reachable negative cycles. This sample is undirected and non-negative.",kruskal:"Kruskal sorts edges by weight and joins components without creating a cycle.",prim:"Prim grows a minimum spanning tree from the selected start vertex.",color:"Greedy coloring assigns the smallest available color in node order; it is not guaranteed to be optimal.",matching:"A bipartite matching pairs vertices from two disjoint sets without reusing a vertex."};
  $("#algorithm-hint").textContent=hints[kind];
  let result;
  if(kind==="dijkstra")result=dijkstra(source,target);
  if(kind==="bfs")result=bfs(source,target);
  if(kind==="dfs")result=dfs(source,target);
  if(kind==="bellman")result=bellmanFord(source,target);
  if(kind==="kruskal")result=kruskal();
  if(kind==="prim")result=prim(source);
  if(kind==="color")result=greedyColor();
  if(kind==="matching")result=matchingDemo();
  currentPath=result.path||[];
  if(sceneApi)sceneApi.setHighlight(result.treeEdges||[],result.colors||null);
  $("#result-title").textContent=names[kind];$("#result-state").textContent="COMPLETED";
  const summary=$("#result-summary");
  summary.innerHTML=`<div class="empty-symbol" style="color:var(--cyan)">✓</div><b>${kind==="color"?`${result.cost} color(s) used`:kind==="matching"?`${result.cost} matched pair(s)`:result.treeEdges?`${result.treeEdges.length} edges selected for spanning tree`:result.path.length?`Result contains ${result.path.length} vertices`:"No path found"}</b><span>${escapeHtml(hints[kind])}</span>`;
  $("#result-path").textContent=result.path?.length?result.path.join(" → "):result.treeEdges?result.treeEdges.map(e=>`${e[0]}—${e[1]}`).join(", "):result.colors?Object.entries(result.colors).map(([v,c])=>`${v}: C${c+1}`).join(" · "):result.trace?.join(" | ")||"—";
  $("#result-cost").textContent=Number.isFinite(result.cost)?(kind==="bfs"?"Edges: ":"Weight: ")+result.cost:"—";
  $("#result-visited").textContent=result.visited?.length??"—";
  $("#trace-list").innerHTML=(result.trace||[]).map(t=>`<span class="trace-chip">${escapeHtml(t)}</span>`).join("")||'<span class="muted">No trace available.</span>';
}
function clearAlgorithm(){currentPath=[];if(sceneApi)sceneApi.setHighlight([],null);$("#result-title").textContent="Awaiting algorithm";$("#result-state").textContent="IDLE";$("#result-summary").innerHTML='<div class="empty-symbol">⌘</div><b>No algorithm has been executed</b><span>Select an algorithm and run it to see the traversal or optimization result.</span>';$("#result-path").textContent=$("#result-cost").textContent=$("#result-visited").textContent="—";$("#trace-list").innerHTML='<span class="muted">Execution steps will appear here.</span>';}

const theory=[
{title:"Historical origins & motivation",body:`<h2>Phase 1 · Historical origins & motivation</h2><p>Graph theory grew from questions about routes, circuits, counting, and maps. Its central idea is to represent objects as points and relationships as connections, then reason about the whole system mathematically.</p><h3>The Seven Bridges of Königsberg (1736)</h3><p>Leonhard Euler studied whether a person could cross each of the seven bridges of Königsberg exactly once. He represented each landmass as a vertex and each bridge as an edge. The resulting graph had four vertices of odd degree. An Euler trail can exist in a connected graph only when there are zero or two odd-degree vertices. Therefore, the requested route was impossible. This is commonly treated as the beginning of graph theory.</p><h3>Early milestones</h3><ul><li><b>Gustav Kirchhoff (1847):</b> graph-like structures for electrical circuit laws and current/voltage analysis.</li><li><b>Arthur Cayley (1857):</b> tree enumeration and counting chemical structures and isomers.</li><li><b>Francis Guthrie (1852):</b> posed the map-coloring conjecture.</li><li><b>Kenneth Appel and Wolfgang Haken (1976):</b> proved the Four Color Theorem with substantial computer assistance.</li></ul><div class="callout">The same abstraction that answered a bridge puzzle now supports route planning, communication networks, social platforms, scheduling, biological networks, and machine learning.</div>`},
{title:"Mathematical foundations",body:`<h2>Phase 2 · Mathematical foundations & classifications</h2><h3>Formal definition</h3><p>A graph is written as <b>G = (V, E)</b>, where V is a non-empty set of vertices and E is a set of edges connecting pairs of vertices. In a simple undirected graph, an edge is an unordered pair of distinct vertices. In a directed graph, an edge is an ordered pair.</p><h3>Core vocabulary</h3><table><tr><th>Term</th><th>Meaning</th></tr><tr><td>Degree deg(v)</td><td>Number of edges incident to v. Directed graphs distinguish in-degree and out-degree.</td></tr><tr><td>Path</td><td>A sequence of vertices where consecutive vertices are connected.</td></tr><tr><td>Cycle</td><td>A closed path that starts and ends at the same vertex.</td></tr><tr><td>Connectivity</td><td>Every pair of vertices has a path between them; directed graphs have strong-connectivity variants.</td></tr><tr><td>Subgraph</td><td>A graph formed from subsets of a parent graph’s vertices and edges.</td></tr></table><h3>Graph taxonomy</h3><ul><li><b>Undirected / directed:</b> mutual links versus one-way links.</li><li><b>Unweighted / weighted:</b> connection only versus distance, cost, time, capacity, or risk.</li><li><b>Complete graph Kₙ:</b> every pair is connected; undirected edge count n(n−1)/2.</li><li><b>Bipartite:</b> vertices split into two disjoint sets; edges cross between sets.</li><li><b>Planar:</b> drawable without edge crossings except at shared endpoints.</li><li><b>Tree:</b> connected and acyclic; a tree with n vertices has n−1 edges.</li></ul>`},
{title:"Computational representations",body:`<h2>Phase 3 · Computational representations</h2><p>Let V be the number of vertices and E the number of edges. Representation choice affects memory and operation speed.</p><table><tr><th>Representation</th><th>Storage / lookup</th><th>Best use</th></tr><tr><td>Adjacency matrix</td><td>V × V; edge lookup O(1); space O(V²)</td><td>Dense graphs and quick edge checks</td></tr><tr><td>Adjacency list</td><td>Space O(V + E); neighbor iteration by degree</td><td>Sparse networks, BFS/DFS</td></tr><tr><td>Edge list</td><td>Space O(E)</td><td>Edge-centric processing and Kruskal</td></tr><tr><td>Incidence matrix</td><td>V × E; commonly O(VE)</td><td>Algebraic graph theory and flow formulations</td></tr></table><div class="callout">Practical rule: use an adjacency list as the default for a real-world sparse network. Use a matrix when the graph is dense or constant-time edge-existence checks are central.</div>`},
{title:"Algorithms & traversals",body:`<h2>Phase 4 · Fundamental algorithms & traversals</h2><table><tr><th>Algorithm</th><th>Purpose</th><th>Typical time</th><th>Condition</th></tr><tr><td>BFS</td><td>Layer-by-layer traversal; unweighted shortest path</td><td>O(V + E)</td><td>Unweighted path</td></tr><tr><td>DFS</td><td>Deep exploration, components, cycles, topological sorting in DAGs</td><td>O(V + E)</td><td>Depth-first exploration</td></tr><tr><td>Dijkstra</td><td>Single-source shortest paths</td><td>O((V + E) log V)</td><td>Non-negative weights</td></tr><tr><td>Bellman–Ford</td><td>Shortest paths and reachable negative-cycle detection</td><td>O(VE)</td><td>Allows negative weights</td></tr><tr><td>Kruskal</td><td>Minimum spanning tree / forest</td><td>O(E log E)</td><td>Undirected weighted graph</td></tr><tr><td>Prim</td><td>Grow MST by cheapest crossing edge</td><td>O(E log V)</td><td>Undirected weighted graph</td></tr></table><h3>Coloring and matching</h3><p><b>Greedy graph coloring</b> assigns the smallest color not used by an already-colored neighbor. It is useful for timetabling, but depends on vertex order and is not guaranteed to minimize colors.</p><p><b>Bipartite matching</b> pairs vertices from two sets without reusing a vertex. The Hungarian algorithm solves weighted assignment in the standard square case; Hopcroft–Karp is common for general maximum-cardinality bipartite matching.</p><div class="callout">BFS → fewest edges. Dijkstra → non-negative weighted shortest route. Bellman–Ford → negative weights. Kruskal / Prim → lowest-cost network. Coloring → non-conflicting time slots.</div>`},
{title:"Real-world applications",body:`<h2>Phase 5 · Real-world applications</h2><p>A useful case study defines what vertices and edges mean, whether edges are directed, what weights represent, and what outcome the algorithm produces.</p><table><tr><th>Domain</th><th>Graph model</th><th>Algorithm / concept</th><th>Outcome</th></tr><tr><td>Navigation & logistics</td><td>Places / intersections; roads or paths with distance or time</td><td>Dijkstra, A*</td><td>Efficient routes and delivery paths</td></tr><tr><td>Web search</td><td>Webpages; directed hyperlinks</td><td>PageRank, eigenvector centrality</td><td>Estimate page importance</td></tr><tr><td>Social networks</td><td>Users; friendships or follows</td><td>Community detection, triadic closure</td><td>Groups, suggestions, influence</td></tr><tr><td>Telecommunications</td><td>Routers / towers; cables or wireless links</td><td>MST, shortest path, flow</td><td>Connectivity cost and capacity</td></tr><tr><td>Scheduling</td><td>Exams / tasks; conflict edges</td><td>Graph coloring</td><td>Non-conflicting time slots</td></tr></table><h3>Campus route finder</h3><p>Input: campus locations and walkway connections with estimated distances. Output: shortest route, total distance, and highlighted path. Evaluation: test at least three origin–destination pairs, include a disconnected-location test, and compare BFS (fewest edges) with Dijkstra (lowest total weight).</p>`},
{title:"Implementation & workflow",body:`<h2>Phase 6 · Implementation & project workflow</h2><p>The project guide recommends Python and NetworkX for graph construction and algorithms, Matplotlib for static visualization, Jupyter Notebook or VS Code for development, and CSV/JSON for data storage.</p><h3>End-to-end workflow</h3><ol><li>Define the real-world problem.</li><li>Model it as a graph: identify V, E, direction, and weights.</li><li>Collect or create a clearly labeled sample dataset and validate it.</li><li>Choose a representation: adjacency list for sparse networks; matrix for dense networks.</li><li>Select a valid algorithm.</li><li>Implement and test edge cases.</li><li>Visualize and analyze runtime and memory.</li><li>Evaluate assumptions, limitations, outcomes, and future scope.</li></ol><div class="callout">The sample campus dataset in this interactive project is illustrative. Replace it with measured campus distances for a real deployment. The 3D layout coordinates are for visualization only and do not represent actual geography.</div><h3>Python toolchain</h3><p>Python 3 · NetworkX · Matplotlib · Jupyter Notebook / VS Code · CSV / JSON.</p>`}
];
function initTheory(){
  const menu=$("#theory-menu");menu.innerHTML=theory.map((t,i)=>`<button class="${i===0?"active":""}" data-phase="${i}"><b>0${i+1}</b>${escapeHtml(t.title)}</button>`).join("");
  menu.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{menu.querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#theory-content").innerHTML=theory[Number(b.dataset.phase)].body;}));
  $("#theory-content").innerHTML=theory[0].body;
}
function initApplications(){
 const apps=[
 ["⌖","Navigation & logistics","Intersections or places are vertices; roads or paths are edges, often weighted by distance or time. Dijkstra and A* search find efficient driving, walking, and delivery routes.","VERTICES: PLACES · EDGES: ROUTES · WEIGHT: DISTANCE / TIME"],
 ["⌘","Web search","Webpages are vertices and hyperlinks are directed edges. PageRank and eigenvector centrality estimate page importance from incoming link structure.","VERTICES: WEBPAGES · DIRECTED EDGES: HYPERLINKS"],
 ["◎","Social networks","Users are vertices; friendships or follows are directed or undirected edges. Community detection and triadic closure help study groups and influence.","VERTICES: USERS · EDGES: FRIENDSHIPS / FOLLOWS"],
 ["⌁","Telecommunications","Routers and towers are vertices; cables or wireless links are edges with cost or capacity. MST, shortest path, and flow support network planning.","VERTICES: ROUTERS · EDGES: LINKS · WEIGHT: COST / CAPACITY"],
 ["▦","Scheduling","Exams or tasks are vertices; conflicts are edges. Graph coloring assigns time slots so connected/conflicting exams do not occur together.","VERTICES: EXAMS · EDGES: CONFLICTS"],
 ["◇","Biological & machine learning networks","Molecules, genes, or entities can be vertices; bonds or relationships are edges. Graph learning can use node and edge features for prediction.","VERTICES: ENTITIES · EDGES: RELATIONSHIPS"]
 ];
 $("#application-grid").innerHTML=apps.map(a=>`<article class="application-card"><div class="app-icon">${a[0]}</div><h3>${a[1]}</h3><p>${a[2]}</p><div class="app-model">${a[3]}</div></article>`).join("");
}
const repInfo={
 adjacency:{title:"Adjacency list",eyebrow:"SPARSE NETWORK DEFAULT",space:"SPACE O(V + E)",description:"Each vertex stores its neighboring vertices and edge weights. Neighbor iteration is proportional to the degree of the vertex.",best:"Sparse networks, BFS/DFS, and most practical network problems."},
 matrix:{title:"Adjacency matrix",eyebrow:"DENSE GRAPH REPRESENTATION",space:"SPACE O(V²)",description:"A V × V table stores whether two vertices are adjacent. For this weighted graph, each cell stores the edge weight and 0 means no edge.",best:"Dense graphs, constant-time edge-existence checks, and matrix-based algorithms."},
 edges:{title:"Edge list",eyebrow:"EDGE-CENTRIC REPRESENTATION",space:"SPACE O(E)",description:"Stores endpoint pairs and optional weights. It is compact and convenient when algorithms process or sort edges.",best:"Edge-centric processing, sorting edges, and Kruskal’s minimum spanning tree."},
 incidence:{title:"Incidence matrix",eyebrow:"VERTEX-EDGE RELATIONSHIP",space:"SPACE O(VE)",description:"A V × E matrix describes which vertices touch each edge. For an undirected graph, each edge column has two incident entries.",best:"Algebraic graph theory, flow, and network formulations."}
};
function renderRepresentation(kind){
 const info=repInfo[kind];$("#rep-title").textContent=info.title;$("#rep-eyebrow").textContent=info.eyebrow;$("#rep-space").textContent=info.space;$("#rep-description").textContent=info.description;$("#rep-best").innerHTML=`BEST USE <span>${info.best}</span>`;
 let html="";
 if(kind==="adjacency"){html='<table class="data-table"><thead><tr><th>VERTEX</th><th>NEIGHBORS (VERTEX, WEIGHT)</th></tr></thead><tbody>'+nodes.map(n=>`<tr><td>${escapeHtml(n.id)}</td><td>${adjacency[n.id].map(([v,w])=>`${escapeHtml(v)} (${w})`).join(" · ")}</td></tr>`).join("")+'</tbody></table>';}
 if(kind==="matrix"){html='<table class="data-table"><thead><tr><th>V</th>'+nodes.map(n=>`<th>${escapeHtml(n.short)}</th>`).join("")+'</tr></thead><tbody>'+nodes.map(a=>`<tr><td>${escapeHtml(a.short)}</td>${nodes.map(b=>{const e=adjacency[a.id].find(x=>x[0]===b.id);return `<td>${e?e[1]:"0"}</td>`;}).join("")}</tr>`).join("")+'</tbody></table>';}
 if(kind==="edges"){html='<table class="data-table"><thead><tr><th>EDGE ID</th><th>VERTEX U</th><th>VERTEX V</th><th>WEIGHT</th></tr></thead><tbody>'+edges.map((e,i)=>`<tr><td>E${i+1}</td><td>${escapeHtml(e[0])}</td><td>${escapeHtml(e[1])}</td><td>${e[2]}</td></tr>`).join("")+'</tbody></table>';}
 if(kind==="incidence"){html='<table class="data-table"><thead><tr><th>V / E</th>'+edges.map((e,i)=>`<th>E${i+1}</th>`).join("")+'</tr></thead><tbody>'+nodes.map(n=>`<tr><td>${escapeHtml(n.short)}</td>${edges.map(e=>`<td>${e.includes(n.id)?"1":"0"}</td>`).join("")}</tr>`).join("")+'</tbody></table>';}
 $("#representation-output").innerHTML=html;
}
function initThree(){
 const host=$("#graph3d");if(!host)return;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x091522,.055);
 const camera=new THREE.PerspectiveCamera(48,host.clientWidth/host.clientHeight,.1,100);camera.position.set(0,2.8,8.7);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;host.innerHTML="";host.appendChild(renderer.domElement);
 scene.add(new THREE.AmbientLight(0x8bbbd0,1.25));const key=new THREE.PointLight(0x51e0dc,65,30);key.position.set(0,4,5);scene.add(key);const blue=new THREE.PointLight(0x397dff,35,25);blue.position.set(-4,-2,-2);scene.add(blue);
 const group=new THREE.Group();scene.add(group);
 const starGeo=new THREE.BufferGeometry(),starPos=[];for(let i=0;i<550;i++)starPos.push((Math.random()-.5)*18,(Math.random()-.5)*11,(Math.random()-.5)*12);
 starGeo.setAttribute("position",new THREE.Float32BufferAttribute(starPos,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x47748d,size:.018,transparent:true,opacity:.7}));scene.add(stars);
 const posMap=new Map(),nodeMeshes=new Map(),edgeMeshes=[];
 nodes.forEach(n=>posMap.set(n.id,new THREE.Vector3(...n.position)));
 const sphereGeo=new THREE.SphereGeometry(.16,32,32);
 nodes.forEach((n,i)=>{
  const p=posMap.get(n.id),mat=new THREE.MeshStandardMaterial({color:0x42d7d2,emissive:0x0c777a,emissiveIntensity:1.25,roughness:.3,metalness:.25});
  const mesh=new THREE.Mesh(sphereGeo,mat);mesh.position.copy(p);mesh.userData.nodeId=n.id;group.add(mesh);nodeMeshes.set(n.id,mesh);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.24,24,24),new THREE.MeshBasicMaterial({color:0x51e0dc,transparent:true,opacity:.09,side:THREE.BackSide}));halo.position.copy(p);group.add(halo);
  const sprite=makeLabel(n.short);sprite.position.copy(p).add(new THREE.Vector3(0,.34,0));sprite.userData.isLabel=true;group.add(sprite);
 });
 edges.forEach(([a,b,w])=>{
  const start=posMap.get(a),end=posMap.get(b),curve=new THREE.LineCurve3(start,end),geo=new THREE.TubeGeometry(curve,24,.012,7,false),mat=new THREE.MeshBasicMaterial({color:0x62899f,transparent:true,opacity:.7});
  const line=new THREE.Mesh(geo,mat);line.userData.edge=[a,b];group.add(line);edgeMeshes.push(line);
  const mid=start.clone().add(end).multiplyScalar(.5);const label=makeLabel(String(w),true);label.position.copy(mid);label.userData.isWeight=true;group.add(label);
 });
 const grid=new THREE.GridHelper(13,32,0x2d6174,0x1c4052);grid.position.y=-2.0;grid.material.transparent=true;grid.material.opacity=.22;group.add(grid);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=4;controls.maxDistance=15;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let autoRotate=true,labelsVisible=true,nodeScale=1,edgeOpacity=.7;
 function makeLabel(text,small=false){
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=small?128:256;canvas.height=64;ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=small?"rgba(7,20,31,.88)":"rgba(7,24,36,.92)";roundRect(ctx,4,5,canvas.width-8,canvas.height-10,10);ctx.fill();
  ctx.strokeStyle=small?"rgba(255,200,106,.45)":"rgba(81,224,220,.5)";ctx.lineWidth=2;roundRect(ctx,4,5,canvas.width-8,canvas.height-10,10);ctx.stroke();
  ctx.fillStyle=small?"#ffd58a":"#d9ffff";ctx.font=`${small?25:27}px Manrope, sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,canvas.width/2,canvas.height/2);
  const tex=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.scale.set(small?.42:.9,small?.21:.32,1);return sprite;
 }
 function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
 function select(id){selectedNode=id;const n=nodeMap.get(id);$("#node-name").textContent=n.id;$("#node-description").textContent=n.description;$("#node-degree").textContent=adjacency[id].length;$("#node-neighbors").textContent=adjacency[id].map(x=>x[0]).join(", ");nodeMeshes.forEach((m,k)=>{m.material.emissiveIntensity=k===id?2.3:1.25;m.scale.setScalar(k===id?1.35:nodeScale);});}
 renderer.domElement.addEventListener("pointerdown",e=>{const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...nodeMeshes.values()]);if(hits.length)select(hits[0].object.userData.nodeId);});
 function setHighlight(treeEdges=[],colors=null){
  const treeSet=new Set(treeEdges.map(e=>edgeKey(e[0],e[1])));
  edgeMeshes.forEach(m=>{const [a,b]=m.userData.edge,highlight=isPathEdge(a,b)||treeSet.has(edgeKey(a,b));m.material.color.set(highlight?0xffc86a:0x62899f);m.material.opacity=highlight?1:edgeOpacity;m.scale.set(1,1,highlight?1.6:1);});
  nodeMeshes.forEach((m,id)=>{if(colors){m.material.color.set(colors.palette[colors.colors[id]%colors.palette.length]);m.material.emissive.set(colors.palette[colors.colors[id]%colors.palette.length]);}else{m.material.color.set(currentPath.includes(id)?0xffc86a:0x42d7d2);m.material.emissive.set(currentPath.includes(id)?0x8a4e0a:0x0c777a);}});
 }
 function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
 const observer=new ResizeObserver(resize);observer.observe(host);
 function animate(){requestAnimationFrame(animate);if(autoRotate&&!controls.state)group.rotation.y+=.0008;controls.update();renderer.render(scene,camera);}
 animate();
 $("#toggle-labels").addEventListener("click",e=>{labelsVisible=!labelsVisible;e.currentTarget.classList.toggle("active",labelsVisible);group.children.forEach(o=>{if(o.userData.isLabel||o.userData.isWeight)o.visible=labelsVisible;});});
 $("#toggle-rotation").addEventListener("click",e=>{autoRotate=!autoRotate;e.currentTarget.classList.toggle("active",autoRotate);});
 $("#reset-camera").addEventListener("click",()=>{camera.position.set(0,2.8,8.7);controls.target.set(0,0,0);group.rotation.set(0,0,0);});
 $("#node-size").addEventListener("input",e=>{nodeScale=Number(e.target.value);nodeMeshes.forEach((m,id)=>m.scale.setScalar(id===selectedNode?1.35:nodeScale));});
 $("#edge-opacity").addEventListener("input",e=>{edgeOpacity=Number(e.target.value);edgeMeshes.forEach(m=>{if(!isPathEdge(...m.userData.edge))m.material.opacity=edgeOpacity;});});
 sceneApi={setHighlight,select,reset:()=>{$("#reset-camera").click();}};
}
function showView(name){
 $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));
 $$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 $("#crumb-current").textContent=name.toUpperCase();
 if(name==="visualizer"&&sceneApi)sceneApi.reset();
}
$$(".nav-link").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
$("#reset-view").addEventListener("click",()=>{clearAlgorithm();if(sceneApi)sceneApi.reset();});
$("#run-algorithm").addEventListener("click",runAlgorithm);
$("#clear-algorithm").addEventListener("click",clearAlgorithm);
$("#algorithm-select").addEventListener("change",()=>{const k=$("#algorithm-select").value;$("#target-select").disabled=["kruskal","prim","color","matching"].includes(k);});
$$(".rep-tab").forEach(b=>b.addEventListener("click",()=>{$$(".rep-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderRepresentation(b.dataset.rep);}));
setStats();initSelects();renderMiniGraph();initTheory();initApplications();renderRepresentation("adjacency");
try{initThree();}catch(err){$("#graph3d").innerHTML=`<div class="scene-loading">3D ENGINE ERROR · ${escapeHtml(err.message)}</div>`;console.error(err);}
window.addEventListener("resize",renderMiniGraph);
