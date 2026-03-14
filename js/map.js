// === Global Variables ===
let map = L.map('map').setView([13.90, 37.50], 8);
let weredaLayer, roadLayer, siteLayer, riverLayer;

// === Base Map ===
/*
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">Carto</a> contributors'
}).addTo(map);
*/

// === Load GeoJSON Utility ===
function loadGeoJSON(url, options) {
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      const layer = L.geoJSON(data, options).addTo(map);
      return layer;
    })
    .catch(err => console.error("Error loading " + url, err));
}

// === Wereda Layer ===
fetch('map/wereda1.geojson')
  .then(res => res.json())
  .then(data => {
    weredaLayer = L.geoJSON(data, {
      style: f => ({
        color: '#333',
        weight: 1,
        fillColor: getColorForWereda(f.properties.ZONE_ || f.properties.Zone || f.properties.NAME),
        fillOpacity: 0.6
      }),
      onEachFeature: (feature, layer) => {
        const zoneName = feature.properties.ZONE_ || feature.properties.Zone || feature.properties.NAME || "Unknown";
        layer.bindPopup(`<b>Zone:</b> ${zoneName}`);
        layer.bindTooltip(zoneName, { permanent: false, direction: 'center', className: 'wereda-label' });
      }
    }).addTo(map);
    map.fitBounds(weredaLayer.getBounds());
  });

// === Road Layer ===
const roadColors = {
  "Asphalt": "#e41a1c",
  "Gravel": "#ff7f00",
  "Earth": "#999999",
  "Asphalt UN Cons": "#4daf4a"
};

loadGeoJSON('map/road1.geojson', {
  style: feature => {
    const type = feature.properties?.TYPE || "Unknown";
    return {
      color: roadColors[type] || "#666",
      weight: 3,
      dashArray: type === "Asphalt UN Cons" ? "6,6" : null
    };
  },
  onEachFeature: (feature, layer) => {
    layer.bindPopup(
      `<b>Road Name:</b> ${feature.properties.NAME || "Road"}<br>` +
      `<b>Road Type:</b> ${feature.properties.TYPE || "Unknown"}`
    );
  }
}).then(layer => {
  roadLayer = layer;
  generateRoadLegend();
});

// === River Layer ===
loadGeoJSON('map/river1.geojson', {
  style: { color: '#2a7fff', weight: 2.5, opacity: 0.8 },
  onEachFeature: (feature, layer) => {
    const name = feature.properties?.River_Name || "Unnamed River";
    layer.bindPopup(`<b>River:</b> ${name}`);
    layer.bindTooltip(name, { sticky: true });
  }
}).then(layer => { riverLayer = layer; });

// === Tourist Site Layer ===
const attractionIconGroups = {
  'Historical': ['Historical', 'Palace'],
  'Religious': ['Church', 'Monastery'],
  'Archaeological': ['Archaeological'],
  'Natural': ['Natural Recreation'],
  'Unknown': ['Unknown']
};

function createAttractionIcon(type) {
  const colors = {
    'Historical': '#f44336',
    'Religious': '#3f51b5',
    'Archaeological': '#ff9800',
    'Natural': '#4caf50',
    'Unknown': '#757575'
  };
  const icons = {
    'Historical': 'fas fa-landmark',
    'Religious': 'fas fa-church',
    'Archaeological': 'fas fa-archway',
    'Natural': 'fas fa-tree',
    'Unknown': 'fas fa-map-marker-alt'
  };
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="icon-wrapper" style="background-color:${colors[type]}"><i class="${icons[type]}" style="color:white;"></i></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

loadGeoJSON('map/siteF.geojson', {
  pointToLayer: (feature, latlng) => {
    const typeRaw = feature.properties.Attra_Type?.trim() || 'Unknown';
    let typeGroup = 'Unknown';
    for (let g in attractionIconGroups) {
      if (attractionIconGroups[g].includes(typeRaw)) {
        typeGroup = g; break;
      }
    }
    const icon = createAttractionIcon(typeGroup);
    const marker = L.marker(latlng, { icon: icon });
    marker.feature = feature; // store feature
    marker.typeGroup = typeGroup;
    marker.bindTooltip(`${feature.properties.Name || 'Tourist Site'}<br>Type: ${typeRaw}`, { permanent:false, direction:'top', className:'site-label' });
    marker.on('click', () => showSiteInfo(feature.properties));
    return marker;
  }
}).then(layer => {
  siteLayer = layer;
  generateSiteLegend();
});

// === Generate Road Legend ===
function generateRoadLegend() {
  const container = document.getElementById('roadLegendItems');
  container.innerHTML = '';
  Object.keys(roadColors).forEach(type => {
    const div = document.createElement('div');
    div.innerHTML = `<span class="legend-line" style="background:${roadColors[type]}${type==='Asphalt UN Cons'?';border-bottom:2px dashed #000':''}"></span> ${type}`;
    container.appendChild(div);
  });
}

// === Generate Tourist Site Legend ===
function generateSiteLegend() {
  const container = document.getElementById('siteLegendItems');
  container.innerHTML = '';
  for (let group in attractionIconGroups) {
    const div = document.createElement('div');
    div.className = 'legend-group';
    div.innerHTML = `
      <div class="legend-group-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
        <span class="legend-icon" style="background-color:${getGroupColor(group)}">
          <i class="${getGroupIcon(group)}" style="color:white"></i>
        </span> ${group}
      </div>
      <div class="legend-group-content collapsed">
        ${attractionIconGroups[group].map(type => `
          <label><input type="checkbox" checked onchange="toggleSiteType('${type}', this)"> ${type}</label>
        `).join('')}
      </div>
    `;
    container.appendChild(div);
  }
}

// === Toggle site types ===
function toggleSiteType(type, checkbox){
  siteLayer.eachLayer(marker => {
    const typeRaw = marker.feature.properties.Attra_Type?.trim() || 'Unknown';
    if(typeRaw === type){
      if(checkbox.checked) map.addLayer(marker);
      else map.removeLayer(marker);
    }
  });
}

// === Helpers for attraction group colors/icons ===
function getGroupColor(group){
  const colors = { 'Historical':'#f44336','Religious':'#3f51b5','Archaeological':'#ff9800','Natural':'#4caf50','Unknown':'#757575' };
  return colors[group] || '#757575';
}
function getGroupIcon(group){
  const icons = { 'Historical':'fas fa-landmark','Religious':'fas fa-church','Archaeological':'fas fa-archway','Natural':'fas fa-tree','Unknown':'fas fa-map-marker-alt' };
  return icons[group] || 'fas fa-map-marker-alt';
}

// === Get Color for Wereda ===
function getColorForWereda(name){
  const colors = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf','#999999','#66c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854'];
  let index = name.split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%colors.length;
  return colors[index];
}

// === Show Tourist Info ===
function showSiteInfo(props){
  let info = document.getElementById('site-info');
  if(!info){
    info = document.createElement('div');
    info.id = 'site-info';
    info.className = 'site-info-panel';
    document.body.appendChild(info);
  }
  info.innerHTML = `
    <h3>${props.Name || 'Tourist Site'}</h3>
    <p><strong>Woreda:</strong> ${props.Woreda_Nam || 'Unknown'}</p>
    <p><strong>Distance to Nearest Road:</strong> ${(props.NEAR_DIST/1000).toFixed(2)} km</p>
    <p><strong>Attraction Type:</strong> ${props.Attra_Type || 'Unknown'}</p>
    <p><strong>Description:</strong> ${props.Description || 'No description available.'}</p>
    <button onclick="document.getElementById('site-info').remove()">Close</button>
  `;
  info.style.display='block';
}
