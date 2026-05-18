import { TimelineEntry, getDayColor } from './types';

// ═══════════════════════════════════════════════════════
// LEAFLET HTML GENERATOR (MAPBOX RASTER TILES FALLBACK)
// ═══════════════════════════════════════════════════════
export function generateMapHtml(
  timeline: TimelineEntry[],
  brand: string,
  accessToken: string,
  tilesKey: string,
  uniqueDates: string[],
  routeSegments: { coords: [number, number][], color: string }[] = [],
): string {
  let centerLat = 15.8794;
  let centerLng = 108.335;
  const zoomLevel = 13;
  if (timeline.length > 0) {
    const lats = timeline.map((e) => e.latitude);
    const lngs = timeline.map((e) => e.longitude);
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  }

  const esc = (s: string) => s.replace(/'/g, "\\'").replace(/"/g, '&quot;');

  const markersData = timeline.map((m, idx) => ({
    lng: m.longitude,
    lat: m.latitude,
    name: esc(m.name),
    photo: m.photo || '',
    rating: m.rating || 0,
    totalReviews: m.totalReviews || 0,
    address: esc(m.address || ''),
    memory: esc(m.mockMemory || ''),
    color: getDayColor(m.dayDate, uniqueDates)
  }));

  const leafletRouteSegments = routeSegments.map(seg => ({
    color: seg.color,
    coords: seg.coords.map(c => [c[1], c[0]]) // Leaflet uses [lat, lng], Goong API uses [lng, lat]
  }));

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#map{width:100%;height:100%;background:#E5E5E5}
.leaflet-control-container .leaflet-top.leaflet-left{display:none}
.leaflet-control-attribution{display:none!important}
.map-controls{position:absolute;bottom:24px;right:14px;z-index:1000;display:flex;flex-direction:column;gap:8px}
.map-btn{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.95);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform 0.15s ease}
.map-btn:active{transform:scale(0.92)}
.map-btn svg{width:18px;height:18px}
.map-btn.active{background:${brand};color:white}
.map-btn.active svg{stroke:white}
.custom-div-icon{background:none;border:none}
.marker-pin{width:32px;height:32px;border-radius:50% 50% 50% 0;position:relative;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.25);transition:transform 0.2s ease,box-shadow 0.2s ease;display:flex;align-items:center;justify-content:center}
.marker-pin .marker-num{transform:rotate(45deg);font-size:13px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.2);line-height:1}
.marker-active .marker-pin{transform:rotate(-45deg) scale(1.25);box-shadow:0 4px 16px rgba(0,0,0,0.4);border-color:#FFF;background:#222!important}
.leaflet-popup-content-wrapper{background:rgba(255,255,255,0.97)!important;border-radius:14px!important;box-shadow:0 4px 20px rgba(0,0,0,0.12)!important;border:1px solid rgba(0,0,0,0.04)!important;padding:0!important;overflow:hidden}
.leaflet-popup-content{margin:0!important;padding:12px 14px!important;width:240px!important}
.leaflet-popup-tip{box-shadow:0 4px 20px rgba(0,0,0,0.12)!important}
.popup-img{width:100%;height:80px;object-fit:cover;border-radius:10px;margin-bottom:8px}
.popup-content strong{font-size:14px;color:#1A1A1A;display:block;margin-bottom:4px;font-weight:700}
.popup-rating{font-size:12px;color:#F59E0B;margin-bottom:4px;display:flex;align-items:center;gap:3px;font-weight:600}
.popup-rating .star{color:#F59E0B}
.popup-rating .reviews{color:#9CA3AF;font-weight:400;margin-left:2px}
.popup-address{color:#6B7280;font-size:11px;margin-bottom:6px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.popup-memory{color:#4B5563;margin:0;font-size:12px;font-style:italic;border-top:1px solid #F3F4F6;padding-top:6px}
.brand-watermark{position:absolute;top:12px;left:12px;z-index:1000;background:rgba(255,255,255,0.92);border-radius:10px;padding:6px 12px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);font-size:13px;font-weight:700;color:#1A1A1A;border:1px solid rgba(0,0,0,0.04)}
.brand-dot{width:8px;height:8px;border-radius:50%;background:${brand}}
.user-location-marker{width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 0 0 4px rgba(66,133,244,0.25),0 2px 6px rgba(0,0,0,0.2)}
</style>
</head>
<body>
<div id="map"></div>
<div class="brand-watermark"><div class="brand-dot"></div>OwnTrip</div>
<div class="map-controls">
  <button class="map-btn" id="layerToggle" onclick="toggleLayer()">
    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
  </button>
  <button class="map-btn" id="myLocationBtn" onclick="requestMyLocation()">
    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path></svg>
  </button>
</div>
<script>
var mapboxToken = '${accessToken || ['pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NDg1bTAwM2kyeW55MGptNHdzcXcifQ', 'hJ3LrlZq125XZeg2Crl9wA'].join('.')}';
var streetsUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + mapboxToken;
var satelliteUrl = 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + mapboxToken;

var map = L.map('map', {zoomControl: false}).setView([${centerLat}, ${centerLng}], ${zoomLevel});
var currentLayer = L.tileLayer(streetsUrl, {maxZoom: 19}).addTo(map);

var isSatellite = false;
var markers = [];
var activeMarkerIdx = -1;
var userMarker = null;

// Route paths
var routeSegments = ${JSON.stringify(leafletRouteSegments)};
var allCoords = [];
if (routeSegments.length > 0) {
  routeSegments.forEach(function(segment) {
    L.polyline(segment.coords, {color: segment.color, weight: 7, opacity: 0.15, lineCap: 'round', lineJoin: 'round'}).addTo(map);
    L.polyline(segment.coords, {color: segment.color, weight: 3.5, opacity: 0.85, dashArray: '6, 6', lineCap: 'round', lineJoin: 'round'}).addTo(map);
    allCoords.push(...segment.coords);
  });
  map.fitBounds(L.polyline(allCoords).getBounds(), {padding: [50, 50]});
}

// Markers
var markersData = ${JSON.stringify(markersData)};
markersData.forEach(function(data, idx) {
  var iconHtml = '<div class="marker-pin" id="pin-' + idx + '" style="background:' + data.color + '"><span class="marker-num">' + (idx + 1) + '</span></div>';
  var icon = L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  var popupHtml = '<div class="popup-content">' +
    (data.photo ? '<img src="' + data.photo + '" class="popup-img" />' : '') +
    '<strong>' + data.name + '</strong>' +
    (data.rating ? '<div class="popup-rating"><span class="star">★</span> ' + data.rating.toFixed(1) + (data.totalReviews ? ' <span class="reviews">(' + data.totalReviews + ')</span>' : '') + '</div>' : '') +
    (data.address ? '<div class="popup-address">' + data.address + '</div>' : '') +
    '<p class="popup-memory">' + data.memory + '</p>' +
    '</div>';

  var marker = L.marker([data.lat, data.lng], {icon: icon})
    .bindPopup(popupHtml, {closeButton: false})
    .addTo(map);

  marker.on('click', function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'markerTap', index: idx}));
    highlightMarker(idx);
  });
  
  markers.push(marker);
});

function highlightMarker(idx) {
  if (activeMarkerIdx >= 0 && markersData[activeMarkerIdx]) {
    var oldPin = document.getElementById('pin-' + activeMarkerIdx);
    if (oldPin) oldPin.parentElement.classList.remove('marker-active');
  }
  var newPin = document.getElementById('pin-' + idx);
  if (newPin) newPin.parentElement.classList.add('marker-active');
  activeMarkerIdx = idx;
}

function focusMarker(idx) {
  if (markers[idx]) {
    map.flyTo(markers[idx].getLatLng(), 15.5, {duration: 0.8});
    markers[idx].openPopup();
    highlightMarker(idx);
  }
}

function fitAllBounds() {
  if (allCoords.length > 0) {
    map.flyToBounds(L.polyline(allCoords).getBounds(), {padding: [50, 50], duration: 1});
  }
}

function toggleLayer() {
  var btn = document.getElementById('layerToggle');
  map.removeLayer(currentLayer);
  if (isSatellite) {
    currentLayer = L.tileLayer(streetsUrl, {maxZoom: 19}).addTo(map);
    btn.classList.remove('active');
  } else {
    currentLayer = L.tileLayer(satelliteUrl, {maxZoom: 19}).addTo(map);
    btn.classList.add('active');
  }
  isSatellite = !isSatellite;
}

function requestMyLocation() {
  window.ReactNativeWebView.postMessage(JSON.stringify({type: 'requestLocation'}));
}

function showUserLocation(lat, lng) {
  if (userMarker) {
    map.removeLayer(userMarker);
  }
  var icon = L.divIcon({
    html: '<div class="user-location-marker"></div>',
    className: 'custom-div-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  userMarker = L.marker([lat, lng], {icon: icon}).addTo(map);
  map.flyTo([lat, lng], 15, {duration: 1});
}
</script>
</body>
</html>`;
}
