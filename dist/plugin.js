"use strict";

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

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
  "version": "1.4.1",
  "author": "Jakub Vrana",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vrana/windy-plugin-pg-mapa"
  },
  "description": "Windy plugin for paragliding takeoffs in Czechia and Slovakia.",
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
    return product == 'gfs' || product == 'iconEu' ? product : 'ecmwf';
  }

  function getLaunchAttrs(site) {
    return ' href="' + site.url + '" target="_blank"';
  }

  function getApiRoot() {
    return 'https://www.paragliding-mapa.cz/';
  }

  function getLaunchExtra(site) {
    return '';
  }

  function getWindAttrs(lat, lon) {
    return ' href=\'javascript:W.store.set("detailDisplay", "wind"); W.broadcast.fire("rqstOpen", "detail", {lat: ' + lat + ', lon: ' + lon + '});\'';
  }

  function getForecastAttrs(lat, lon) {
    return ' href=\'javascript:W.store.set("detailDisplay", "meteogram"); W.broadcast.fire("rqstOpen", "detail", {lat: ' + lat + ', lon: ' + lon + '});\'';
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

  function init() {
    if (Object.keys(markers).length) {
      return;
    }

    fetch(getApiRoot() + 'api/v0.1/launch?locale=' + translate('en', 'cs')).then(function (response) {
      return response.json();
    }).then(function (launch) {
      var _iterator = _createForOfIteratorHelper(launch.data),
          _step;

      try {
        launchLoop: for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var site = _step.value;

          for (var _latLon in sites) {
            if (utils.isNear(getLatLon(_latLon), {
              lat: site.latitude,
              lon: site.longitude
            })) {
              sites[_latLon].push(site);

              continue launchLoop;
            }
          }

          sites[site.latitude + ' ' + site.longitude] = [site];
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      var _loop = function _loop(latLon) {
        var icon = newIcon(getIconUrl(sites[latLon], null), map.getZoom(), sites[latLon]);
        var marker = L.marker(getLatLon(latLon), {
          icon: icon,
          riseOnHover: true,
          title: sites[latLon].map(function (site) {
            return site.name + ' (' + site.superelevation + ' m)';
          }).join('\n')
        }).addTo(map);
        marker.bindPopup(getTooltip(sites[latLon]), {
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
              markers[latLon].setPopupContent(getTooltip(sites[latLon]));
            });
          }
        });
        markers[latLon] = marker;
      };

      for (var latLon in sites) {
        _loop(latLon);
      }

      map.on('popupclose', function () {
        return activeMarker = null;
      });
      redraw();
      broadcast.on('redrawFinished', redraw);
      onLaunchLoad();
    });
  }

  function redraw() {
    interpolator(function (interpolate) {
      for (var latLon in markers) {
        if (map.getBounds().contains(getLatLon(latLon))) {
          if (!winds[getWindsKey(latLon)]) {
            if (store.get('overlay') == 'wind') {
              var data = interpolate(getLatLon(latLon));
              winds[getWindsKey(latLon)] = data && utils.wind2obj(data);
            } else if (!loadForecast(latLon)) {
              var url = markers[latLon]._icon.src;
              markers[latLon].setIcon(newIcon(url, map.getZoom(), sites[latLon]));
              continue;
            }
          }

          updateMarker(latLon);
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
    markers[latLon].setIcon(newIcon(getIconUrl(sites[latLon], wind), map.getZoom(), sites[latLon]));
    markers[latLon].setOpacity(getColor(sites[latLon], wind) != 'red' ? 1 : .4);
    markers[latLon].setPopupContent(getTooltip(sites[latLon]));
  }

  function getTooltip(sites) {
    var wind;
    var forecast;
    var airData;
    var model = getModel();
    var tooltips = sites.map(function (site) {
      var latLon = site.latitude + ' ' + site.longitude;
      wind = wind || getWind(latLon);
      forecast = forecast || forecasts[model] && forecasts[model][latLon];
      airData = airData || airDatas[model] && airDatas[model][latLon];
      return '<b style="font-size: 1.25em;"><a' + getLaunchAttrs(site) + (isSiteForbidden(site) ? ' style="color: red;" title="' + translate('flying forbidden', 'létání zakázáno') + '"' : '') + '>' + html(site.name) + '</a></b>' + ' <span title="' + translate('elevation', 'nadmořská výška') + '">' + site.altitude + ' ' + translate('masl', 'mnm') + '</span>' + ' (<span title="' + translate('vertical metre', 'převýšení') + '">' + site.superelevation + ' m</span>)' + (site.parkings && site.parkings.length ? site.parkings.map(function (parking) {
        return ' <a href="https://maps.google.com/maps?saddr=Your+location&daddr=' + parking.latitude + '+' + parking.longitude + '" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="' + translate('parking', 'parkoviště') + html(parking.name == site.name && site.parkings.length == 1 ? '' : ' ' + parking.name) + '" style="vertical-align: middle;"></a>';
      }).join('') : ' <a href="https://maps.google.com/maps?saddr=Your+location&daddr=' + site.latitude + '+' + site.longitude + '" target="_blank"><img src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico" width="12" height="12" alt="" title="' + translate('takeoff', 'startovačka') + '" style="vertical-align: middle;"></a>') + ' <a href="https://mapy.cz/turisticka?source=coor&id=' + site.longitude + ',' + site.latitude + '" target="_blank"><img src="https://mapy.cz/img/favicon/favicon.ico" width="12" height="12" alt="" title="' + translate('takeoff', 'startovačka') + '" style="vertical-align: middle;"></a>' + getLaunchExtra(site);
    });
    var data = forecast && !/FAKE/.test(forecast.header.note) && getForecast(forecast);
    var extra = [];

    if (wind) {
      var colors = ['green', 'orange', 'red'];
      var windHeight = ' ' + (store.get('level') == 'surface' || store.get('overlay') != 'wind' ? translate('on surface', 'na zemi') : translate('at', 'v') + ' ' + store.get('level'));
      extra.push('<a' + getWindAttrs(sites[0].latitude, sites[0].longitude) + '>' + '<span style="color: ' + colors[getDirIndex(sites, wind.dir)] + ';" title="' + translate('wind direction', 'směr větru') + windHeight + '">' + '<span style="display: inline-block; transform: rotate(' + wind.dir + 'deg)">↓</span> ' + wind.dir + '°</span>' + ' <span style="color: ' + colors[getSpeedIndex(wind.wind)] + ';" title="' + translate('wind speed', 'rychlost větru') + windHeight + '">' + wind.wind.toFixed(1) + ' m/s' + (data && data.gust != null ? ',</span> <span style="color: ' + colors[getSpeedIndex(data.gust - 4)] + ';" title="' + translate('gusts on surface', 'nárazy na zemi') + '">G: ' + data.gust.toFixed(1) + ' m/s' : '') + '</span></a>');
    }

    if (data) {
      var sunrise = new Date(forecast.header.sunrise).getHours();
      var sunset = new Date(forecast.header.sunset).getHours();
      var icon = data.icon2 + (data.hour > sunrise && data.hour <= sunset ? '' : '_night_' + data.moonPhase);
      extra.push('<a' + getForecastAttrs(sites[0].latitude, sites[0].longitude) + '>' + '<img src="https://www.windy.com/img/icons4/png_25px/' + icon + '.png" style="height: 1.3em; vertical-align: middle;" title="' + translate('weather', 'počasí') + ' ' + model + '"></a>' + (data.mm ? ' <span title="' + translate('precipitation', 'srážky') + '">' + data.mm + ' mm</span>' : ''));
    }

    tooltips.push(extra.join(' '));
    var p = sites[0].longitude + 'x' + sites[0].latitude;
    var t = store.get('path').replace(/\//g, '-').replace(/-(\d+)$/, function (match, hour) {
      return 'T' + String(Math.round(hour / 3) * 3).padStart(2, 0) + ':00:00Z';
    });
    var s = sites[0].name;

    if (sites.length > 1) {
      (function () {
        var words = {};

        var _iterator2 = _createForOfIteratorHelper(sites),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var site = _step2.value;
            site.name.split(/[- ,.]+/).forEach(function (word) {
              return words[word] = (words[word] || 0) + 1;
            });
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        var names = Object.keys(words).filter(function (word) {
          return words[word] == sites.length;
        });
        s = names.length ? names.join(' ') : s;
      })();
    }

    extra = [];

    function addLinks(links, title, icon) {
      var meteoLinks = links.matchAll(/(https?:\/\/\S+\w)( \([^()]+\))?/g);
      Array.from(meteoLinks).forEach(function (link) {
        return extra.push('<a href="' + html(link[1]) + '" class="iconfont" style="vertical-align: middle;" title="' + title + html(link[2] || '') + '" target="_blank">' + icon + '</a>');
      });
    }

    addLinks(sites[0].link_meteo, translate('weather station', 'meteostanice'), '');
    addLinks(sites[0].link_webcam, translate('webcam', 'webkamera'), 'l');
    extra.push('<span title="' + translate('lower from intersections of dry adiabat with temperature and isogram', 'nižší z průsečíků suché adiabaty s teplotou a izogramou') + '">' + translate('Possible climb', 'Dostupy') + '</span>:' + ' <a href="http://www.xcmeteo.net/?p=' + p + ',t=' + t + ',s=' + encodeURIComponent(s) + '" target="_blank" title="' + translate('source', 'zdroj') + ': Windy ' + getModel() + '">' + (airData ? Math.round(computeCeiling(airData) / 10) * 10 + ' m' : '-') + '</a>');
    tooltips.push(extra.join(' '));
    return '<div style="white-space: nowrap;">' + tooltips.join('<br>') + '</div>';
  }

  function getForecast(forecast) {
    var path = store.get('path').replace(/\//g, '-');
    var day = forecast.data[path.replace(/-\d+$/, '')] || [];
    var last = null;

    var _iterator3 = _createForOfIteratorHelper(day),
        _step3;

    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var data = _step3.value;

        if (data.hour > path.replace(/.*-0?/, '')) {
          break;
        }

        last = data;
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }

    return last;
  }

  function getIconUrl(sites, wind) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n';

    var _iterator4 = _createForOfIteratorHelper(sites),
        _step4;

    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var site = _step4.value;
        var color = getColor([site], wind);
        svg += (site.wind_usable_to - site.wind_usable_from >= 359 ? '<circle cx="19" cy="19" r="18" fill="' + color + '"/>' : getCircleSlice(site.wind_usable_from - 90, site.wind_usable_to - 90, 38, color)) + '\n';
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }

    svg += '<circle cx="19" cy="19" r="18" stroke="#333" stroke-width="2" fill-opacity="0"/>\n</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function getColor(sites, wind) {
    var colors = ['lime', 'yellow', 'red'];

    if (sites.every(isSiteForbidden)) {
      return colors[2];
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
      return 2;
    } else if (speed.toFixed(1) >= 4) {
      return 1;
    }

    return 0;
  }

  function getDirIndex(sites, dir) {
    var result = 2;

    var _iterator5 = _createForOfIteratorHelper(sites),
        _step5;

    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var site = _step5.value;

        if (isSiteForbidden(site)) {
          continue;
        }

        var from = site.wind_usable_from;
        var to = site.wind_usable_to;

        if (isDirIn(dir, from, to)) {
          return 0;
        } else if (isDirIn(dir, from, to, 10)) {
          result = 1;
        }
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }

    return result;
  }

  function isDirIn(dir, from, to) {
    var tolerance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    to += to < from ? 360 : 0;
    return dir >= from - tolerance && dir <= to + tolerance || dir <= to + tolerance - 360 || dir >= from - tolerance + 360;
  }

  function newIcon(url, zoom, site) {
    var size = zoom > 9 ? 38 : zoom > 6 ? 19 : zoom > 4 ? 9 : 5;

    if (site[0].superelevation < 100) {
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
    var parts = latLon.split(' ');
    return {
      lat: +parts[0],
      lon: +parts[1]
    };
  }

  function getWindsKey(latLon) {
    return (store.get('overlay') == 'wind' ? store.get('product') + ':' + store.get('level') : getModel() + ':surface') + ':' + store.get('path') + ':' + latLon;
  }

  function computeCeiling(airData) {
    var header = airData.header,
        data = airData.data;
    var now = new Date(store.get('path').replace(/\//g, '-').replace(/-(\d+)$/, 'T$1:00Z')).getTime();
    var hour = 0;

    for (var key in data.hours) {
      if (data.hours[key] > now) {
        break;
      }

      hour = key;
    }

    var elevation = header.modelElevation || header.elevation;
    var dryAdiabatTemp = data['temp-surface'][hour];
    var cloudBase = elevation + (dryAdiabatTemp - data['dewpoint-surface'][hour]) * 122;
    var layers = {
      temp: {},
      gh: {}
    };

    for (var _key in data) {
      var match = /^(temp|gh)-(\d+)h$/.exec(_key);

      if (match) {
        layers[match[1]][match[2]] = data[_key][hour];
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

  function translate(english, czech) {
    var lang = store.get('lang');
    return (lang == 'auto' ? store.get('usedLang') : lang) == 'cs' ? czech : english;
  }

  function html(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
});