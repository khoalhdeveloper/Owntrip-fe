import { TimelineEntry } from './types';
import { haversineDistance, formatDistance, estimateTravelTime } from './helpers';

// ═══════════════════════════════════════
// MAP HTML GENERATOR
// ═══════════════════════════════════════
export function generateMapHtml(timeline: TimelineEntry[], brand: string): string {
  let centerLat = 15.8794;
  let centerLng = 108.3350;
  const zoomLevel = 13;
  if (timeline.length > 0) {
    const lats = timeline.map(e => e.latitude);
    const lngs = timeline.map(e => e.longitude);
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  }

  const esc = (s: string) => s.replace(/'/g, "\\'").replace(/"/g, '&quot;');

  const markersJs = timeline.map((m, idx) => {
    return `
      var icon${idx} = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="marker-pin"><span class="marker-num">${idx + 1}</span></div>',
        iconSize: [32, 44], iconAnchor: [16, 44], popupAnchor: [0, -44]
      });
      markers[${idx}] = L.marker([${m.latitude}, ${m.longitude}], {icon: icon${idx}}).addTo(map)
        .bindPopup('<div class="popup-content"><strong>${esc(m.name)}</strong><p>${esc(m.mockMemory)}</p></div>', {className: 'branded-popup'});
      markers[${idx}].on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerTap', index: ${idx}}));
        highlightMarker(${idx});
      });
    `;
  }).join('\n');

  const distanceLabelsJs = timeline.length > 1
    ? timeline.slice(0, -1).map((m, idx) => {
        const next = timeline[idx + 1];
        const dist = haversineDistance(m.latitude, m.longitude, next.latitude, next.longitude);
        const midLat = (m.latitude + next.latitude) / 2;
        const midLng = (m.longitude + next.longitude) / 2;
        return `
          L.marker([${midLat}, ${midLng}], {
            icon: L.divIcon({
              className: 'distance-label',
              html: '<div class="dist-badge">🚗 ${formatDistance(dist)} · ${estimateTravelTime(dist)}</div>',
              iconSize: [120, 28], iconAnchor: [60, 14]
            }), interactive: false
          }).addTo(map);
        `;
      }).join('\n')
    : '';

  const routeCoords = timeline.map(m => `[${m.latitude}, ${m.longitude}]`).join(',');
  const routeJs = timeline.length > 1
    ? `var latlngs = [${routeCoords}];
       L.polyline(latlngs, {color: '${brand}', weight: 8, opacity: 0.12}).addTo(map);
       var polyline = L.polyline(latlngs, {color: '${brand}', weight: 3.5, opacity: 0.85, dashArray: '8 5', lineCap: 'round'}).addTo(map);
       map.fitBounds(polyline.getBounds(), {padding: [50, 50]});`
    : '';

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
.map-controls{position:absolute;bottom:14px;left:14px;z-index:1000;display:flex;flex-direction:column;gap:8px}
.map-btn{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.95);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform 0.15s ease}
.map-btn:active{transform:scale(0.92)}
.map-btn svg{width:18px;height:18px}
.map-btn.active{background:${brand};color:white}
.map-btn.active svg{stroke:white}
.custom-div-icon{background:none!important;border:none!important}
.marker-pin{width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,${brand},${brand}dd);position:relative;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(74,124,255,0.4);transition:transform 0.2s ease;display:flex;align-items:center;justify-content:center}
.marker-pin .marker-num{transform:rotate(45deg);font-size:13px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.2);line-height:1}
.marker-active .marker-pin{transform:rotate(-45deg) scale(1.25);box-shadow:0 4px 16px rgba(74,124,255,0.55)}
.branded-popup .leaflet-popup-content-wrapper{background:rgba(255,255,255,0.97);border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.04)}
.branded-popup .leaflet-popup-tip{background:rgba(255,255,255,0.97)}
.branded-popup .leaflet-popup-content{margin:10px 14px;font-size:13px;line-height:1.4}
.popup-content strong{font-size:14px;color:#1A1A1A;display:block;margin-bottom:3px}
.popup-content p{color:#6B7280;margin:0;font-size:12px}
.distance-label{background:none!important;border:none!important}
.dist-badge{background:rgba(255,255,255,0.92);border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;color:#374151;box-shadow:0 2px 8px rgba(0,0,0,0.1);white-space:nowrap;text-align:center;border:1px solid rgba(0,0,0,0.06)}
.leaflet-control-attribution{background:rgba(255,255,255,0.7)!important;font-size:9px!important;border-radius:6px 0 0 0!important;padding:2px 6px!important}
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
var markers=[];var activeMarkerIdx=-1;var isSatellite=false;var userLocMarker=null;
var map=L.map('map',{zoomControl:false}).setView([${centerLat},${centerLng}],${zoomLevel});
var osmLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19});
var satLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:19});
osmLayer.addTo(map);
function toggleLayer(){var btn=document.getElementById('layerToggle');if(isSatellite){map.removeLayer(satLayer);osmLayer.addTo(map);btn.classList.remove('active')}else{map.removeLayer(osmLayer);satLayer.addTo(map);btn.classList.add('active')}isSatellite=!isSatellite}
function highlightMarker(idx){markers.forEach(function(m){var el=m.getElement();if(el)el.classList.remove('marker-active')});if(markers[idx]){var el=markers[idx].getElement();if(el)el.classList.add('marker-active');activeMarkerIdx=idx}}
function focusMarker(idx){if(markers[idx]){map.flyTo(markers[idx].getLatLng(),16,{duration:0.8});markers[idx].openPopup();highlightMarker(idx)}}
function fitAllBounds(){if(typeof polyline!=='undefined'){map.fitBounds(polyline.getBounds(),{padding:[50,50],animate:true})}}
function requestMyLocation(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'requestLocation'}))}
function showUserLocation(lat,lng){if(userLocMarker){map.removeLayer(userLocMarker)}var icon=L.divIcon({className:'',html:'<div class="user-location-marker"></div>',iconSize:[16,16],iconAnchor:[8,8]});userLocMarker=L.marker([lat,lng],{icon:icon,zIndexOffset:1000}).addTo(map);map.flyTo([lat,lng],15,{duration:1})}
${markersJs}
${routeJs}
${distanceLabelsJs}
</script>
</body>
</html>`;
}
