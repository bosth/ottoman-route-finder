import "./style.css";
import {Map, View} from "ol";
import {fromLonLat} from 'ol/proj';
import Feature from 'ol/Feature';
import TileLayer from "ol/layer/Tile";
import TileJSON from "ol/source/TileJSON";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import {Icon, Circle, Fill, Stroke, Style, Text, RegularShape} from 'ol/style';
import Collection from "ol/Collection";
import GeoJSON from 'ol/format/GeoJSON';
import Translate from 'ol/interaction/Translate';
import Attribution from 'ol/control/Attribution';
import {defaults} from 'ol/control/defaults';
import {all} from 'ol/loadingstrategy';
import Overlay from 'ol/Overlay';
import humanizeDuration from 'humanize-duration';

const wfsUrl = import.meta.env.VITE_SERVER_URL;
const wfsFeaturePrefix = 'ottoman';
const wfsOutputFormat = 'application/json';
const wfsVersion = '2.0.0';
const key = 'yvGZ8CUmA6zbqBiHuxk5';
var allowRefresh = true;
setInterval(function(){allowRefresh = true}, 30);

// STYLES
const pathStyle = function(feature) {
  var mode = feature.get('mode');
  var style;
  switch (mode) {
    case 'ferry':
      return new Style({
        stroke: new Stroke({
          color: [0, 0, 255, 0.4],
          width: 1,
          lineDash: [1,2],
        })
      });
      break;
    case 'ship':
      return new Style({
        stroke: new Stroke({
          color: [0, 0, 255, 0.4],
          width: 2,
          lineDash: [2,8],
        })
      });
      break;
    case 'rail':
      return [
        new Style({
          stroke: new Stroke({
            color: [255, 255, 255, 0.8],
            width: 2,
            lineDash: [4,8],
            lineDashOffset: 6
          })
        }),
        new Style({
          stroke: new Stroke({
            color: [0, 0, 0, 0.8],
            width: 2,
            lineDash: [4, 8]
          })
        })
      ];
      break;
    case 'chaussee':
      return [
        new Style({
          stroke: new Stroke({
            color: [0, 0, 0, 1],
            width: 4
          })
        }),
        new Style({
          stroke: new Stroke({
            color: [255, 255, 255, 1],
            width: 2,
          })
        })
      ];
    case 'road':
      return [
        new Style({
          stroke: new Stroke({
            color: [0, 0, 0, 1],
            width: 2
          })
        }),
        new Style({
          stroke: new Stroke({
            color: [255, 255, 255, 1],
            width: 1,
          })
        })
      ];
    case 'metro':
    case 'tram':
      return new Style({
        stroke: new Stroke({
          color: 'black',
          width: 2,
        })
      });
    default:
  }
  return style;
};

const nodeStyle = function(feature) {
  var rank = feature.get('rank');
  var image;
  switch (rank) {
    case 10:
      image = new RegularShape({
        points: 5,
        radius: 8,
        radius2: 4,
        fill: new Fill({
          color: 'red'
        })
      });
      break;
    case 9: // vilayet merkezi
      image = new Circle({
        radius: 6,
        fill: new Fill({
          color: 'black'
        }),
        stroke: new Stroke({
          width: 2,
          color: 'white'
        })
      });
      break;
    case 8: // kaza merkezi
      image = new Circle({
        radius: 5,
        fill: new Fill({
          color: 'white'
        }),
        stroke: new Stroke({
          width: 2,
          color: 'black'
        })
      });
      break;
    case 7: // nahiye
      image = new Circle({
        radius: 4,
        fill: new Fill({
          color: 'black'
        })
      });
      break;
    case 6: // nahiye merkezi
      image = new Circle({
        radius: 3,
        fill: new Fill({
          color: '#111'
        })
      });
    case 5: // koy
      image = new Circle({
        radius: 2,
        fill: new Fill({
          color: '#222'
        })
      });
    default:
      image = new RegularShape({
        points: 4,
        radius: 2,
        angle: Math.PI / 4,
        fill: new Fill({
          color: [0, 0, 0, 1]
        })
      });
  }
  var style = new Style({
    image: image,
    zIndex: rank,
    text: new Text({
      font: (rank + 8) + 'px "Open Sans,sans-serif"',
      textAlign: 'left',
      textBaseline: 'bottom',
      fill: new Fill({color: "#000"}),
      stroke: new Stroke({color: "#fff", width: 4})
    }),
  });
  style.getText().setText(feature.get('name'));
  return style;
};


// SOURCES
var nodeSource = new VectorSource({
  format: new GeoJSON(),
  url: function (extent) {
    return (
      wfsUrl + '/' +
      '/ows?' +
      'service=WFS&version=1.3.0&request=GetFeature&typeName=' + wfsFeaturePrefix + ':nodes&' +
      'srsname=EPSG:3857&outputFormat=' + wfsOutputFormat);
  },
  strategy: all
});

var pathSource = new VectorSource({
  format: new GeoJSON(),
  url: function (extent) {
    return (
      wfsUrl + '/' +
      '/ows?' +
      'service=WFS&version=1.3.0&request=GetFeature&typeName=' + wfsFeaturePrefix + ':edges_render&' +
      'srsname=EPSG:3857&outputFormat=' + wfsOutputFormat);
  },
  strategy: all
});

const attribution = new Attribution({
  collapsible: false,
});

const tileSource = new TileJSON({
  url: `https://api.maptiler.com/tiles/hillshade/tiles.json?key=${key}`, // source URL
  tileSize: 512,
  crossOrigin: 'anonymous'
});


// LAYERS
var nodeLayer = new VectorLayer({
  source: nodeSource,
  style: nodeStyle,
  declutter: true,
  crossOrigin: 'anonymous'
});

const pathLayer = new VectorLayer({
  source: pathSource,
  style: pathStyle,
  crossOrigin: 'anonymous'
});

const routeLayer = new VectorLayer({
  style: new Style({
    stroke: new Stroke({
      color: [0, 0, 255, 0.4],
      width: 8,
    })
  })
});

var sourceMarker;
var targetMarker;
var markerLayer = new VectorLayer({
  source: new VectorSource({
    features: [],
  }),
  style: function(feature) {
    if (feature === sourceMarker) {
      return new Style({
        image: new Icon({
          src: 'source.png',
          anchor: [0.5, 0],
          anchorOrigin: 'bottom-right',
          scale: 0.5
        }),
      });
    } else if (feature === targetMarker) {
      return new Style({
        image: new Icon({
          src: 'target.png',
          anchor: [0.5, 0],
          anchorOrigin: 'bottom-right',
          scale: 0.5
        }),
      });
    }
  }
});

function randomMarker() {
  var i = Math.floor(Math.random() * nodeLayer.getSource().getFeatures().length);
  var feature = nodeLayer.getSource().getFeatures()[i];
  return new Feature({
    geometry: feature.getGeometry().clone(),
    node: feature
  });
}

nodeSource.on('change', function() {
  sourceMarker = randomMarker();
  targetMarker = randomMarker();
  markerLayer.getSource().addFeature(sourceMarker);
  markerLayer.getSource().addFeature(targetMarker);
  // INTERACTIONS
  var movingInteraction1 = new Translate({
    features: new Collection([sourceMarker]),
  });
  var movingInteraction2 = new Translate({
    features: new Collection([targetMarker]),
  });
  movingInteraction1.on(['translateend', 'translating'], onMarkerMove);
  movingInteraction2.on(['translateend', 'translating'], onMarkerMove);
  map.addInteraction(movingInteraction1);
  map.addInteraction(movingInteraction2);
  createRoute(sourceMarker.get("node"), targetMarker.get("node"), true);
});

// MAP
var map = new Map({
  target: 'map',
  controls: defaults({attribution: false}).extend([attribution]),
  layers: [
    new TileLayer({source: tileSource}),
    pathLayer,
    nodeLayer,
    routeLayer,
    markerLayer,
  ],
  view: new View({
    center: fromLonLat([29, 41]),
    zoom: 6,
  }),
});

// CALLBACKS
function onMarkerMove(event) {
  if (event.type == 'translating') {
    if (allowRefresh) {
      allowRefresh = false;
    } else {
      return;
    }
  }
  var pixel = map.getPixelFromCoordinate(event.coordinate);
  var node = null;
  var rank = -1;
  map.forEachFeatureAtPixel(pixel, function(feature) {
    if (feature.getProperties()["rank"] > rank) {
      rank = feature.getProperties["rank"];
      node = feature;
    }
  }, {
    layerFilter: function(layer) {
      return layer === nodeLayer;
    },
    "hitTolerance" : 20});
  var release = false;
  if (event.type == 'translateend') {
    release = true;
  }
  updateMarker(event.features.item(0), node, release);
}

// LOGIC
function updateMarker(marker, node, release) {
  var source;
  var target;

  if (node) {
    if (release) {
      marker.setGeometry(node.getGeometry().clone());
      if (marker.get("node") == node) {
        return;
      }
      marker.set("node", node);
      source = sourceMarker.get("node");
      target = targetMarker.get("node");
    } else {
      if (marker == sourceMarker) {
        source = node;
        target = targetMarker.get("node");
      } else {
        source = sourceMarker.get("node");
        target = node;
      }
    }
    createRoute(source, target, release);
  } else {
    routeLayer.setSource(null);
  }
}


function createRoute(source, target, release) {
  if (source === undefined || target === undefined) {
    return;
  }
  var sourceId = source.getId().split(".")[1];
  var targetId = target.getId().split(".")[1];
  var rail = document.getElementById('toggle-rail').checked;
  var ship = document.getElementById('toggle-ship').checked;
  var modes = 'ferry,tram,chaussee,road,metro';
  if (rail) {
    modes += ',rail';
  }
  if (ship) {
    modes += ',ship';
  }
  modes = modes.replace(/,/g, '%5C,');

  var wfsRequest = new XMLHttpRequest();
  var wfsParams = 'service=WFS&' +
      'version=' + wfsVersion + '&' +
      'request=GetFeature&' +
      'typeNames=' + wfsFeaturePrefix + ':' + 'route' + '&' +
      'outputFormat=' + wfsOutputFormat + '&' +
      'srsname=EPSG:3857' + '&' +
      'viewparams=' +
      'modes:' + modes + ';' +
      'source:' + sourceId + ';' +
      'target:' + targetId;
  var wfsUrlWithParams = wfsUrl + '/ows/?' + wfsParams;
  wfsRequest.open('GET', wfsUrlWithParams, true);
  wfsRequest.onreadystatechange = function() {
    if (wfsRequest.readyState == 4 && wfsRequest.status == 200) {
      var wfsSource = new VectorSource({
        format: new GeoJSON(),
        url: function(extent) {
          return wfsUrlWithParams;
        }
      });
      routeLayer.setSource(wfsSource);
      var gj = new GeoJSON().readFeatures(wfsRequest.responseText);
      updateRouteInformation(gj, release);
    }
  };
  wfsRequest.send();
}

function getModeIcon(mode) {
  return `<img src="${mode}.png" title="${mode}" class="icon">`;
}

function updateRouteInformation(features, release) {
  var titleElement = document.getElementById('information-title');
  var contentElement = document.getElementById('information-content');
  var text = '';
  if (features.length > 0) {
    var segments = [];
    var segment = {};
    var cost = 0;
    var lastMode = null;
    var nodes = [];
    features.forEach(function(f) {
      if (f.get('mode') == lastMode) {
        cost += f.get('cost');
        nodes.push(f.get('target'));
      } else {
        if (lastMode != null) {
          segments.push(segment);
        }
        segment = {};
        cost = f.get('cost');
        nodes = [f.get('source')];
        nodes.push(f.get('target'));
        lastMode = f.get('mode');
      }
      segment['cost'] = cost;
      segment['mode'] = lastMode;
      segment['nodes'] = nodes;
    });

    segments.push(segment);
    var totalCost = 0;
    var n = 0;

    segments.forEach(function(segment) {
      n += 1;
      totalCost += segment['cost'];
      nodes = segment['nodes'];
      var s = nodes.shift();
      var e = nodes.pop();
      var id = 'route-detail' + n;
      var mode = getModeIcon(segment['mode']);
      text += '<hr/><p>';
      text += mode;
      text += s + ' - ' + e;
      if (nodes.length > 0) {
        text += ' <span class="route-detail-click" onclick="toggleContent(\'' + id + '\')">[details]</span>';
      }
      text += ' <span class="trip-time">' + tripTime(segment['cost']) + '</span>';
      if (nodes.length > 0) {
        text += '<span id="' + id + '" class="route-detail"> via <em>' + nodes.join('</em>, <em>');
        text += '</em></span>';
      }
      text += '</p>';
    });
  }

  var title = '<p class="information-title"><b>' + features[0].get('source') + '</b> - <b>' + features.slice(-1)[0].get('target') + '</b>';
  title += '<span class="trip-time">' + tripTime(totalCost) + '</span></p>';

  titleElement.innerHTML = title;
  contentElement.innerHTML = text;
}

function tripTime(hours) {
  return humanizeDuration(hours * 60 * 60 * 1000, {round: true, units: ["d", "h", "m"], largest: 2});
}

var popup = new Overlay({
  element: document.getElementById('popup'),
  autoPan: true
});
map.addOverlay(popup);

// Add an event listener to the map that listens for the pointermove event
map.on('pointermove', function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
    return feature;
  }, {
    layerFilter: function(layer) {
      return layer === routeLayer;
    }
  });

  if (feature) {
    var coord = evt.coordinate;
    popup.setPosition(coord);
    var content = document.getElementById('popup-content');
    var cost = tripTime(feature.get('cost'));
    var text = feature.get('source') + ' - ' + feature.get('target') +
      '<br/><em>' + cost + ' by ' + feature.get('mode') + '</em>';
    content.innerHTML = text;
    popup.getElement().style.display = 'block';
  } else {
    popup.getElement().style.display = 'none';
  }
});

function toggleContent(contentId) {
  const content = document.getElementById(contentId);
  if (content.style.display === 'none' || content.style.display === '') {
      content.style.display = 'block';
  } else {
      content.style.display = 'none';
  }
}

function updateMode() {
  createRoute(sourceMarker.get("node"), targetMarker.get("node"), true);
}
window.updateMode = updateMode;
window.toggleContent = toggleContent;
