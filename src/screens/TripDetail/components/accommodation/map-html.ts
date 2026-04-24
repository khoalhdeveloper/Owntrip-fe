import { Accommodation } from '@/services/accommodationService';

interface PlaceMarker {
  name: string;
  latitude: number;
  longitude: number;
}

function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function estimateTime(km: number): string {
  const mins = Math.round((km / 30) * 60);
  if (mins < 1) return '1 min';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ''}`;
}

export function generateAccommodationMapHtml(
  hotel: Accommodation,
  places: PlaceMarker[],
  brand: string
): string {
  const hotelLat = hotel.address?.coordinates?.lat || 0;
  const hotelLng = hotel.address?.coordinates?.lng || 0;

  // Compute center from all points
  const allLats = [hotelLat, ...places.map((p) => p.latitude)];
  const allLngs = [hotelLng, ...places.map((p) => p.longitude)];
  const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
  const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;
  const zoomLevel = places.length > 0 ? 13 : 15;

  const esc = (s: string | undefined | null) => (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

  // Hotel marker
  const hotelMarkerJs = `
    var hotelIcon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div class="hotel-pin"><span>🏨</span></div>',
      iconSize: [44, 52], iconAnchor: [22, 52], popupAnchor: [0, -52]
    });
    var hotelMarker = L.marker([${hotelLat}, ${hotelLng}], {icon: hotelIcon, zIndexOffset: 500}).addTo(map)
      .bindPopup('<div class="popup-content"><strong>${esc(hotel.name)}</strong><p>⭐ ${hotel.rating || 0} · ${(hotel.tags && hotel.tags[0]) || ''}</p><p>📍 ${esc(hotel.address?.fullAddress || '')}</p></div>', {className: 'branded-popup'})
      .openPopup();
    hotelMarker.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'hotelTap'}));
    });
  `;

  // Place markers
  const placeMarkersJs = places
    .map((p, idx) => {
      const dist = haversineDistance(hotelLat, hotelLng, p.latitude, p.longitude);
      const time = estimateTime(dist);
      return `
      var placeIcon${idx} = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="place-pin"><span class="place-num">${idx + 1}</span></div>',
        iconSize: [32, 44], iconAnchor: [16, 44], popupAnchor: [0, -44]
      });
      markers[${idx}] = L.marker([${p.latitude}, ${p.longitude}], {icon: placeIcon${idx}}).addTo(map)
        .bindPopup('<div class="popup-content"><strong>${esc(p.name)}</strong><p>📍 ${formatDist(dist)} from hotel · ${time}</p></div>', {className: 'branded-popup'});
      markers[${idx}].on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'placeTap', index: ${idx}}));
        highlightMarker(${idx});
      });

      L.polyline([[${hotelLat}, ${hotelLng}], [${p.latitude}, ${p.longitude}]], {
        color: '${brand}', weight: 3, opacity: 0.15
      }).addTo(map);

      var dashed${idx} = L.polyline([[${hotelLat}, ${hotelLng}], [${p.latitude}, ${p.longitude}]], {
        color: '${brand}', weight: 2.5, opacity: 0.7, dashArray: '8 5', lineCap: 'round'
      }).addTo(map);

      L.marker([${(hotelLat + p.latitude) / 2}, ${(hotelLng + p.longitude) / 2}], {
        icon: L.divIcon({
          className: 'distance-label',
          html: '<div class="dist-badge">🚗 ${formatDist(dist)} · ${time}</div>',
          iconSize: [130, 28], iconAnchor: [65, 14]
        }), interactive: false
      }).addTo(map);
    `;
    })
    .join('\n');

  // Fit bounds JS
  const allCoordsStr = `[[${hotelLat},${hotelLng}]${places.map((p) => `,[${p.latitude},${p.longitude}]`).join('')}]`;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#map{width:100%;height:100%}

/* Controls */
.map-controls{position:absolute;bottom:14px;left:14px;z-index:1000;display:flex;flex-direction:column;gap:8px}
.map-btn{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.95);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform 0.15s ease}
.map-btn:active{transform:scale(0.92)}
.map-btn svg{width:18px;height:18px}
.map-btn.active{background:${brand};color:white}
.map-btn.active svg{stroke:white}

/* Watermark */
.brand-watermark{position:absolute;top:12px;left:12px;z-index:1000;background:rgba(255,255,255,0.92);border-radius:10px;padding:6px 12px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);font-size:13px;font-weight:700;color:#1A1A1A;border:1px solid rgba(0,0,0,0.04)}
.brand-dot{width:8px;height:8px;border-radius:50%;background:${brand}}

/* Hotel pin */
.custom-div-icon{background:none!important;border:none!important}
.hotel-pin{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#EF4444,#DC2626);border:3px solid #FFF;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(239,68,68,0.4);font-size:20px;transition:transform 0.2s ease}
.hotel-pin:hover{transform:scale(1.1)}

/* Place pin */
.place-pin{width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,${brand},${brand}dd);position:relative;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(74,124,255,0.4);transition:transform 0.2s ease;display:flex;align-items:center;justify-content:center}
.place-pin .place-num{transform:rotate(45deg);font-size:13px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.2);line-height:1}
.marker-active .place-pin{transform:rotate(-45deg) scale(1.25);box-shadow:0 4px 16px rgba(74,124,255,0.55)}

/* Popup */
.branded-popup .leaflet-popup-content-wrapper{background:rgba(255,255,255,0.97);border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.04)}
.branded-popup .leaflet-popup-tip{background:rgba(255,255,255,0.97)}
.branded-popup .leaflet-popup-content{margin:10px 14px;font-size:13px;line-height:1.4}
.popup-content strong{font-size:14px;color:#1A1A1A;display:block;margin-bottom:3px}
.popup-content p{color:#6B7280;margin:0;font-size:12px}

/* Distance badge */
.distance-label{background:none!important;border:none!important}
.dist-badge{background:rgba(255,255,255,0.92);border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;color:#374151;box-shadow:0 2px 8px rgba(0,0,0,0.1);white-space:nowrap;text-align:center;border:1px solid rgba(0,0,0,0.06)}

/* User location */
.user-location-marker{width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 0 0 4px rgba(66,133,244,0.25),0 2px 6px rgba(0,0,0,0.2)}

/* Attribution */
.leaflet-control-attribution{background:rgba(255,255,255,0.7)!important;font-size:9px!important;border-radius:6px 0 0 0!important;padding:2px 6px!important}
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
  <button class="map-btn" id="fitAllBtn" onclick="fitAllBounds()">
    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
  </button>
</div>
<script>
var markers=[];var activeMarkerIdx=-1;var isSatellite=false;var userLocMarker=null;
var map=L.map('map',{zoomControl:false}).setView([${centerLat},${centerLng}],${zoomLevel});
var osmLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19});
var satLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:19});
osmLayer.addTo(map);

function toggleLayer(){var btn=document.getElementById('layerToggle');if(isSatellite){map.removeLayer(satLayer);osmLayer.addTo(map);btn.classList.remove('active')}else{map.removeLayer(osmLayer);satLayer.addTo(map);btn.classList.add('active')}isSatellite=!isSatellite}
function highlightMarker(idx){markers.forEach(function(m){var el=m.getElement();if(el)el.classList.remove('marker-active')});if(markers[idx]){var el=markers[idx].getElement();if(el)el.classList.add('marker-active');activeMarkerIdx=idx}}
function focusMarker(idx){if(markers[idx]){map.flyTo(markers[idx].getLatLng(),16,{duration:0.8});markers[idx].openPopup();highlightMarker(idx)}}
function fitAllBounds(){var allPts=${allCoordsStr};if(allPts.length>1){map.fitBounds(allPts,{padding:[50,50],animate:true})}else if(allPts.length===1){map.flyTo(allPts[0],15)}}
function requestMyLocation(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'requestLocation'}))}
function showUserLocation(lat,lng){if(userLocMarker){map.removeLayer(userLocMarker)}var icon=L.divIcon({className:'',html:'<div class="user-location-marker"></div>',iconSize:[16,16],iconAnchor:[8,8]});userLocMarker=L.marker([lat,lng],{icon:icon,zIndexOffset:1000}).addTo(map);map.flyTo([lat,lng],15,{duration:1})}

${hotelMarkerJs}
${placeMarkersJs}

// Fit all on load
var allPoints=${allCoordsStr};
if(allPoints.length>1){map.fitBounds(allPoints,{padding:[50,50]})}
</script>
</body></html>`;
}
