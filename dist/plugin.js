"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-pg-mapa",
  "version": "2.1.3",
  "author": "Jakub Vrana",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vrana/windy-plugin-pg-mapa"
  },
  "description": "Windy plugin for paragliding takeoffs in Europe.",
  "displayName": "Paragliding Mapa"
},
/* HTML */
'',
/* CSS */
'',
/* Constructor */
function () {
  var utils = W.require('utils');

  var store = W.require('store');

  var pluginDataLoader = W.require('@plugins/plugin-data-loader');

  var map = W.require('map');

  var interpolator = W.require('interpolator');

  var broadcast = W.require('broadcast');

  var loadData = pluginDataLoader({
    key: 'vVGMVsbSz6cWtZsxMPQURL88LKFYpojx',
    plugin: 'windy-plugin-pg-mapa'
  });

  function onLaunchLoad() {}

  function getModel() {
    var product = store.get('product');
    return ['gfs', 'icon', 'iconEu'].indexOf(product) != -1 ? product : 'ecmwf';
  }

  function getLaunchAttrs(site) {
    return ' href="' + site.url + '" target="_blank"';
  }

  function getApiUrl() {
    return 'https://pg.vrana.cz/xcontest/pgmapa.php?locale=' + translate('en', 'cs');
  }

  function getLaunchExtra(site) {
    return '';
  }

  function getWindAttrs(latLon) {
    return ' href=\'javascript:W.store.set("detailDisplay", "wind"); W.broadcast.fire("rqstOpen", "detail", ' + JSON.stringify(getLatLon(latLon)) + ');\'';
  }

  function getForecastAttrs(latLon) {
    return ' href=\'javascript:W.store.set("detailDisplay", "meteogram"); W.broadcast.fire("rqstOpen", "detail", ' + JSON.stringify(getLatLon(latLon)) + ');\'';
  }

  this.onopen = function () {
    var openInApp = document.getElementById('open-in-app');

    if (openInApp) {
      openInApp.style.display = 'none';
    }

    init();
  };

  var Site;
  var sites = {};
  var markers = {};
  var activeMarker = null;
  var Wind;
  var winds = {};
  var Forecast;
  var forecasts = {};
  var AirData;
  var airDatas = {};
  var displaySounding = false;

  function init() {
    if (Object.keys(sites).length) {
      return;
    }

    fetch(getApiUrl()).then(function (response) {
      return response.json();
    }).then(function (launch) {
      var sitesLatLon = {};

      var _iterator = _createForOfIteratorHelper(launch.data),
          _step;

      try {
        launchLoop: for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var site = _step.value;
          site.wind_usable = site.wind_usable_from != null ? [[site.wind_usable_from, site.wind_usable_to]] : site.wind_usable;

          for (var y = -1; y <= 1; y += 2) {
            for (var x = -1; x <= 1; x += 2) {
              var lat = (site.latitude + y / 20).toFixed(1);
              var lon = (site.longitude + x / 20).toFixed(1);

              if (sitesLatLon[lat + ' ' + lon]) {
                var _iterator2 = _createForOfIteratorHelper(sitesLatLon[lat + ' ' + lon]),
                    _step2;

                try {
                  for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                    var latLon = _step2.value;

                    if (utils.isNear(getLatLon(latLon), {
                      lat: site.latitude,
                      lon: site.longitude
                    })) {
                      sites[latLon].push(site);
                      continue launchLoop;
                    }
                  }
                } catch (err) {
                  _iterator2.e(err);
                } finally {
                  _iterator2.f();
                }
              }
            }
          }

          sites[site.latitude + ' ' + site.longitude] = [site];
          var latLonRounded = site.latitude.toFixed(1) + ' ' + site.longitude.toFixed(1);
          sitesLatLon[latLonRounded] = sitesLatLon[latLonRounded] || [];
          sitesLatLon[latLonRounded].push(site.latitude + ' ' + site.longitude);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      map.on('popupclose', function () {
        return activeMarker = null;
      });
      redraw();
      broadcast.on('redrawFinished', redraw);
      onLaunchLoad();
    });
  }

  function createMarker(latLon) {
    var marker = L.marker(getLatLon(latLon), {
      icon: newIcon(getIconUrl(sites[latLon], null), sites[latLon]),
      riseOnHover: true,
      title: sites[latLon].map(function (site) {
        return site.name + (site.superelevation ? ' (' + site.superelevation + ' m)' : '');
      }).join('\n')
    });
    marker.bindPopup(getTooltip(latLon), {
      minWidth: 200,
      maxWidth: 400
    });
    marker.on('popupopen', function () {
      activeMarker = marker;
      loadForecast(latLon);
      var model = getModel();
      airDatas[model] = airDatas[model] || {};

      if (!airDatas[model][latLon]) {
        loadData('airData', Object.assign({
          model: model
        }, getLatLon(latLon))).then(function (airData) {
          airDatas[model][latLon] = airData.data;
          markers[latLon].setPopupContent(getTooltip(latLon));
        });
      }
    });
    return marker;
  }

  function redraw() {
    interpolator(function (interpolate) {
      var mapBounds = map.getBounds();

      for (var latLon in sites) {
        var flights = sites[latLon].reduce(function (acc, site) {
          return Math.max(acc, site.flights);
        }, 0);

        if (map.getZoom() > (flights > 100 ? 4 : flights > 10 ? 7 : 8) && mapBounds.contains(getLatLon(latLon))) {
          if (!markers[latLon]) {
            markers[latLon] = createMarker(latLon);
          }

          if (!winds[getWindsKey(latLon)]) {
            if (store.get('overlay') == 'wind') {
              var data = interpolate(getLatLon(latLon));
              winds[getWindsKey(latLon)] = data && utils.wind2obj(data);
            } else if (!loadForecast(latLon) && markers[latLon]._icon) {
              var url = markers[latLon]._icon.src;
              markers[latLon].setIcon(newIcon(url, sites[latLon]));
              continue;
            }
          }

          updateMarker(latLon);
          markers[latLon].addTo(map);
        } else if (markers[latLon]) {
          markers[latLon].remove();
        }
      }

      if (activeMarker) {
        activeMarker.fire('popupopen');
      }
    });
  }

  function loadForecast(latLon) {
    var model = getModel();
    forecasts[model] = forecasts[model] || {};

    if (forecasts[model][latLon]) {
      return true;
    }

    loadData('forecast', Object.assign({
      model: model
    }, getLatLon(latLon))).then(function (forecast) {
      forecasts[model][latLon] = forecast.data;
      updateMarker(latLon);
    });
    return false;
  }

  function getWind(latLon) {
    if (winds[getWindsKey(latLon)]) {
      return winds[getWindsKey(latLon)];
    }

    var data = forecasts[getModel()] && forecasts[getModel()][latLon] && getForecast(forecasts[getModel()][latLon]);
    return data && {
      wind: data.wind,
      dir: data.windDir
    };
  }

  function updateMarker(latLon) {
    var wind = getWind(latLon);
    var color = getColor(sites[latLon], wind);
    markers[latLon].setIcon(newIcon(getIconUrl(sites[latLon], wind), sites[latLon]));
    markers[latLon].setOpacity(color != 'red' && color != 'silver' ? 1 : .6);
    markers[latLon].setPopupContent(getTooltip(latLon));
  }

  function getUrlLink(url) {
    if (/paragliding-mapa\.cz/.test(url)) {
      return ' <a href="' + url + '" target="_blank"><img src="https://www.paragliding-mapa.cz/favicon/favicon-32x32.png" width="12" height="12" alt="" title="Paragliding Mapa"></a>';
    } else if (/dhv\.de/.test(url)) {
      return ' <a href="' + url + '" target="_blank"><img src="https://www.dhv.de/fileadmin/templates/dhv2011/img/favicon/dhv.ico" width="12" height="12" alt="" title="DHV"></a>';
    } else if (/paraglidingearth\.com/.test(url)) {
      return ' <a href="' + url + '" target="_blank"><img src="https://framagit.org/uploads/-/system/project/avatar/15927/pge.png?width=40" width="20" height="12" alt="" title="Paragliding Earth"></a>';
    }

    return '';
  }

  function getTooltip(latLon) {
    var localSites = sites[latLon];
    var model = getModel();
    var wind = getWind(latLon);
    var forecast = forecasts[model] && forecasts[model][latLon];
    var airData = airDatas[model] && airDatas[model][latLon];
    var tooltips = localSites.map(function (site) {
      return '<b style="font-size: 1.25em;' + (site.name.length >= 20 ? 'text-overflow: ellipsis; max-width: 180px; display: inline-block; overflow: hidden; vertical-align: text-bottom;" title="' + html(site.name) : '') + '"><a' + getLaunchAttrs(site) + (isSiteForbidden(site) ? ' style="color: red;"' + (site.flying_status == 4 ? ' title="' + translate('flying forbidden', 'létání zakázáno') + '"' : '') : '') + '>' + html(site.name) + '</a></b>' + (localSites.length > 1 ? ' <img src="' + getIconUrl([site], wind, ['green', 'orange', 'gray', 'red']) + '" width="12" height="12" alt="">' : '') + [site.url].concat(site.urls || []).map(getUrlLink).join('') + (site.altitude ? ' <span title="' + translate('elevation', 'nadmořská výška') + '">' + site.altitude + ' ' + translate('masl', 'mnm') + '</span>' : '') + (site.superelevation ? ' (<span title="' + translate('vertical metre', 'převýšení') + '">' + site.superelevation + ' m</span>)' : '') + (site.parkings && site.parkings.length ? site.parkings.map(function (parking) {
        return ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + parking.latitude + ',' + parking.longitude + '" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="' + translate('parking', 'parkoviště') + html(parking.name == site.name && site.parkings.length == 1 ? '' : ' ' + parking.name) + '" style="vertical-align: middle;"></a>';
      }).join('') : ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + site.latitude + ',' + site.longitude + '" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="' + translate('takeoff', 'startovačka') + '" style="vertical-align: middle;"></a>') + ' <a href="https://mapy.cz/turisticka?source=coor&id=' + site.longitude + ',' + site.latitude + '" target="_blank"><img src="https://mapy.cz/img/favicon/favicon.ico" width="12" height="12" alt="" title="' + translate('takeoff', 'startovačka') + '" style="vertical-align: middle;"></a>' + getLaunchExtra(site);
    });
    var data = forecast && !/FAKE/.test(forecast.header.note) && getForecast(forecast);
    var extra = [];

    if (wind) {
      var colors = ['green', 'orange', 'gray', 'red'];
      var windHeight = ' ' + (store.get('level') == 'surface' || store.get('overlay') != 'wind' ? translate('on surface', 'na zemi') : translate('at', 'v') + ' ' + store.get('level'));
      extra.push('<a' + getWindAttrs(latLon) + '>' + '<span style="color: ' + colors[getDirIndex(localSites, wind.dir)] + ';" title="' + translate('wind direction', 'směr větru') + windHeight + '">' + '<span style="display: inline-block; transform: rotate(' + wind.dir + 'deg)">↓</span> ' + wind.dir + '°</span>' + ' <span style="color: ' + colors[getSpeedIndex(wind.wind)] + ';" title="' + translate('wind speed', 'rychlost větru') + windHeight + '">' + wind.wind.toFixed(1) + ' m/s' + (data && data.gust != null ? ',</span> <span style="color: ' + colors[getSpeedIndex(data.gust - 4)] + ';" title="' + translate('gusts on surface', 'nárazy na zemi') + '">G: ' + data.gust.toFixed(1) + ' m/s' : '') + '</span></a>');
    }

    if (data) {
      var sunrise = new Date(forecast.header.sunrise).getHours();
      var sunset = new Date(forecast.header.sunset).getHours();
      var icon = data.icon2 + (data.hour > sunrise && data.hour <= sunset ? '' : '_night_' + data.moonPhase);
      extra.push('<a' + getForecastAttrs(latLon) + '>' + '<img src="https://www.windy.com/img/icons4/png_25px/' + icon + '.png" style="height: 1.3em; vertical-align: middle;" title="' + translate('weather', 'počasí') + ' ' + model + '"></a>' + (data.mm ? ' <span title="' + translate('precipitation', 'srážky') + '">' + data.mm + ' mm</span>' : ''));
    }

    tooltips.push(extra.join(' '));
    extra = [];

    function addLinks(links, title, icon) {
      var meteoLinks = (links || '').matchAll(/(https?:\/\/[^\s,;]+\w)( \([^()]+\))?/g);
      Array.from(meteoLinks).forEach(function (link) {
        return extra.push('<a href="' + html(link[1]) + '" class="iconfont" style="vertical-align: middle;" title="' + title + html(link[2] || '') + '" target="_blank">' + icon + '</a>');
      });
    }

    addLinks(localSites[0].link_meteo, translate('weather station', 'meteostanice'), '');
    addLinks(localSites[0].link_webcam, translate('webcam', 'webkamera'), 'l');
    var xcontestLink;
    localSites.some(function (site) {
      return xcontestLink = [site.url].concat(site.urls || []).find(function (url) {
        return /xcontest\.org/.test(url);
      });
    });
    extra.push('<a href="' + (xcontestLink || 'https://www.xcontest.org/world/en/flights-search/?list[sort]=pts&filter[point]=' + latLon.replace(/(.+) (.+)/, '$2+$1') + '&filter[radius]=2000&filter[date_mode]=period#filter-mode') + '"' + (localSites[0].flights != null ? ' title="' + localSites[0].flights + ' ' + translate('flights per year', 'letů za rok') + '"' : '') + ' target="_blank"><img src="https://s.xcontest.org/img/xcontest.gif" width="25" height="12" alt="XContest" style="vertical-align: middle;"></a>');
    var s = localSites[0].name;

    if (localSites.length > 1) {
      (function () {
        var words = {};

        var _iterator3 = _createForOfIteratorHelper(localSites),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var site = _step3.value;
            site.name.split(/[- ,.]+/).forEach(function (word) {
              return words[word] = (words[word] || 0) + 1;
            });
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }

        var names = Object.keys(words).filter(function (word) {
          return words[word] == localSites.length;
        });
        s = names.length ? names.join(' ') : s;
      })();
    }

    var t = store.get('path').replace(/(\d{4})\/?(\d{2})\/?(\d{2})\/?(\d+)/, function (match, year, month, day, hour) {
      return year + '-' + month + '-' + day + 'T' + String(Math.round(hour / 3) * 3).padStart(2, 0) + ':00:00Z';
    });
    extra.push('<span title="' + translate('lower from intersections of dry adiabat with temperature and isogram', 'nižší z průsečíků suché adiabaty s teplotou a izogramou') + '">' + translate('Possible climb', 'Dostupy') + '</span>:' + ' <a class="climb" href="http://www.xcmeteo.net/?p=' + latLon.replace(/ /, 'x') + ',t=' + t + ',s=' + encodeURIComponent(s) + '" target="_blank" title="' + translate('source', 'zdroj') + ': Windy ' + model + '">' + (airData ? Math.round(computeCeiling(airData) / 10) * 10 + ' m' : '-') + '</a>' + (displaySounding ? ' <a href="https://pg.vrana.cz/gfs/#explain" target="_blank"><sup>?</sup></a>' : ''));
    tooltips.push(extra.join(' '), '');
    var div = document.createElement('div');
    div.style.whiteSpace = 'nowrap';
    div.innerHTML = tooltips.join('<br>');

    if (airData) {
      if (displaySounding) {
        div.appendChild(showSounding(airData));
      }

      div.querySelector('.climb').onclick = function () {
        displaySounding = !displaySounding;
        markers[latLon].setPopupContent(getTooltip(latLon));
        return false;
      };
    }

    var nextWheelMove = Date.now();

    div.onwheel = function (event) {
      if (Date.now() > nextWheelMove) {
        store.set('timestamp', store.get('timestamp') + Math.sign(event.deltaY) * 60 * 60 * 1000);
        nextWheelMove = Date.now() + 100;
      }
    };

    return div;
  }

  function getForecast(forecast) {
    var path = store.get('path').replace(/(\d{4})\/?(\d{2})\/?(\d{2})\/?(\d{2})/, '$1-$2-$3-$4');
    var day = forecast.data[path.replace(/-\d+$/, '')] || [];
    var last = null;

    var _iterator4 = _createForOfIteratorHelper(day),
        _step4;

    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var data = _step4.value;

        if (data.hour > path.replace(/.*-0?/, '')) {
          break;
        }

        last = data;
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }

    return last;
  }

  function getIconUrl(sites, wind) {
    var colors = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ['lime', 'yellow', 'silver', 'red'];
    var svg = '';

    var _iterator5 = _createForOfIteratorHelper(sites),
        _step5;

    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var site = _step5.value;

        var _iterator6 = _createForOfIteratorHelper(site.wind_usable || [[0, 360]]),
            _step6;

        try {
          for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
            var _step6$value = _slicedToArray(_step6.value, 2),
                from = _step6$value[0],
                to = _step6$value[1];

            var color = getColor([site], wind, colors);
            var circle = (to - from >= 359 ? '<circle cx="19" cy="19" r="18" fill="' + color + '"/>' : getCircleSlice(from - 90, to - 90, 38, color)) + '\n';
            svg = color == colors[2] ? circle + svg : svg + circle;
          }
        } catch (err) {
          _iterator6.e(err);
        } finally {
          _iterator6.f();
        }
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }

    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n' + svg + '<circle cx="19" cy="19" r="18" stroke="#333" stroke-width="2" fill-opacity="0"/>\n</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function getColor(sites, wind) {
    var colors = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ['lime', 'yellow', 'silver', 'red'];

    if (sites.every(isSiteForbidden)) {
      return colors[3];
    }

    if (!wind) {
      return 'white';
    }

    return colors[Math.max(getSpeedIndex(wind.wind), getDirIndex(sites, wind.dir))];
  }

  function isSiteForbidden(site) {
    return site.flying_status == 4 || site.active == 0;
  }

  function getSpeedIndex(speed) {
    if (speed.toFixed(1) >= 8) {
      return 3;
    } else if (speed.toFixed(1) >= 4) {
      return 1;
    }

    return 0;
  }

  function getDirIndex(sites, dir) {
    var result = 2;

    var _iterator7 = _createForOfIteratorHelper(sites),
        _step7;

    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        var site = _step7.value;

        if (!site.wind_usable) {
          continue;
        } else if (result == 2) {
          result = 3;
        }

        if (isSiteForbidden(site)) {
          continue;
        }

        var _iterator8 = _createForOfIteratorHelper(site.wind_usable),
            _step8;

        try {
          for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
            var _step8$value = _slicedToArray(_step8.value, 2),
                from = _step8$value[0],
                to = _step8$value[1];

            if (isDirIn(dir, from, to)) {
              return 0;
            } else if (isDirIn(dir, from, to, 10)) {
              result = 1;
            }
          }
        } catch (err) {
          _iterator8.e(err);
        } finally {
          _iterator8.f();
        }
      }
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }

    return result;
  }

  function isDirIn(dir, from, to) {
    var tolerance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    to += to < from ? 360 : 0;
    return dir >= from - tolerance && dir <= to + tolerance || dir <= to + tolerance - 360 || dir >= from - tolerance + 360;
  }

  function newIcon(url, site) {
    var _site$0$flights;

    var zoom = map.getZoom();
    var size = zoom > 9 ? 38 : zoom > 6 ? 19 : zoom > 5 ? 9 : 5;
    var amount = (_site$0$flights = site[0].flights) !== null && _site$0$flights !== void 0 ? _site$0$flights : site[0].superelevation || 0;

    if (amount < 10) {
      size /= 2;
    } else if (amount < 100) {
      size *= 3 / 4;
    }

    return L.icon({
      iconUrl: url,
      iconSize: [size, size],
      iconAnchor: [(size - 1) / 2, (size - 1) / 2]
    });
  }

  function getCircleSlice(startAngle, endAngle, size, color) {
    var hSize = size / 2;
    var x1 = hSize + hSize * Math.cos(Math.PI * startAngle / 180);
    var y1 = hSize + hSize * Math.sin(Math.PI * startAngle / 180);
    var x2 = hSize + hSize * Math.cos(Math.PI * endAngle / 180);
    var y2 = hSize + hSize * Math.sin(Math.PI * endAngle / 180);
    var largeArc = (endAngle - startAngle + 360) % 360 > 180 ? 1 : 0;
    return '<path d="M' + hSize + ',' + hSize + ' L' + x1 + ',' + y1 + ' A' + hSize + ',' + hSize + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' Z" fill="' + color + '"/>';
  }

  function getLatLon(latLon) {
    var parts = /(.+) (.+)/.exec(latLon);
    return {
      lat: +parts[1],
      lon: +parts[2]
    };
  }

  function getWindsKey(latLon) {
    return (store.get('overlay') == 'wind' ? store.get('product') + ':' + store.get('level') : getModel() + ':surface') + ':' + store.get('path') + ':' + latLon;
  }

  function svgLine(svg, coords, stroke, strokeWidth) {
    var attributes = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M' + coords.map(function (coord) {
      return coord.join(' ');
    }).join('L'));

    for (var key in attributes) {
      path.setAttribute(key, attributes[key]);
    }

    path.style.stroke = stroke;
    path.style.strokeWidth = strokeWidth;
    path.style.fill = 'none';
    return svg.appendChild(path);
  }

  function svgText(svg, textContent, x, y, color) {
    var attributes = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = textContent;
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');

    for (var key in attributes) {
      text.setAttribute(key, attributes[key]);
    }

    text.style.fill = color;
    return svg.appendChild(text);
  }

  function interpolate(airData, layer, hour, height) {
    var header = airData.header,
        data = airData.data;
    var above = {
      value: Infinity
    };
    var below = {
      key: 'surface',
      value: header.modelElevation || header.elevation
    };

    for (var key in data) {
      var match = /^gh-(.+)/.exec(key);
      var value = data[key][hour];

      if (match && value) {
        if (value < above.value && value > height) {
          above = {
            key: match[1],
            value: value
          };
        }

        if (value > below.value && value <= height) {
          below = {
            key: match[1],
            value: value
          };
        }
      }
    }

    var up = data[layer + '-' + above.key][hour];
    var down = data[layer + '-' + below.key][hour];
    return down + (up - down) / (above.value - below.value) * (height - below.value);
  }

  function splitWindDir(layers) {
    var prev;
    var segments = [];

    var _iterator9 = _createForOfIteratorHelper(layers.wind_u.map(function (u, i) {
      return [(180 * Math.atan2(-layers.wind_v[i][0], u[0]) / Math.PI - 90 + 360) % 360, u[1]];
    })),
        _step9;

    try {
      for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
        var dir = _step9.value;

        if (prev) {
          if (Math.abs(prev[0] - dir[0]) <= 180) {
            segments.push([prev, dir]);
          } else {
            segments.push([prev, [dir[0] + (prev[0] < dir[0] ? -360 : 360), dir[1]]]);
            segments.push([[prev[0] + (prev[0] < dir[0] ? 360 : -360), prev[1]], dir]);
          }
        }

        prev = dir;
      }
    } catch (err) {
      _iterator9.e(err);
    } finally {
      _iterator9.f();
    }

    return segments;
  }

  function showSounding(airData) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.width = '435px';
    svg.style.height = '420px';
    svg.style.zoom = '75%';

    for (var i = 0; i <= 400; i += 50) {
      svgLine(svg, [[20, i], [420, i]], '#bbb', .5);
      svgLine(svg, [[20 + i, 0], [20 + i, 400]], '#bbb', .5);
    }

    var header = airData.header,
        data = airData.data;
    var hour = getCurrentHour(airData);
    var layers = {
      temp: [],
      dewpoint: [],
      wind_u: [],
      wind_v: []
    };
    var maxTemp = -Infinity;
    var zeroK = -273.15;
    var ground = header.modelElevation || header.elevation;
    var ceiling = 4000 + Math.floor(ground / 500) * 500;

    for (var key in data) {
      var match = /^(temp|dewpoint|wind_u|wind_v)-(.+)/.exec(key);

      if (match) {
        var gh = match[2] == 'surface' ? ground : data['gh-' + match[2]][hour];

        if (gh >= ground) {
          layers[match[1]].push([data[key][hour], (ceiling - gh) / 10]);

          if (match[1] == 'temp' || match[1] == 'dewpoint') {
            maxTemp = Math.max(5 * Math.ceil((data[key][hour] + zeroK) / 5), maxTemp);
          }
        }
      }
    }

    for (var _key in layers) {
      layers[_key].sort(function (a, b) {
        return b[1] - a[1];
      });
    }

    layers.temp = layers.temp.map(function (a) {
      return [420 + (a[0] + zeroK - maxTemp) * 10, a[1]];
    });
    layers.dewpoint = layers.dewpoint.map(function (a) {
      return [420 + (a[0] + zeroK - maxTemp) * 10, a[1]];
    });
    var clipPath = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'clipPath'));
    clipPath.id = 'clip';
    var polygon = clipPath.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'polygon'));
    polygon.setAttribute('points', '20,0 420,0 420,400 20,400 20,0');
    var g = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
    g.setAttribute('clip-path', 'url(#clip)');
    svgLine(g, [layers.temp[0], [layers.temp[0][0] - (ceiling - ground) * 9.8 / 100, 0]], '#db5', 1);
    svgLine(g, [layers.dewpoint[0], [layers.dewpoint[0][0] - (ceiling - ground) * 9.8 / 5 / 100, 0]], '#db5', 1);
    svgLine(g, layers.temp, '#a22', 2);
    svgLine(g, layers.dewpoint, '#23a', 2);
    svgLine(g, layers.wind_u.map(function (u, i) {
      return [20 + Math.sqrt(Math.pow(u[0], 2) + Math.pow(layers.wind_v[i][0], 2)) * 25, u[1]];
    }), '#293', 1.5);

    var _iterator10 = _createForOfIteratorHelper(splitWindDir(layers)),
        _step10;

    try {
      for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
        var segment = _step10.value;
        svgLine(g, segment.map(function (a) {
          return [20 + a[0] / 360 * 400, a[1]];
        }), '#52bea8', 1.5, {
          'stroke-dasharray': '5 5'
        });
      }
    } catch (err) {
      _iterator10.e(err);
    } finally {
      _iterator10.f();
    }

    svgLine(svg, [[20, 0], [420, 0]], '#555', .5, {
      'stroke-dasharray': '5 1.5',
      'class': 'guideline'
    }).style.visibility = 'hidden';

    for (var _i2 = Math.ceil(ground / 1000); _i2 <= ceiling / 1000; _i2++) {
      svgText(svg, _i2 + 'km', 15, 10 + ceiling / 10 - _i2 * 100, '#555');
    }

    var xAxis = {};

    for (var _i3 = maxTemp; _i3 >= maxTemp - 20; _i3 -= 5) {
      xAxis[420 - (maxTemp - _i3) * 10] = {
        text: _i3 + '°C',
        color: '#a22'
      };
    }

    for (var _i4 = 0; _i4 <= 6; _i4 += 2) {
      xAxis[20 + _i4 * 25] = {
        text: _i4 + 'm/s',
        color: '#293'
      };
    }

    var windDir = (180 * Math.atan2(-layers.wind_v[0][0], layers.wind_u[0][0]) / Math.PI - 90 + 360) % 360;

    function drawWindDir(windDir) {
      var x = 20 + windDir * 400 / 360;
      delete xAxis[x];
      svgText(svg, '↓', x, 415, '#52bea8', {
        transform: 'rotate(' + windDir + ',' + x + ',410)'
      });
    }

    drawWindDir(Math.floor(windDir / 45) * 45);
    drawWindDir(Math.ceil(windDir / 45) * 45);

    for (var x in xAxis) {
      svgText(svg, xAxis[x].text, x, 415, xAxis[x].color);
    }

    svgText(svg, getModel(), 395, 22, '#999');
    svgText(svg, new Date(data.hours[hour]).getHours() + ':00', 395, 37, '#999');
    svgText(svg, '', 395, 72, '#555', {
      'class': 'height'
    });
    svgText(svg, '', 378, 87, '#52bea8', {
      'class': 'windDir'
    });
    svgText(svg, '', 385, 87, '#293', {
      'class': 'windSpeed',
      'text-anchor': 'start'
    });

    svg.onmousemove = function (event) {
      var zoom = parseInt(svg.style.zoom) / 100;
      var x = event.offsetX / zoom;
      var y = event.offsetY / zoom;

      if (x >= 20 && x <= 420 && y <= layers.temp[0][1]) {
        var height = ceiling - y * 10;
        svg.querySelector('.height').textContent = Math.round(height / 10) * 10 + 'm';
        svg.querySelector('.windDir').textContent = '↓';
        var u = interpolate(airData, 'wind_u', hour, height);
        var v = interpolate(airData, 'wind_v', hour, height);
        svg.querySelector('.windDir').setAttribute('transform', 'rotate(' + (180 * Math.atan2(-v, u) / Math.PI - 90 + 360) % 360 + ',378,82)');
        svg.querySelector('.windSpeed').textContent = Math.sqrt(Math.pow(u, 2) + Math.pow(v, 2)).toFixed(1) + 'm/s';
        svg.querySelector('.guideline').style.visibility = 'visible';
        svg.querySelector('.guideline').setAttribute('d', 'M20 ' + y + 'L420 ' + y);
      } else {
        svg.querySelector('.height').textContent = '';
        svg.querySelector('.windDir').textContent = '';
        svg.querySelector('.windSpeed').textContent = '';
        svg.querySelector('.guideline').style.visibility = 'hidden';
      }
    };

    return svg;
  }

  function computeCeiling(airData) {
    var header = airData.header,
        data = airData.data;
    var hour = getCurrentHour(airData);
    var elevation = header.modelElevation || header.elevation;
    var dryAdiabatTemp = data['temp-surface'][hour];
    var cloudBase = elevation + (dryAdiabatTemp - data['dewpoint-surface'][hour]) * 122;
    var layers = {
      temp: {},
      gh: {}
    };

    for (var key in data) {
      var match = /^(temp|gh)-(\d+)h$/.exec(key);

      if (match) {
        layers[match[1]][match[2]] = data[key][hour];
      }
    }

    var ceiling = elevation;
    var prevTemp = dryAdiabatTemp;
    Object.keys(layers.temp).sort(function (a, b) {
      return b - a;
    }).some(function (pressure) {
      var gh = layers.gh[pressure];

      if (gh > ceiling) {
        var temp = layers.temp[pressure];
        var height = gh - ceiling;

        if (temp > dryAdiabatTemp - height * .01) {
          ceiling += (dryAdiabatTemp - prevTemp) / ((temp - prevTemp) / height + .01);
          return true;
        }

        dryAdiabatTemp -= height * .01;
        ceiling = gh;
        prevTemp = temp;
      }
    });
    return Math.min(ceiling, cloudBase);
  }

  function getCurrentHour(airData) {
    var data = airData.data;
    var now = new Date(store.get('path').replace(/(\d{4})\/?(\d{2})\/?(\d{2})\/?(\d{2})/, '$1-$2-$3T$4:00Z')).getTime();
    var hour = 0;

    for (var key in data.hours) {
      if (data.hours[key] > now) {
        break;
      }

      hour = key;
    }

    return hour;
  }

  function translate(english, czech) {
    var lang = store.get('lang');
    return (lang == 'auto' ? store.get('usedLang') : lang) == 'cs' ? czech : english;
  }

  function html(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
});