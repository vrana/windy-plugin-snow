"use strict";

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-pg-mapa",
  "version": "0.4.2",
  "author": "Jakub Vrana",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vrana/windy-plugin-pg-mapa"
  },
  "description": "Windy plugin for paragliding takeoffs in Czechia and Slovakia.",
  "displayName": "Paragliding Mapa",
  "hook": "menu"
},
/* HTML */
'',
/* CSS */
'',
/* Constructor */
function () {
  var utils = W.require('utils');

  var store = W.require('store');

  var pluginDataLoader = W.require('pluginDataLoader');

  var map = W.require('map');

  var interpolator = W.require('interpolator');

  var broadcast = W.require('broadcast');

  var loadData = pluginDataLoader({
    key: 'vVGMVsbSz6cWtZsxMPQURL88LKFYpojx',
    plugin: 'windy-plugin-pg-mapa'
  });
  var sites = {};
  var markers = {};
  var winds = {};
  var forecasts = {};

  this.onopen = function () {
    if (Object.keys(markers).length) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = markers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var marker = _step.value;
          marker.addTo(map);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return;
    }

    fetch('https://www.paragliding-mapa.cz/api/v0.1/launch').then(function (response) {
      return response.json();
    }).then(function (launch) {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        launchLoop: for (var _iterator2 = launch.data[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var site = _step2.value;

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
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      var _loop = function _loop(latLon) {
        var icon = newIcon(getIconUrl(sites[latLon], null), map.getZoom());
        var marker = L.marker(getLatLon(latLon), {
          icon: icon,
          riseOnHover: true
        }).addTo(map);
        marker.bindPopup(getTooltip(sites[latLon]));
        marker.on('mouseover', function () {
          return marker.openPopup();
        });
        marker.on('popupopen', function () {
          return loadForecast(latLon);
        });
        markers[latLon] = marker;
      };

      for (var latLon in sites) {
        _loop(latLon);
      }

      redraw();
      broadcast.on('redrawFinished', redraw);
    });
  };

  this.onclose = function () {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = markers[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var marker = _step3.value;
        map.removeLayer(marker);
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
          _iterator3["return"]();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }
  };

  function redraw() {
    interpolator(function (interpolate) {
      for (var latLon in markers) {
        if (map.getBounds().contains(getLatLon(latLon))) {
          var wind = void 0;

          if (store.get('overlay') == 'wind') {
            var data = interpolate(getLatLon(latLon));
            wind = data && utils.wind2obj(data);
          } else if (loadForecast(latLon)) {
            var _data = getForecast(forecasts[getModel()][latLon]);

            wind = _data && {
              wind: _data.wind,
              dir: _data.windDir
            };
          }

          delete winds[latLon];

          if (!wind) {
            var url = markers[latLon]._icon.src;
            markers[latLon].setIcon(newIcon(url, map.getZoom()));
          } else {
            updateMarker(latLon, wind);
          }
        }
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
      var data = getForecast(forecast.data);
      updateMarker(latLon, data && {
        wind: data.wind,
        dir: data.windDir
      });
    });
  }

  function updateMarker(latLon, wind) {
    winds[latLon] = winds[latLon] || wind;
    wind = winds[latLon];
    markers[latLon].setIcon(newIcon(getIconUrl(sites[latLon], wind), map.getZoom()));
    markers[latLon].setOpacity(getColor(sites[latLon], wind) != 'red' ? 1 : .4);
    markers[latLon].setPopupContent(getTooltip(sites[latLon]));
  }

  function getTooltip(sites) {
    var wind;
    var forecast;
    var tooltips = sites.map(function (site) {
      wind = wind || winds[site.latitude + ' ' + site.longitude];
      forecast = forecast || forecasts[getModel()] && forecasts[getModel()][site.latitude + ' ' + site.longitude];
      return '<a href="' + site.url + '" target="_blank">' + html(site.name) + '</a> (' + site.superelevation + ' m)<br>';
    });
    var extra = [];

    if (wind) {
      extra.push('<span style="display: inline-block; transform: rotate(' + wind.dir + 'deg)">↓</span> ' + wind.dir + '° ' + wind.wind.toFixed(1) + ' m/s');
    }

    if (forecast && !/FAKE/.test(forecast.header.note)) {
      var data = getForecast(forecast);

      if (data) {
        var sunrise = new Date(forecast.header.sunrise).getHours();
        var sunset = new Date(forecast.header.sunset).getHours();
        var icon = data.icon2 + (data.hour > sunrise && data.hour <= sunset ? '' : '_night_' + data.moonPhase);
        extra.push('<img src="img/icons4/png_25px/' + icon + '.png" style="height: 1.3em; vertical-align: middle;">' + (data.mm ? ' ' + data.mm + ' mm' : ''));
      }
    }

    return '<div style="min-width: 160px;">' + tooltips.join('') + extra.join(' ') + '</div>';
  }

  function getModel() {
    return store.get('product') == 'gfs' ? 'gfs' : 'ecmwf';
  }

  function getForecast(forecast) {
    var path = store.get('path').replace(/\//g, '-');
    var day = forecast.data[path.replace(/-\d+$/, '')] || [];
    var last;
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = day[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var data = _step4.value;

        if (data.hour > path.replace(/.*-0?/, '')) {
          break;
        }

        last = data;
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
          _iterator4["return"]();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    return last;
  }

  function getColor(sites, wind) {
    if (!wind) {
      return 'white';
    }

    if (wind.wind.toFixed(1) >= 8) {
      return 'red';
    }

    var dir = wind.dir;
    var color = 'red';
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
      for (var _iterator5 = sites[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
        var site = _step5.value;
        var from = site.wind_usable_from;
        var to = site.wind_usable_to;

        if (isDirIn(dir, from, to)) {
          return wind.wind.toFixed(1) >= 4 ? 'yellow' : 'lime';
        }

        if (isDirIn(dir, from, to, 10)) {
          color = 'yellow';
        }
      }
    } catch (err) {
      _didIteratorError5 = true;
      _iteratorError5 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
          _iterator5["return"]();
        }
      } finally {
        if (_didIteratorError5) {
          throw _iteratorError5;
        }
      }
    }

    return color;
  }

  function isDirIn(dir, from, to) {
    var tolerance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    to += to < from ? 360 : 0;
    return dir >= from - tolerance && dir <= to + tolerance || dir <= to + tolerance - 360 || dir >= from - tolerance + 360;
  }

  function getIconUrl(sites, wind) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n';
    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
      for (var _iterator6 = sites[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
        var site = _step6.value;
        var color = getColor([site], wind);
        svg += (site.wind_usable_to - site.wind_usable_from >= 359 ? '<circle cx="19" cy="19" r="18" fill="' + color + '"/>' : getCircleSlice(site.wind_usable_from - 90, site.wind_usable_to - 90, 38, color)) + '\n';
      }
    } catch (err) {
      _didIteratorError6 = true;
      _iteratorError6 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion6 && _iterator6["return"] != null) {
          _iterator6["return"]();
        }
      } finally {
        if (_didIteratorError6) {
          throw _iteratorError6;
        }
      }
    }

    svg += '<circle cx="19" cy="19" r="18" stroke="white" stroke-width="2" fill-opacity="0"/>\n</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function newIcon(url, zoom) {
    var size = zoom > 9 ? 38 : zoom > 6 ? 19 : zoom > 4 ? 9 : 5;
    return L.icon({
      iconUrl: url,
      iconSize: [size, size],
      iconAnchor: [(size - 1) / 2, (size - 1) / 2]
    });
  }

  function getCircleSlice(startAngle, endAngle, size, color) {
    var hSize = size / 2;
    var x1 = Math.round(hSize + hSize * Math.cos(Math.PI * startAngle / 180));
    var y1 = Math.round(hSize + hSize * Math.sin(Math.PI * startAngle / 180));
    var x2 = Math.round(hSize + hSize * Math.cos(Math.PI * endAngle / 180));
    var y2 = Math.round(hSize + hSize * Math.sin(Math.PI * endAngle / 180));
    return "<path d='M" + hSize + "," + hSize + " L" + x1 + "," + y1 + " A" + hSize + "," + hSize + " 0 0,1 " + x2 + "," + y2 + " Z' fill='" + color + "'/>";
  }

  function getLatLon(latLon) {
    var parts = latLon.split(' ');
    return {
      lat: +parts[0],
      lon: +parts[1]
    };
  }

  function html(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }
});