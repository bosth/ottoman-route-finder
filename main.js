import "./style.css";
import {Map, View} from "ol";
import {fromLonLat} from 'ol/proj';
import WFS from 'ol/format/WFS';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import TileJSON from "ol/source/TileJSON";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import {Icon, Circle, Fill, Stroke, Style, Text, RegularShape} from 'ol/style';
import Collection from "ol/Collection";
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import Translate from 'ol/interaction/Translate';
import Attribution from 'ol/control/Attribution';
import {all} from 'ol/loadingstrategy';
import Overlay from 'ol/Overlay';
import prettyMilliseconds from 'pretty-ms';

const wfsUrl = 'https://jaxartes.net/geoserver';
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

const placeStyle = function(feature) {
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
      fill: new Fill({
        color: '#000',
      }),
      textAlign: 'left',
      textBaseline: 'bottom',
      stroke: new Stroke({
        color: '#fff',
        width: 4,
      }),
    }),
  });
  style.getText().setText(feature.get('name'));
  return style;
};


// FEATURES
var sourceMarker = new Feature({
  geometry: new Point(fromLonLat([30, 40.5])),
});
var targetMarker = new Feature({
  geometry: new Point(fromLonLat([29, 41])),
});


// SOURCES
var placeSource = new VectorSource({
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
var placeLayer = new VectorLayer({
  source: placeSource,
  style: placeStyle,
  declutter: true,
});

const pathLayer = new VectorLayer({
  source: pathSource,
  style: pathStyle
});

const routeLayer = new VectorLayer({
  style: new Style({
    stroke: new Stroke({
      color: [0, 0, 255, 0.6],
      width: 8,
    })
  })
});

var markerLayer = new VectorLayer({
  source: new VectorSource({
    features: [sourceMarker, targetMarker],
  }),
  style: new Style({
    image: new Icon({
      src: 'https://openlayers.org/en/latest/examples/data/icon.png',
      anchor: [0.5, 0],
      anchorOrigin: 'bottom-right'
    }),
  }),
});


// MAP
var map = new Map({
  target: 'map',
  layers: [
    new TileLayer({source: tileSource}),
    pathLayer,
    placeLayer,
    routeLayer,
    markerLayer,
  ],
  view: new View({
    center: fromLonLat([30, 41]),
    zoom: 8,
  }),
});

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

// CALLBACKS
function onMarkerMove(event) {
  var snap = false;
  if (event.type == 'translating') {
    if (allowRefresh) {
      allowRefresh = false;
    } else {
      return;
    }
  }
  if (event.type == 'translateend') {
    snap = true;
  }
  var marker = event.features.item(0);
  var coordinates = event.coordinate;
  var tolerance = event.target.map_.getView().getResolution() * 40;
  updateMarker(marker, coordinates, tolerance, snap);
}


// LOGIC
function updateMarker(marker, coordinates, tolerance, snap) {
  var x = coordinates[0];
  var y = coordinates[1];

  var wfsRequest = new XMLHttpRequest();
  var wfsParams = 'service=WFS&' +
      'version=' + wfsVersion + '&' +
      'request=GetFeature&' +
      'typeNames=' + wfsFeaturePrefix + ':' + 'node_proximity' + '&' +
      'outputFormat=' + wfsOutputFormat + '&' +
      'srsname=EPSG:3857&' +
      'viewparams=' +
        'x:' + x + ';' +
        'y:' + y + ';' +
        'tolerance:' + tolerance;
  var wfsUrlWithParams = wfsUrl + '/ows/?' + wfsParams;
  wfsRequest.open('GET', wfsUrlWithParams, true);
  wfsRequest.onreadystatechange = function() {
    if (wfsRequest.readyState == 4 && wfsRequest.status == 200) {
      var gj = new GeoJSON().readFeatures(wfsRequest.responseText);
      var source;
      var target;
      if (gj.length > 0) {
        if (snap) {
          marker.setProperties(gj[0].getProperties());
          source = sourceMarker;
          target = targetMarker;
        } else {
          if (marker == sourceMarker) {
            source = gj[0];
            target = targetMarker;
          } else {
            source = sourceMarker;
            target = gj[0];
          }
        }
        createRoute(source.getProperties().id, target.getProperties().id);
      } else {
        routeLayer.setSource(null);
        if (snap) {
          if (marker == sourceMarker) {
            source = null;
          } else {
            target = null;
          }
        }
      }
    }
  };
  wfsRequest.send();
}

function createRoute(source, target) {
  if (source === undefined || target === undefined) {
    return;
  }
  var wfsRequest = new XMLHttpRequest();
  var wfsParams = 'service=WFS&' +
      'version=' + wfsVersion + '&' +
      'request=GetFeature&' +
      'typeNames=' + wfsFeaturePrefix + ':' + 'route' + '&' +
      'outputFormat=' + wfsOutputFormat + '&' +
      'srsname=EPSG:3857' + '&' +
      'viewparams=' +
      'source:' + source + ';' +
      'target:' + target + ';';
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
    }
  };
  wfsRequest.send();
}

updateMarker(sourceMarker, sourceMarker.getGeometry().getCoordinates(), 10000, true);
updateMarker(targetMarker, targetMarker.getGeometry().getCoordinates(), 10000, true);

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
    var cost = prettyMilliseconds(feature.get('cost') * 60 * 60 * 1000, {compact: true});
    var text = feature.get('source') + ' - ' + feature.get('target') +
      '<br/><em>' + cost + ' by ' + feature.get('mode') + '</em>';

    content.innerHTML = text;
    popup.getElement().style.display = 'block';
  } else {
    popup.getElement().style.display = 'none';
  }
});
