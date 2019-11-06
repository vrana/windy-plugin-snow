"use strict";

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-pg-mapa",
  "version": "0.3.0",
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
    fetch('https://www.paragliding-mapa.cz/api/v0.1/launch').then(function (response) {
      return response.json();
    }).then(function (launch) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        launchLoop: for (var _iterator = launch.data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var site = _step.value;

          for (var _lat2 in sites) {
            for (var lon in sites[_lat2]) {
              if (utils.isNear({
                lat: _lat2,
                lon: lon
              }, {
                lat: site.latitude,
                lon: site.longitude
              })) {
                sites[_lat2][lon].push(site);

                continue launchLoop;
              }
            }
          }

          sites[site.latitude] = sites[site.latitude] || {};
          sites[site.latitude][site.longitude] = [site];
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

      var _loop = function _loop(lat) {
        var _loop2 = function _loop2(_lon) {
          var icon = newIcon(getIconUrl(sites[lat][_lon], null), map.getZoom());
          var marker = L.marker([lat, _lon], {
            icon: icon,
            riseOnHover: true
          }).addTo(map);
          marker.bindPopup(getTooltip(sites[lat][_lon]));
          marker.on('mouseover', function () {
            return marker.openPopup();
          });
          marker.on('popupopen', function () {
            return loadForecast(lat, _lon);
          });
          markers[lat] = markers[lat] || {};
          markers[lat][_lon] = marker;
        };

        for (var _lon in sites[lat]) {
          _loop2(_lon);
        }
      };

      for (var lat in sites) {
        _loop(lat);
      }

      function redraw() {
        interpolator(function (interpolate) {
          for (var _lat in markers) {
            for (var lon in markers[_lat]) {
              if (map.getBounds().contains(L.latLng(_lat, lon))) {
                var wind = void 0;

                if (store.get('overlay') == 'wind') {
                  var data = interpolate({
                    lat: _lat,
                    lon: lon
                  });
                  wind = data ? utils.wind2obj(data) : null;
                } else if (loadForecast(_lat, lon)) {
                  var _data = getForecast(forecasts[getModel()][_lat][lon]);

                  wind = {
                    wind: _data.wind,
                    dir: _data.windDir
                  };
                }

                if (winds[_lat]) {
                  delete winds[_lat][lon];
                }

                if (!wind) {
                  var url = markers[_lat][lon]._icon.src;

                  markers[_lat][lon].setIcon(newIcon(url, map.getZoom()));
                } else {
                  updateMarker(_lat, lon, wind);
                }
              }
            }
          }
        });
      }

      redraw();
      broadcast.on('redrawFinished', redraw);
    });
  };

  this.onclose = function () {
    for (var lat in markers) {
      for (var lon in markers[lat]) {
        map.removeLayer(markers[lat][lon]);
      }
    }
  };

  function loadForecast(lat, lon) {
    var model = getModel();
    forecasts[model] = forecasts[model] || {};
    forecasts[model][lat] = forecasts[model][lat] || {};

    if (forecasts[model][lat][lon]) {
      return true;
    }

    loadData('forecast', {
      model: model,
      lat: +lat,
      lon: +lon
    }).then(function (forecast) {
      forecasts[model][lat][lon] = forecast.data;
      var data = getForecast(forecast.data);
      updateMarker(lat, lon, {
        wind: data.wind,
        dir: data.windDir
      });
    });
  }

  function updateMarker(lat, lon, wind) {
    winds[lat] = winds[lat] || {};
    winds[lat][lon] = winds[lat][lon] || wind;
    markers[lat][lon].setIcon(newIcon(getIconUrl(sites[lat][lon], wind), map.getZoom()));
    markers[lat][lon].setOpacity(getColor(sites[lat][lon], wind) != 'red' ? 1 : .4);
    markers[lat][lon].setPopupContent(getTooltip(sites[lat][lon]));
  }

  function getTooltip(sites) {
    var wind;
    var forecast;
    var tooltips = sites.map(function (site) {
      wind = wind || winds[site.latitude] && winds[site.latitude][site.longitude];
      forecast = forecast || forecasts[getModel()] && forecasts[getModel()][site.latitude] && forecasts[getModel()][site.latitude][site.longitude];
      return '<a href="' + site.url + '" target="_blank">' + html(site.name) + '</a> (' + site.superelevation + ' m)';
    });
    var extra = [];

    if (wind) {
      extra.push(wind.dir + '° ' + wind.wind.toFixed(1) + ' m/s');
    }

    if (forecast && !/FAKE/.test(forecast.header.note)) {
      var sunrise = new Date(forecast.header.sunrise).getHours();
      var sunset = new Date(forecast.header.sunset).getHours();
      var data = getForecast(forecast);

      if (data) {
        extra.push(data.rain ? '🌧 ' + data.mm + ' mm' : data.hour > sunrise && data.hour <= sunset ? '☀' : '☾');
      }
    }

    if (extra.length) {
      tooltips.push(extra.join(' '));
    }

    return '<div style="min-width: 150px;">' + tooltips.join('<br>') + '</div>';
  }

  function getModel() {
    return store.get('product') == 'gfs' ? 'gfs' : 'ecmwf';
  }

  function getForecast(forecast) {
    var path = store.get('path').replace(/\//g, '-');
    var day = forecast.data[path.replace(/-\d+$/, '')] || [];
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = day[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var data = _step2.value;

        if (data.hour >= path.replace(/.*-0?/, '')) {
          return data;
        }
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
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = sites[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var site = _step3.value;
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

    return color;
  }

  function isDirIn(dir, from, to) {
    var tolerance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    to += to < from ? 360 : 0;
    return dir >= from - tolerance && dir <= to + tolerance || dir <= to + tolerance - 360 || dir >= from - tolerance + 360;
  }

  function getIconUrl(sites, wind) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n';
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = sites[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var site = _step4.value;
        svg += getCircleSlice(site.wind_usable_from - 90, site.wind_usable_to - 90, 38, getColor([site], wind)) + '\n';
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
    return "<path d='M" + hSize + "," + hSize + " L" + x1 + "," + y1 + " A" + hSize + "," + hSize + " 0 0,1 " + x2 + "," + y2 + " z' fill='" + color + "'/>";
  }

  function html(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }
});