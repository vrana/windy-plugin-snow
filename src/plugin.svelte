Snow.cz
<script>
import broadcast from '@windy/broadcast';
import {map} from '@windy/map';
import {onDestroy} from 'svelte';

export const onopen = function () {
	const openInApp = document.getElementById('open-in-app');
	if (openInApp) {
		openInApp.style.display = 'none';
	}
	init();
}

onDestroy(() => {
	Object.values(markers).forEach(marker => marker.remove());
	broadcast.off('redrawFinished', redraw);
});

/** @typedef {{
 *   url: string,
 *   name: string,
 *   slopes_km: number,
 *   open_pct: ?number,
 *   snow_cm: number,
 *   lat: number,
 *   lng: number,
 *   webcam: ?string,
 * }} */
let Site;
/** @type {Array<Site>} */
let sites = [];
/** @type {Object<string, L.Marker>} key: url */
const markers = {};
/** @type {?L.Marker} */
let activeMarker = null;

function init() {
	broadcast.on('redrawFinished', redraw);
	if (Object.keys(sites).length) {
		// Opening already loaded layer.
		return;
	}
	fetch('https://www.vrana.cz/snow/strediska.php').then(response => response.json()).then(response => {
		sites = response;
		map.on('popupclose', () => activeMarker = null);
		redraw(); // Redraw might be finished before the data is loaded.
	});
}

function createMarker(site) {
	const marker = L.marker(site, {
		icon: newIcon(getIconUrl(site), site),
		opacity: (site.open_pct ? 1 : .6),
		riseOnHover: true,
		title: site.name + ' (' + site.slopes_km + ' km)',
	});
	marker.bindPopup(getTooltip(site), {maxWidth: 400, autoPan: false});
	marker.on('popupopen', () => {
		activeMarker = marker;
	});
	return marker;
}

async function redraw() {
	const mapBounds = map.getBounds();
	const alps = L.latLngBounds([44, 6], [47.7, 14]);
	for (const site of sites) {
		const slopes = site.slopes_km;
		const zoom = (slopes > 100 ? 4 : (slopes > 10 ? (alps.contains(site) ? 7 : 6) : 8));
		if (map.getZoom() > zoom && mapBounds.contains(site)) {
			if (!markers[site.url]) {
				markers[site.url] = createMarker(site);
			}
			updateMarker(site);
			markers[site.url].addTo(map);
		} else if (markers[site.url]) {
			markers[site.url].remove();
		}
	}
	if (activeMarker) {
		activeMarker.fire('popupopen');
	}
}

/** Resizes icon of a marker.
 * @param {Site} site
 */
function updateMarker(site) {
	markers[site.url].setIcon(newIcon(getIconUrl(site), site));
}

/** Gets tooltip with site info.
 * @param {Site} site
 * @return {HTMLElement}
 */
function getTooltip(site) {
	const div = document.createElement('div');
	div.style.whiteSpace = 'nowrap';
	const snow = site.snow_cm + ' cm';
	div.innerHTML = '<b style="font-size: 1.25em;"><a href="https://snow.cz' + site.url + '" target="_blank">' + html(site.name) + '</a></b>'
			+ ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + site.lat + ',' + site.lng+ '" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" style="vertical-align: middle;"></a><br>'
			+ 'Sjezdovky: <a href="https://snow.cz' + site.url + '/mapa" target="_blank">' + site.slopes_km + ' km</a><br>'
			+ 'Otevřeno: ' + site.open_pct + '%<br>'
			+ 'Sníh: ' + (site.webcam ? '<a href="https://snow.cz' + site.webcam + '" target="_blank">' + snow + '</a>' : snow) + '<br>'
	return div;
}

/** Gets URL with SVG image.
 * @param {Site} site
 * @return {string}
 */
function getIconUrl(site) {
	const svg = [];
	if (!site.open_pct || site.open_pct == 100) {
		svg.push('<circle cx="19" cy="19" r="18" fill="' + (site.open_pct ? 'lime' : 'red') + '"/>');
	} else {
		const divider = 360 * site.open_pct / 100 - 90;
		svg.push(getCircleSlice(-90, divider, 38, 'lime'));
		svg.push(getCircleSlice(divider, -90, 38, 'red'));
	}
	return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n' + svg.join('') + '<circle cx="19" cy="19" r="18" stroke="#333" stroke-width="2" fill-opacity="0"/>\n</svg>');
}

/** Creates new icon.
 * @param {string} url
 * @param {Site} site
 * @return {L.Icon}
 */
function newIcon(url, site) {
	const zoom = map.getZoom();
	let size = zoom > 9 ? 38 : zoom > 6 ? 19 : zoom > 5 ? 9 : 5;
	const amount = site.slopes_km;
	if (amount < 10) {
		size /= 2;
	} else if (amount < 100) {
		size *= 3/4;
	}
	return L.icon({
		iconUrl: url,
		iconSize: [size, size],
		iconAnchor: [(size - 1) / 2, (size - 1) / 2],
	});
}

/** Gets SVG path for circle slice.
 * @param {number} startAngle
 * @param {number} endAngle
 * @param {number} size
 * @param {string} color
 * @return {string}
 */
function getCircleSlice(startAngle, endAngle, size, color) {
	const hSize = size / 2;
	const x1 = hSize + hSize * Math.cos(Math.PI * startAngle / 180);
	const y1 = hSize + hSize * Math.sin(Math.PI * startAngle / 180);
	const x2 = hSize + hSize * Math.cos(Math.PI * endAngle / 180);
	const y2 = hSize + hSize * Math.sin(Math.PI * endAngle / 180);
	const largeArc = (endAngle - startAngle + 360) % 360 > 180 ? 1 : 0;
	return '<path d="M' + hSize + ',' + hSize + ' L' + x1 + ',' + y1 + ' A' + hSize + ',' + hSize + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' Z" fill="' + color + '"/>';
}

/** Escapes special HTML characters.
 * @param {string} text
 * @return {string}
 */
function html(text) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
</script>

<style lang="less">
.onwindy-plugin-snow { }
#windy-plugin-snow { }
</style>
