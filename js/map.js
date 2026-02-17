// === Global Variables ===
let map = L.map('map').setView([14.123, 38.724], 10);
let weredaLayer, roadLayer, siteLayer;

// === Base Map ===
/*
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">Carto</a> contributors'
}).addTo(map);
*/
//attraction site awsome6 icons
function createTouristIcon(iconClass, bgColor) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="icon-wrapper" style="background-color:${bgColor};">
        <i class="${iconClass}" style="color:white;"></i>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

const attractionIcons = {
  'Historical': createTouristIcon('fas fa-landmark', '#f44336'),
  'Monastery': createTouristIcon('fas fa-church', '#3f51b5'),
  'Church': createTouristIcon('fas fa-cross', '#009688'),
  'Archaeological': createTouristIcon('fas fa-archway', '#ff9800'),
  'Palace': createTouristIcon('fas fa-crown', '#9c27b0'),
  'Natural Recreation': createTouristIcon('fas fa-tree', '#4caf50'),
  'Unknown': createTouristIcon('fas fa-map-marker-alt', '#9e9e9e')
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
fetch('map/tourist_wereda.geojson')
  .then(res => res.json())
  .then(data => {
    weredaLayer = L.geoJSON(data, {
      style: function (feature) {
        const color = getColorForWereda(feature.properties.WEREDA);
        return {
          color: '#333',
          weight: 1,
          fillColor: color,
          fillOpacity: 0.6
        };
      }
    }).addTo(map);

    const bounds = weredaLayer.getBounds();
    map.fitBounds(bounds);
    map.setMaxBounds(bounds);
    map.setMinZoom(map.getZoom());
  });

// === Road Layer ===
loadGeoJSON('map/tourist_road.geojson', {
  style: function (feature) {
    const colors = {
      trunk: '#e41a1c',
      primary: '#377eb8',
      secondary: '#4daf4a',
      tertiary: '#984ea3',
      residential: '#ff7f00'
    };
    return {
      color: colors[feature.properties.fclass] || '#999',
      weight: 2
    };
  }
}).then(layer => {
  roadLayer = layer;
});

// === Tourist Site Layer ===
loadGeoJSON('map/attractionsite.geojson', {
  pointToLayer: function (feature, latlng) {
    const name = feature.properties.Name || 'Tourist Site';
    const distance = feature.properties.NEAR_DIST;
    const distanceKm = (distance / 1000).toFixed(2);
    const type = feature.properties.Attra_Type ? feature.properties.Attra_Type.trim() : 'Unknown';

    // Matching legend icon & color
    const iconMap = {
      'Historical': { icon: 'fas fa-landmark', color: '#f44336' },
      'Monastery': { icon: 'fas fa-church', color: '#3f51b5' },
      'Church': { icon: 'fas fa-cross', color: '#009688' },
      'Archaeological': { icon: 'fas fa-archway', color: '#ff9800' },
      'Palace': { icon: 'fas fa-crown', color: '#9c27b0' },
      'Natural Recreation': { icon: 'fas fa-tree', color: '#4caf50' },
      'Unknown': { icon: 'fas fa-map-marker-alt', color: '#757575' }
    };

    const iconInfo = iconMap[type] || iconMap.Unknown;

    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="icon-wrapper" style="background-color:${iconInfo.color}">
          <i class="${iconInfo.icon}" style="color:white;"></i>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });

    const marker = L.marker(latlng, { icon: icon }).bindTooltip(
      `${name}<br>Distance: ${distanceKm} km<br>Type: ${type}`,
      {
        permanent: false,
        direction: 'top',
        className: 'site-label'
      }
    );

    marker.on('click', () => showSiteInfo(feature.properties));
    return marker;
  }
}).then(layer => {
  siteLayer = layer;
});


// === Get Color For Wereda ===
function getColorForWereda(name) {
  const colors = [
    '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
    '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
    '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854'
  ];
  let index = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

// === Interactive Legend ===
const legend = L.control({ position: 'topright' });
legend.onAdd = function (map) {
  const div = L.DomUtil.create('div', 'custom-legend collapsible');
  div.innerHTML = `
    <div class="legend-header" onclick="this.parentElement.classList.toggle('collapsed')">
      <h4>Map Legend</h4>
    </div>
    <div class="legend-content">
      <div class="legend-section" onmouseover="highlightLayer('wereda')" onmouseout="resetHighlight('wereda')">
        <label><input type="checkbox" checked onchange="toggleLayer('wereda')"> Wereda Boundaries</label><br>
        <span class="legend-box" style="background:#a6d854;"></span> Example Wereda
      </div>

      <div class="legend-section" onmouseover="highlightLayer('road')" onmouseout="resetHighlight('road')">
        <label><input type="checkbox" checked onchange="toggleLayer('road')"> Roads</label><br>
        <span class="legend-line" style="background:#e41a1c;"></span> Trunk<br>
        <span class="legend-line" style="background:#377eb8;"></span> Primary<br>
        <span class="legend-line" style="background:#4daf4a;"></span> Secondary<br>
        <span class="legend-line" style="background:#984ea3;"></span> Tertiary<br>
        <span class="legend-line" style="background:#ff7f00;"></span> Residential
      </div>

    <div class="legend-section" onmouseover="highlightLayer('site')" onmouseout="resetHighlight('site')">
      <label><input type="checkbox" checked onchange="toggleLayer('site')"> Tourist Sites</label><br>
      <div class="legend-item"><span class="legend-icon" style="background:#f44336"><i class="fas fa-landmark"></i></span> Historical</div>
      <div class="legend-item"><span class="legend-icon" style="background:#3f51b5"><i class="fas fa-church"></i></span> Monastry</div>
      <div class="legend-item"><span class="legend-icon" style="background:#009688"><i class="fas fa-cross"></i></span> Church</div>
      <div class="legend-item"><span class="legend-icon" style="background:#ff9800"><i class="fas fa-archway"></i></span> Archaeological</div>
      <div class="legend-item"><span class="legend-icon" style="background:#9c27b0"><i class="fas fa-crown"></i></span> Palace</div>
      <div class="legend-item"><span class="legend-icon" style="background:#4caf50"><i class="fas fa-tree"></i></span> Natural Recreation</div>
    </div>

      <button onclick="resetMapLayers()">Reset All</button>

      <div style="margin-top: 10px">
        <input type="text" id="siteSearch" placeholder="Search Tourist Site..." onkeyup="searchTouristSite(this.value)" autocomplete="off">
      <div id="suggestions" class="suggestions-list"></div>
</div>

    </div>
  `;
  return div;
};
legend.addTo(map);

// === Toggle & Highlight Functions ===
function toggleLayer(type) {
  if (type === 'wereda') {
    if (map.hasLayer(weredaLayer)) map.removeLayer(weredaLayer);
    else map.addLayer(weredaLayer);
  }
  if (type === 'road') {
    if (map.hasLayer(roadLayer)) map.removeLayer(roadLayer);
    else map.addLayer(roadLayer);
  }
  if (type === 'site') {
    if (map.hasLayer(siteLayer)) map.removeLayer(siteLayer);
    else map.addLayer(siteLayer);
  }
}

function highlightLayer(type) {
  if (type === 'wereda' && weredaLayer) weredaLayer.setStyle({ weight: 3, color: '#000' });
  if (type === 'road' && roadLayer) roadLayer.setStyle({ weight: 3 });
  if (type === 'site' && siteLayer) siteLayer.eachLayer(l => l.setStyle({ radius: 8 }));
}

function resetHighlight(type) {
  if (type === 'wereda' && weredaLayer) weredaLayer.setStyle(f => ({
    color: '#333',
    weight: 1,
    fillColor: getColorForWereda(f.properties.WEREDA),
    fillOpacity: 0.6
  }));
  if (type === 'road' && roadLayer) roadLayer.setStyle(f => ({
    color: {
      trunk: '#e41a1c', primary: '#377eb8', secondary: '#4daf4a', tertiary: '#984ea3', residential: '#ff7f00'
    }[f.properties.fclass] || '#999',
    weight: 2
  }));
  if (type === 'site' && siteLayer) siteLayer.eachLayer(l => l.setStyle({ radius: 6 }));
}

function resetMapLayers() {
  if (!map.hasLayer(weredaLayer)) map.addLayer(weredaLayer);
  if (!map.hasLayer(roadLayer)) map.addLayer(roadLayer);
  if (!map.hasLayer(siteLayer)) map.addLayer(siteLayer);
  resetHighlight('wereda');
  resetHighlight('road');
  resetHighlight('site');
}

function searchTouristSite(query) {
  if (!siteLayer) return;
  query = query.trim().toLowerCase();
  const suggestionsDiv = document.getElementById('suggestions');
  suggestionsDiv.innerHTML = '';
  let matches = [];

  siteLayer.eachLayer(marker => {
    const props = marker.feature.properties;
    const name = (props.Name || '').toLowerCase();

    if (name.includes(query) && query !== '') {
      matches.push({ name: props.Name, marker: marker });
    }

    // Reset all markers
    if (marker._icon) {
      marker._icon.style.transform = 'scale(1)';
      marker._icon.style.zIndex = '';
    }
  });

  if (matches.length > 0) {
    suggestionsDiv.style.display = 'block';

    matches.forEach(item => {
      const div = document.createElement('div');
      div.textContent = item.name;
      div.onclick = () => {
        // Zoom and highlight the selected site
        map.setView(item.marker.getLatLng(), 14);
        item.marker.openTooltip();

        // Zoom-in effect
        item.marker._icon.style.transform = 'scale(1.5)';
        item.marker._icon.style.transition = 'transform 0.3s ease';
        item.marker._icon.style.zIndex = 1000;

        // Hide suggestions
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.style.display = 'none';
        document.getElementById('siteSearch').value = item.name;
      };
      suggestionsDiv.appendChild(div);
    });
  } else {
    suggestionsDiv.style.display = 'none';
  }
}




// === Side Panel for Tourist Site Info ===
function showSiteInfo(props) {
  let info = document.getElementById('site-info');
  if (!info) {
    info = document.createElement('div');
    info.id = 'site-info';
    info.className = 'site-info-panel';
    document.body.appendChild(info);
  }
  info.innerHTML = `
    <h3>${props.Name || 'Tourist Site'}</h3>
    <p><strong>Woreda:</strong> ${props.Woreda_Nam || 'Unknown'}</p>
    <p><strong>Distance to Nearest Road:</strong> ${(props.NEAR_DIST / 1000).toFixed(2)} km</p>
    <p><strong>Attraction Type:</strong> ${props.Attra_Type || 'Unknown'}</p>
    <p><strong>Description:</strong> ${props.Description || 'No description available.'}</p>
    <button onclick="document.getElementById('site-info').remove()">Close</button>
  `;
  info.style.display = 'block';
}
