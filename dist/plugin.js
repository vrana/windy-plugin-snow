"use strict";

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-pg-mapa",
  "version": "0.1.0",
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

  var map = W.require('map');

  var interpolator = W.require('interpolator');

  var broadcast = W.require('broadcast');

  var markers = {};
  var winds = {};

  this.onopen = function () {
    fetch('https://www.paragliding-mapa.cz/api/v0.1/launch').then(function (response) {
      return response.json();
    }).then(function (launch) {
      var sites = {};
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

      function getTooltip(sites) {
        return function () {
          var wind;
          var tooltips = sites.map(function (site) {
            wind = wind || winds[site.latitude] && winds[site.latitude][site.longitude];
            return '<a href="' + site.url + '" target="_blank">' + html(site.name) + '</a> (' + site.superelevation + ' m)';
          });

          if (wind) {
            tooltips.push(wind);
          }

          return tooltips.join('<br>');
        };
      }

      var _loop = function _loop(lat) {
        var _loop2 = function _loop2(_lon) {
          var titles = sites[lat][_lon].map(function (site) {
            return site.name + ' (' + site.superelevation + ' m)';
          });

          var icon = newIcon(getIconUrl(sites[lat][_lon], null), map.getZoom());
          var marker = L.marker([lat, _lon], {
            icon: icon,
            title: titles.join('\n') + '\n',
            riseOnHover: true
          }).addTo(map);

          if (sites[lat][_lon].length > 1 || L.Browser.mobile) {
            marker.bindPopup(getTooltip(sites[lat][_lon]));
          } else {
            marker.on('click', function () {
              return open(sites[lat][_lon][0].url);
            });
          }

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
                var url = void 0;

                if (store.get('overlay') != 'wind') {
                  url = markers[_lat][lon]._icon.src;
                } else {
                  var data = interpolate({
                    lat: _lat,
                    lon: lon
                  });
                  var wind = data ? utils.wind2obj(data) : null;
                  url = getIconUrl(sites[_lat][lon], wind);
                  winds[_lat] = winds[_lat] || {};
                  winds[_lat][lon] = wind ? wind.dir + '° ' + wind.wind.toFixed(1) + ' m/s' : '';
                  markers[_lat][lon]._icon.title = markers[_lat][lon]._icon.title.replace(/\n.*$/, '\n' + winds[_lat][lon]);

                  markers[_lat][lon].setOpacity(isActive(sites[_lat][lon], wind) ? 1 : .4);
                }

                markers[_lat][lon].setIcon(newIcon(url, map.getZoom()));
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

  function isActive(sites, wind) {
    if (!wind) {
      return true;
    }

    if (wind.wind.toFixed(1) >= 8) {
      return false;
    }

    var dir = wind.dir;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = sites[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var site = _step2.value;
        var from = site.wind_usable_from;
        var to = site.wind_usable_to;

        if (from < to ? dir >= from && dir <= to : dir >= from || dir <= to) {
          return true;
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

    return false;
  }

  function getIconUrl(sites, wind) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">\n';
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = sites[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var site = _step3.value;
        var color = !wind ? 'white' : !isActive([site], wind) ? 'red' : wind.wind.toFixed(1) >= 4 ? 'yellow' : 'lime';
        svg += getCircleSlice(site.wind_usable_from - 90, site.wind_usable_to - 90, 38, color) + '\n';
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