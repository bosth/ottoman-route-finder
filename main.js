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
import {Icon, Circle, Fill, Stroke, Style, Text} from 'ol/style.js';
import Collection from "ol/Collection";
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import Translate from 'ol/interaction/Translate.js';
import Attribution from 'ol/control/Attribution';
import {all} from 'ol/loadingstrategy';

const wfsUrl = 'http://localhost:8080/geoserver';
const wfsFeaturePrefix = 'ottoman';
const wfsOutputFormat = 'application/json';
const wfsVersion = '2.0.0';
const key = 'yvGZ8CUmA6zbqBiHuxk5';
var allowRefresh = true;
setInterval(function(){allowRefresh = true}, 30);


var citySource = new VectorSource({
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

const style = new Style({
  text: new Text({
    font: '14px "Open Sans,sans-serif"',
    placement: 'point',
    overflow: true,
    fill: new Fill({
      color: '#000',
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 4,
    }),
  }),
});

var cityLayer = new VectorLayer({
  target: 'points',
  source: citySource,
  style: function (feature) {
    style.getText().setText(feature.get('name'));
    return style;
  },
});

const routeLayer = new VectorLayer({
  style: new Style({
    stroke: new Stroke({
      color: [0, 0, 255, 0.6],
      width: 8,
      lineDash: [8,16],
      lineDashOffset: 6
    })
  })
});

// Create two markers
var marker1 = new Feature({
  geometry: new Point(fromLonLat([30, 40.5])),
});
var marker2 = new Feature({
  geometry: new Point(fromLonLat([29, 41])),
});

// Create a vector layer to hold the markers
var markerLayer = new VectorLayer({
  source: new VectorSource({
    features: [marker1, marker2],
  }),
  style: new Style({
    image: new Icon({
      src: 'https://openlayers.org/en/latest/examples/data/icon.png',
      anchor: [0.5, 0],
      anchorOrigin: 'bottom-right'
    }),
  }),
});

const attribution = new Attribution({
  collapsible: false,
});

const tileSource = new TileJSON({
  url: `https://api.maptiler.com/tiles/hillshade/tiles.json?key=${key}`, // source URL
  tileSize: 512,
  crossOrigin: 'anonymous'
});

// Create the map
var map = new Map({
  target: 'map',
  layers: [
    new TileLayer({source: tileSource}),
    markerLayer,
    cityLayer,
    routeLayer
  ],
  view: new View({
    center: fromLonLat([30, 41]),
    zoom: 8,
  }),
});

// Make the markers draggable
var movingInteraction1 = new Translate({
  features: new Collection([marker1]),
});
var movingInteraction2 = new Translate({
  features: new Collection([marker2]),
});

movingInteraction1.on(['translateend', 'translating'], onMarkerMove);
movingInteraction2.on(['translateend', 'translating'], onMarkerMove);

map.addInteraction(movingInteraction1);
map.addInteraction(movingInteraction2);

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
  updateRoute(marker, coordinates, tolerance, snap);
}

function updateRoute(marker, coordinates, tolerance, snap) {
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
          source = marker1;
          target = marker2;
        } else {
          if (marker == marker1) {
            source = gj[0];
            target = marker2;
          } else {
            source = marker1;
            target = gj[0];
          }
        }
        createRoute(source.getProperties().id, target.getProperties().id);
      } else {
        routeLayer.setSource(null);
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

updateRoute(marker1, marker1.getGeometry().getCoordinates(), 10000, true);
updateRoute(marker2, marker2.getGeometry().getCoordinates(), 10000, true);
