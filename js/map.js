// === Global Variables ===
let map = L.map('map').setView([13.90, 37.50], 8);
let weredaLayer, roadLayer, siteLayer, riverLayer;

// === Base Map ===
/*
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">Carto</a> contributors'
}).addTo(map);
*/
// === Road Colors & Styles ===
const roadColors = {
  "Asphalt": "#e41a1c",
  "Gravel": "#ff7f00",
  "Earth": "#999999",
  "Asphalt UN Cons": "#4daf4a"
};

// === Load GeoJSON Function ===
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
loadGeoJSON('map/wereda1.geojson', {
  style: feature => {
    const zoneName = feature.properties.ZONE_ || feature.properties.Zone || feature.properties.NAME || "Unknown";
    return { color: "#333", weight: 1, fillColor: getColorForWereda(zoneName), fillOpacity: 0.6 };
  },
  onEachFeature: (feature, layer) => {
    const zoneName = feature.properties.ZONE_ || feature.properties.Zone || feature.properties.NAME || "Unknown";
    layer.bindPopup(`<b>Zone:</b> ${zoneName}`);
    layer.bindTooltip(zoneName, { permanent: false, direction: "center", className: "wereda-label" });
  }
}).then(layer => { weredaLayer = layer; map.fitBounds(layer.getBounds()); });

// === Road Layer ===
loadGeoJSON('map/road1.geojson', {
  style: feature => {
    const type = feature.properties.TYPE || "Unknown";
    return {
      color: roadColors[type] || "#666",
      weight: 3,
      dashArray: type === "Asphalt UN Cons" ? "6,6" : null
    };
  },
  onEachFeature: (feature, layer) => {
    const name = feature.properties.NAME || "Road";
    const type = feature.properties.TYPE || "Unknown";
    layer.bindPopup(`<b>Road Name:</b> ${name}<br><b>Road Type:</b> ${type}`);
  }
}).then(layer => {
  roadLayer = layer;
  generateRoadLegend();
});

// === River Layer ===
loadGeoJSON('map/river1.geojson', {
  style: { color: '#0077be', weight: 2.5, opacity: 0.8 },
  onEachFeature: (feature, layer) => {
    const name = feature.properties?.River_Name || "Unnamed River";
    layer.bindPopup(`<b>River:</b> ${name}`);
    layer.bindTooltip(name, { sticky: true });
  }
}).then(layer => { riverLayer = layer; });

// === Tourist Site Layer ===
const siteIconMap = {
  'Historical': { icon: 'fas fa-landmark', color: '#f44336', group: 'Historical' },
  'Monastery': { icon: 'fas fa-church', color: '#3f51b5', group: 'Religious' },
  'Church': { icon: 'fas fa-cross', color: '#009688', group: 'Religious' },
  'Archaeological': { icon: 'fas fa-archway', color: '#ff9800', group: 'Historical' },
  'Palace': { icon: 'fas fa-crown', color: '#9c27b0', group: 'Historical' },
  'Natural Recreation': { icon: 'fas fa-tree', color: '#4caf50', group: 'Nature' },
  'Unknown': { icon: 'fas fa-map-marker-alt', color: '#757575', group: 'Unknown' }
};

loadGeoJSON('map/siteF.geojson', {
  pointToLayer: (feature, latlng) => {
    const type = (feature.properties.Attra_Type || 'Unknown').trim();
    const iconInfo = siteIconMap[type] || siteIconMap.Unknown;
    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="icon-wrapper" style="background-color:${iconInfo.color}">
               <i class="${iconInfo.icon}" style="color:white;"></i>
             </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });
    const marker = L.marker(latlng, { icon: icon }).bindTooltip(`${feature.properties.Name || 'Site'}<br>Type: ${type}`, { permanent: false, direction: 'top', className: 'site-label' });
    marker.on('click', () => showSiteInfo(feature.properties));
    return marker;
  }
}).then(layer => {
  siteLayer = layer;
  generateSiteLegend();
});

// === Functions ===
function getColorForWereda(name) {
  const colors = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf','#999','#66c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854'];
  return colors[name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % colors.length];
}

// === Road Legend ===
function generateRoadLegend() {
  const container = document.getElementById("roadLegendItems");
  container.innerHTML = '';
  Object.keys(roadColors).forEach(type => {
    const div = document.createElement("div");
    div.innerHTML = `<span class="legend-line" style="background:${roadColors[type]}; height:3px; display:inline-block; ${type==="Asphalt UN Cons" ? "border-top:2px dashed #000" : ""}"></span> ${type}`;
    container.appendChild(div);
  });
}

// === Site Legend ===
function generateSiteLegend() {
  const container = document.getElementById("siteLegendItems");
  container.innerHTML = '';
  const groups = {};

  siteLayer.eachLayer(marker => {
    const type = (marker.feature.properties.Attra_Type || 'Unknown').trim();
    const info = siteIconMap[type] || siteIconMap.Unknown;
    if (!groups[info.group]) groups[info.group] = new Set();
    groups[info.group].add(type);
  });

  for (const groupName in groups) {
    const groupDiv = document.createElement("div");
    groupDiv.className = 'legend-group';
    const header = document.createElement("div");
    header.className = 'legend-group-header';
    header.innerHTML = `<i class="fas fa-chevron-right" style="margin-right:5px;"></i>${groupName}`;
    header.onclick = () => {
      const icon = header.querySelector('i');
      icon.classList.toggle('fa-chevron-down');
      icon.classList.toggle('fa-chevron-right');
      itemsDiv.style.display = itemsDiv.style.display === 'none' ? 'block' : 'none';
    };
    const itemsDiv = document.createElement("div");
    itemsDiv.className = 'legend-group-items';
    itemsDiv.style.display = 'none';
    groups[groupName].forEach(type => {
      const info = siteIconMap[type] || siteIconMap.Unknown;
      const item = document.createElement("div");
      item.innerHTML = `<label><input type="checkbox" checked onchange="toggleSiteType('${type}')">
                        <i class="${info.icon}" style="color:${info.color}; margin-right:5px;"></i> ${type}</label>`;
      itemsDiv.appendChild(item);
    });
    groupDiv.appendChild(header);
    groupDiv.appendChild(itemsDiv);
    container.appendChild(groupDiv);
  }
}

// === Toggle Site Type ===
function toggleSiteType(type) {
  siteLayer.eachLayer(marker => {
    const markerType = (marker.feature.properties.Attra_Type || 'Unknown').trim();
    if (markerType === type) {
      if (map.hasLayer(marker)) map.removeLayer(marker);
      else map.addLayer(marker);
    }
  });
}

// === Toggle Layers ===
function toggleLayer(type) {
  if (type==='wereda') map.hasLayer(weredaLayer)? map.removeLayer(weredaLayer): map.addLayer(weredaLayer);
  if (type==='road') map.hasLayer(roadLayer)? map.removeLayer(roadLayer): map.addLayer(roadLayer);
  if (type==='site') map.hasLayer(siteLayer)? map.removeLayer(siteLayer): map.addLayer(siteLayer);
  if (type==='river') map.hasLayer(riverLayer)? map.removeLayer(riverLayer): map.addLayer(riverLayer);
}

// === Site Info Panel ===
function showSiteInfo(props) {
  let info = document.getElementById('site-info');
  if (!info) { info = document.createElement('div'); info.id='site-info'; info.className='site-info-panel'; document.body.appendChild(info); }
  info.innerHTML = `<h3>${props.Name || 'Tourist Site'}</h3>
                    <p><strong>Woreda:</strong> ${props.Woreda_Nam || 'Unknown'}</p>
                    <p><strong>Distance to Nearest Road:</strong> ${(props.NEAR_DIST/1000).toFixed(2)} km</p>
                    <p><strong>Attraction Type:</strong> ${props.Attra_Type || 'Unknown'}</p>
                    <p><strong>Description:</strong> ${props.Description || 'No description available.'}</p>
                    <button onclick="document.getElementById('site-info').remove()">Close</button>`;
  info.style.display = 'block';
}
