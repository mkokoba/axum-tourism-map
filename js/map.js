// ================= MAP INITIALIZATION =================
let map = L.map('map').setView([13.9, 37.5], 8);

let weredaLayer;
let roadLayer;
let riverLayer;
let siteLayer;

// ================= BASEMAP =================
/*
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
 attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
*/
// ================= COLORS =================

const roadColors = {
 "Asphalt": "#e41a1c",
 "Gravel": "#ff7f00",
 "Earth": "#999999",
 "Asphalt UN Cons": "#4daf4a"
};

const siteColors = {
 "Historical":"#f44336",
 "Monastery":"#3f51b5",
 "Church":"#009688",
 "Archaeological":"#ff9800",
 "Palace":"#9c27b0",
 "Natural Recreation":"#4caf50",
 "Unknown":"#757575"
};

// ================= HELPER FUNCTION =================
function loadGeoJSON(url, options){
 return fetch(url)
 .then(res => res.json())
 .then(data => L.geoJSON(data, options).addTo(map))
 .catch(err => console.error("Error loading:",url,err));
}

// ================= WEREDA =================

loadGeoJSON('map/wereda1.geojson',{
 style:{
  color:"#333",
  weight:1,
  fillColor:"#a6d854",
  fillOpacity:0.5
 },
 onEachFeature:(f,l)=>{
  l.bindPopup("<b>Wereda:</b> "+(f.properties.ZONE_ || "Unknown"));
 }
}).then(layer=>{
 weredaLayer = layer;
});

// ================= ROADS =================

loadGeoJSON('map/road1.geojson',{

 style:(f)=>{

  let type = f.properties.TYPE || "Unknown";

  return{
   color: roadColors[type] || "#666",
   weight:3,
   dashArray: type==="Asphalt UN Cons" ? "6,6" : null
  }

 },

 onEachFeature:(f,l)=>{
  l.bindPopup(
   "<b>Road:</b> "+(f.properties.NAME || "Unknown")+
   "<br><b>Type:</b> "+(f.properties.TYPE || "Unknown")
  );
 }

}).then(layer=>{
 roadLayer = layer;
 generateRoadLegend();
});

// ================= RIVERS =================

loadGeoJSON('map/river1.geojson',{
 style:{
  color:"#0077be",
  weight:2
 },
 onEachFeature:(f,l)=>{
  l.bindPopup("<b>River:</b> "+(f.properties.River_Name || "Unnamed"));
 }
}).then(layer=>{
 riverLayer = layer;
});

// ================= TOURIST SITES =================

loadGeoJSON('map/siteF.geojson',{

 pointToLayer:(f,latlng)=>{

  let type = f.properties.Attra_Type?.trim() || "Unknown";

  let icon = L.divIcon({
   className:"custom-icon",
   html:`<div style="
    background:${siteColors[type] || "#757575"};
    width:30px;
    height:30px;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    color:white;">
    <i class="fas fa-map-marker-alt"></i></div>`
  });

  let marker = L.marker(latlng,{icon:icon});

  marker.type = type;
  marker.props = f.properties;

  marker.bindPopup(
   "<b>"+(f.properties.Name || "Tourist Site")+"</b>"+
   "<br>"+type
  );

  marker.on("click",()=>showSiteInfo(marker));

  return marker;

 }

}).then(layer=>{
 siteLayer = layer;
 generateSiteLegend();
});

// ================= ROAD LEGEND =================

function generateRoadLegend(){

 let container = document.getElementById("roadLegendItems");

 container.innerHTML="";

 Object.keys(roadColors).forEach(type=>{

  let dashed = type==="Asphalt UN Cons"
   ? "border-top:3px dashed black;"
   : "";

  let div=document.createElement("div");

  div.innerHTML=
   `<span style="
     display:inline-block;
     width:30px;
     height:3px;
     background:${roadColors[type]};
     ${dashed}
     margin-right:5px;"></span>${type}`;

  container.appendChild(div);

 });

}

// ================= SITE LEGEND WITH ICONS AND COLLAPSE =================
function generateSiteLegend(){

  const container = document.getElementById("siteLegendItems");
  container.innerHTML = "";

  // Define icon for each category or type
  const categories = {
    "Historical Sites": {
      icon: "fas fa-landmark",
      types: ["Historical","Archaeological"]
    },
    "Religious Sites": {
      icon: "fas fa-church",
      types: ["Monastery","Church"]
    },
    "Palaces": {
      icon: "fas fa-crown",
      types: ["Palace"]
    },
    "Natural Recreation": {
      icon: "fas fa-tree",
      types: ["Natural Recreation"]
    },
    "Unknown": {
      icon: "fas fa-map-marker-alt",
      types: ["Unknown"]
    }
  };

  for(const [catName, catInfo] of Object.entries(categories)){

    // Create parent div
    const parentDiv = document.createElement("div");
    parentDiv.className = "legend-category";

    // Expand/collapse arrow
    const arrow = document.createElement("span");
    arrow.innerHTML = "&#9654;"; // right-pointing arrow
    arrow.style.cursor = "pointer";
    arrow.style.marginRight = "5px";

    // Parent label with icon
    const label = document.createElement("span");
    label.innerHTML = `<i class="${catInfo.icon}" style="color:#333; margin-right:5px;"></i> ${catName}`;
    label.style.cursor = "pointer";

    // Content div for types (collapsed by default)
    const contentDiv = document.createElement("div");
    contentDiv.style.display = "none";
    contentDiv.style.marginLeft = "20px";
    contentDiv.style.marginTop = "2px";

    // Add checkboxes for each type in category
    catInfo.types.forEach(type=>{
      const typeDiv = document.createElement("div");
      typeDiv.innerHTML = `
        <label>
          <input type="checkbox" checked onchange="toggleSiteType('${type}',this)">
          ${type}
        </label>
      `;
      contentDiv.appendChild(typeDiv);
    });

    // Arrow click toggles content
    arrow.onclick = ()=>{
      if(contentDiv.style.display==="none"){
        contentDiv.style.display="block";
        arrow.innerHTML="&#9660;"; // down arrow
      } else {
        contentDiv.style.display="none";
        arrow.innerHTML="&#9654;"; // right arrow
      }
    };

    parentDiv.appendChild(arrow);
    parentDiv.appendChild(label);
    parentDiv.appendChild(contentDiv);

    container.appendChild(parentDiv);
  }

}

// ================= TOGGLE SITE TYPES =================

function toggleSiteType(type,checkbox){

 siteLayer.eachLayer(marker=>{

  if(marker.type===type){

   if(checkbox.checked){
    map.addLayer(marker);
   }else{
    map.removeLayer(marker);
   }

  }

 });

}

// ================= SITE INFO PANEL =================

function showSiteInfo(marker){

 let p = marker.props;

 map.setView(marker.getLatLng(),14);

 if(marker._icon){
  marker._icon.style.transform="scale(1.5)";
  marker._icon.style.transition="0.3s";
 }

 let info=document.getElementById("site-info");

 if(!info){

  info=document.createElement("div");

  info.id="site-info";

  info.style=`
  position:absolute;
  right:10px;
  top:10px;
  background:white;
  padding:10px;
  width:250px;
  z-index:1000;
  border-radius:5px;
  `;

  document.body.appendChild(info);

 }

 info.innerHTML=`
 <h3>${p.Name || "Tourist Site"}</h3>
 <p><b>Woreda:</b> ${p.Woreda_Nam || "Unknown"}</p>
 <p><b>Distance to road:</b> ${(p.NEAR_DIST/1000).toFixed(2)} km</p>
 <p><b>Type:</b> ${p.Attra_Type || "Unknown"}</p>
 <p><b>Description:</b> ${p.Description || "No description available"}</p>
 <button onclick="document.getElementById('site-info').remove()">Close</button>
 `;

}

// ================= SEARCH =================

function searchTouristSite(query){

 if(!siteLayer) return;

 query=query.toLowerCase();

 siteLayer.eachLayer(marker=>{

  let name=(marker.props.Name || "").toLowerCase();

  if(name.includes(query)){
   map.setView(marker.getLatLng(),14);
   marker.openPopup();
  }

 });

}

// ================= LAYER TOGGLE =================

function toggleLayer(layer){

 if(layer==="wereda"){
  map.hasLayer(weredaLayer) ? map.removeLayer(weredaLayer) : map.addLayer(weredaLayer);
 }

 if(layer==="road"){
  map.hasLayer(roadLayer) ? map.removeLayer(roadLayer) : map.addLayer(roadLayer);
 }

 if(layer==="river"){
  map.hasLayer(riverLayer) ? map.removeLayer(riverLayer) : map.addLayer(riverLayer);
 }

 if(layer==="site"){
  map.hasLayer(siteLayer) ? map.removeLayer(siteLayer) : map.addLayer(siteLayer);
 }

}
