// === Global Variables ===
let map = L.map('map').setView([13.90, 37.50], 8);
let weredaLayer, roadLayer, siteLayer, riverLayer;

// === Base Map ===
/*
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
*/
// === Load GeoJSON function ===
function loadGeoJSON(url, options) {
  return fetch(url)
    .then(res => res.json())
    .then(data => L.geoJSON(data, options).addTo(map))
    .catch(err => console.error("Error loading " + url, err));
}

// === Road Colors and Dashed Style ===
const roadColors = {
  "Asphalt": "#e41a1c",
  "Gravel": "#ff7f00",
  "Earth": "#999999",
  "Asphalt UN Cons": "#4daf4a"
};

// === Load Roads ===
loadGeoJSON('map/road1.geojson', {
  style: function(feature) {
    const type = feature.properties?.TYPE || "Unknown";
    return {
      color: roadColors[type] || "#666",
      weight: 3,
      dashArray: type === "Asphalt UN Cons" ? "6,6" : null
    };
  },
  onEachFeature: function(feature, layer) {
    const name = feature.properties?.NAME || "Road";
    const type = feature.properties?.TYPE || "Unknown";
    layer.bindPopup(`<b>Road Name:</b> ${name}<br><b>Type:</b> ${type}`);
  }
}).then(layer => { roadLayer = layer; generateRoadLegend(); });

// === Tourist Sites Icons and Groups ===
const touristGroups = {
  'Historical': ['Historical', 'Palace', 'Archaeological'],
  'Religious': ['Church', 'Monastery'],
  'Natural': ['Natural Recreation'],
  'Unknown': ['Unknown']
};

const iconMap = {
  'Historical': 'fas fa-landmark',
  'Palace': 'fas fa-crown',
  'Archaeological': 'fas fa-archway',
  'Church': 'fas fa-cross',
  'Monastery': 'fas fa-church',
  'Natural Recreation': 'fas fa-tree',
  'Unknown': 'fas fa-map-marker-alt'
};

const colorMap = {
  'Historical': '#f44336',
  'Palace': '#9c27b0',
  'Archaeological': '#ff9800',
  'Church': '#009688',
  'Monastery': '#3f51b5',
  'Natural Recreation': '#4caf50',
  'Unknown': '#757575'
};

// === Load Tourist Sites ===
loadGeoJSON('map/siteF.geojson', {
  pointToLayer: function(feature, latlng) {
    const type = feature.properties.Attra_Type?.trim() || 'Unknown';
    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `<i class="${iconMap[type]}" style="color:${colorMap[type]}"></i>`,
      iconSize: [20,20]
    });
    return L.marker(latlng, {icon}).bindPopup(`<b>${feature.properties.Name}</b><br>${type}`);
  }
}).then(layer => { 
  siteLayer = layer;
  generateSiteLegend();
});

// === Generate Road Legend ===
function generateRoadLegend() {
  const container = document.getElementById("roadLegendItems");
  if (!container) return;
  Object.keys(roadColors).forEach(type => {
    const div = document.createElement('div');
    div.innerHTML = `<span class="legend-line" style="background:${roadColors[type]};${type==='Asphalt UN Cons'?'border-top:3px dashed green;':''}"></span> ${type}`;
    container.appendChild(div);
  });
}

// === Generate Tourist Site Legend ===
function generateSiteLegend() {
  const container = document.getElementById("siteLegendItems");
  if (!container) return;

  Object.keys(touristGroups).forEach(group => {
    const groupDiv = document.createElement('div');

    // Group header with toggle
    const header = document.createElement('div');
    header.className = 'legend-group-header';
    header.innerHTML = `<span>${group}</span><span>▶</span>`;
    groupDiv.appendChild(header);

    // Group items
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'legend-group-items';
    touristGroups[group].forEach(type => {
      const div = document.createElement('div');
      div.innerHTML = `<label><input type="checkbox" checked onchange="toggleSiteType('${type}')"> <i class="${iconMap[type]}" style="color:${colorMap[type]}"></i> ${type}</label>`;
      itemsDiv.appendChild(div);
    });
    groupDiv.appendChild(itemsDiv);

    // Click to expand/collapse
    header.addEventListener('click', () => {
      itemsDiv.classList.toggle('expanded');
      header.querySelector('span:last-child').textContent = itemsDiv.classList.contains('expanded') ? '▼' : '▶';
    });

    container.appendChild(groupDiv);
  });
}

// === Toggle Tourist Sites by Type ===
function toggleSiteType(type) {
  siteLayer.eachLayer(marker => {
    const markerType = marker.feature.properties.Attra_Type?.trim() || 'Unknown';
    if (markerType === type) {
      if (map.hasLayer(marker)) map.removeLayer(marker);
      else map.addLayer(marker);
    }
  });
}
