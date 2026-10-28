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
// === Load Wereda Boundaries ===
fetch('map/wereda1.geojson')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    weredaLayer = L.geoJSON(data, {
      style: function () {
        return {
          color: '#38761d',
          weight: 2,
          opacity: 1,
          fillColor: '#a6d854',
          fillOpacity: 0.15
        };
      },
      onEachFeature: function (feature, layer) {
        const name =
          feature.properties?.WEREDA ||
          feature.properties?.WEREDA_NAME ||
          feature.properties?.NAME ||
          'Wereda';

        layer.bindPopup(`<b>Wereda:</b> ${name}`);
      }
    }).addTo(map);

    console.log(
      'Wereda boundaries loaded:',
      data.features ? data.features.length : 0
    );
  })
  .catch(error => {
    console.error('Error loading wereda1.geojson:', error);
  });
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

// === Tourist Site Symbology ===

const iconMap = {
  'Historical': 'fa-landmark',
  'Palace': 'fa-crown',
  'Archaeological': 'fa-archway',
  'Church': 'fa-cross',
  'Monastery': 'fa-church',
  'Natural Recreation': 'fa-tree',
  'Unknown': 'fa-map-marker-alt'
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

// Normalize category names to avoid spelling/capitalization problems
function normalizeSiteType(value) {
  const raw = String(value || '').trim().toLowerCase();

  const categories = {
    'historical': 'Historical',
    'historic': 'Historical',
    'palace': 'Palace',
    'archaeological': 'Archaeological',
    'archaeology': 'Archaeological',
    'church': 'Church',
    'churches': 'Church',
    'monastery': 'Monastery',
    'monasteries': 'Monastery',
    'natural recreation': 'Natural Recreation',
    'natural': 'Natural Recreation',
    'recreation': 'Natural Recreation'
  };

  return categories[raw] || 'Unknown';
}

// === Load All Tourist Sites ===
loadGeoJSON('map/siteF.geojson', {
  pointToLayer: function (feature, latlng) {
    const properties = feature.properties || {};

    const name =
      properties.Name ||
      properties.NAME ||
      properties.name ||
      'Tourist Site';

    const type = normalizeSiteType(properties.Attra_Type);

    const iconClass = iconMap[type] || iconMap['Unknown'];
    const iconColor = colorMap[type] || colorMap['Unknown'];

    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          background: ${iconColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="fas ${iconClass}"
             style="color:white;font-size:14px;"></i>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    return L.marker(latlng, { icon: icon })
      .bindPopup(
        `<b>${name}</b><br>` +
        `<b>Category:</b> ${type}`
      );
  },

  onEachFeature: function (feature, layer) {
    // Keep the original category available for debugging
    const properties = feature.properties || {};

    layer.feature = feature;

    if (!properties.Attra_Type) {
      console.warn(
        'Tourist site has no Attra_Type:',
        properties
      );
    }
  }
}).then(layer => {
  siteLayer = layer;

  // Report how many sites were loaded
  const counts = {};

  layer.eachLayer(marker => {
    const properties = marker.feature.properties || {};
    const type = normalizeSiteType(properties.Attra_Type);

    counts[type] = (counts[type] || 0) + 1;
  });

  console.log('Total tourist sites loaded:', layer.getLayers().length);
  console.table(counts);

  // Refresh the existing category legend
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
  if (!siteLayer) return;

  siteLayer.eachLayer(marker => {
    const properties = marker.feature?.properties || {};
    const markerType = normalizeSiteType(properties.Attra_Type);

    if (markerType === type) {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      } else {
        map.addLayer(marker);
      }
    }
  });
}
