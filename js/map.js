// === Global Variables ===
let map = L.map('map').setView([13.90, 37.50], 8);
let weredaLayer, roadLayer, siteLayer, riverLayer;

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
fetch('map/wereda1.geojson')
  .then(response => response.json())
  .then(data => {
    weredaLayer = L.geoJSON(data, {
      style: (f) => ({
        color: "#333",
        weight: 1,
        fillColor: getColorForWereda(f.properties.ZONE_ || f.properties.Zone || "Unknown"),
        fillOpacity: 0.6
      }),
      onEachFeature: (f, l) => {
        const name = f.properties.ZONE_ || f.properties.Zone || "Unknown";
        l.bindPopup("<b>Zone:</b> " + name);
      }
    }).addTo(map);
    map.fitBounds(weredaLayer.getBounds());
  });

// === Road Layer ===
loadGeoJSON('map/road1.geojson', {
  style: (f) => ({
    color: { Asphalt: '#e41a1c', Gravel: '#ff7f00' }[f.properties.TYPE] || '#999',
    weight: 3
  }),
  onEachFeature: (f, l) => {
    l.bindPopup(`<b>Road:</b> ${f.properties.NAME || "Road"}<br><b>Type:</b> ${f.properties.TYPE || "Unknown"}`);
  }
}).then(layer => { roadLayer = layer; });

// === River Layer ===
loadGeoJSON('map/river1.geojson', { 
  style: () => ({ color: '#2a7fff', weight: 2.5, opacity: 0.8 }),
  onEachFeature: (f, l) => {
    const name = f.properties.River_Name || "Unnamed River";
    l.bindPopup(`<b>River:</b> ${name}`);
    l.bindTooltip(name, { sticky: true });
  }
}).then(layer => { riverLayer = layer; });

// === Tourist Site Layer ===
loadGeoJSON('map/siteF.geojson', {
  pointToLayer: (feature, latlng) => {
    const type = feature.properties.Attra_Type ? feature.properties.Attra_Type.trim() : 'Unknown';
    const iconMap = {
      'Historical': '#f44336', 'Monastery': '#3f51b5', 'Church': '#009688',
      'Archaeological': '#ff9800', 'Palace': '#9c27b0', 'Natural Recreation': '#4caf50'
    };
    const color = iconMap[type] || '#757575';
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="icon-wrapper" style="background-color:${color}"><i class="fas fa-map-marker-alt" style="color:white;"></i></div>`,
        iconSize: [30, 30], iconAnchor: [15, 30]
      })
    });
    marker.on('click', () => showSiteInfo(feature.properties));
    return marker;
  }
}).then(layer => { siteLayer = layer; });

// === Helper Functions ===
function getColorForWereda(name) {
  const colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33'];
  let index = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

// === Toggle, Highlight & Reset Functions ===
function toggleLayer(type) {
  if (type === 'wereda' && weredaLayer) map.hasLayer(weredaLayer) ? map.removeLayer(weredaLayer) : map.addLayer(weredaLayer);
  if (type === 'road' && roadLayer) map.hasLayer(roadLayer) ? map.removeLayer(roadLayer) : map.addLayer(roadLayer);
  if (type === 'site' && siteLayer) map.hasLayer(siteLayer) ? map.removeLayer(siteLayer) : map.addLayer(siteLayer);
  if (type === 'river' && riverLayer) map.hasLayer(riverLayer) ? map.removeLayer(riverLayer) : map.addLayer(riverLayer);
}

function highlightLayer(type) {
  if (type === 'wereda' && weredaLayer) weredaLayer.setStyle({ weight: 3, color: '#000' });
  if (type === 'road' && roadLayer) roadLayer.setStyle({ weight: 5 });
  if (type === 'river' && riverLayer) riverLayer.setStyle({ weight: 5, color: '#0055ff' });
}

function resetHighlight(type) {
  if (type === 'wereda' && weredaLayer) weredaLayer.setStyle({ color: '#333', weight: 1 });
  if (type === 'road' && roadLayer) roadLayer.setStyle({ weight: 3 });
  if (type === 'river' && riverLayer) riverLayer.setStyle({ color: '#2a7fff', weight: 2.5 });
}

function resetMapLayers() {
  [weredaLayer, roadLayer, siteLayer, riverLayer].forEach(l => { if(l && !map.hasLayer(l)) map.addLayer(l); });
  resetHighlight('wereda'); resetHighlight('road'); resetHighlight('river');
}

// === Legend ===
const legend = L.control({ position: 'topright' });
legend.onAdd = function (map) {
  const div = L.DomUtil.create('div', 'custom-legend collapsible');
  div.innerHTML = `
    <div class="legend-header" onclick="this.parentElement.classList.toggle('collapsed')"><h4>Map Legend</h4></div>
    <div class="legend-content">
      <div class="legend-section" onmouseover="highlightLayer('wereda')" onmouseout="resetHighlight('wereda')">
        <label><input type="checkbox" checked onchange="toggleLayer('wereda')"> Weredas</label>
      </div>
      <div class="legend-section" onmouseover="highlightLayer('road')" onmouseout="resetHighlight('road')">
        <label><input type="checkbox" checked onchange="toggleLayer('road')"> Roads</label>
      </div>
      <div class="legend-section" onmouseover="highlightLayer('river')" onmouseout="resetHighlight('river')">
        <label><input type="checkbox" checked onchange="toggleLayer('river')"> Rivers</label><br>
        <span style="display:inline-block; width:30px; height:3px; background:#2a7fff;"></span>
      </div>
      <button onclick="resetMapLayers()">Reset All</button>
    </div>`;
  return div;
};
legend.addTo(map);

function showSiteInfo(props) {
  alert("Site: " + (props.Name || "Unknown")); // Placeholder for your side panel logic
}
