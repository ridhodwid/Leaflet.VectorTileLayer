Leaflet.VectorTileLayer
=======================

This module provides a [Leaflet][L] layer that displays [vector tiles][VT].
It is very similar to [`Leaflet.VectorGrid`][LVG].

The biggest difference to `VectorGrid` is the [styling](#styling).
`VectorTileLayer` also supports two options `min/maxDetailZoom` which are
subtly different from `VectorGrid`'s `min/maxNativeZoom`. Both provide the
possibility to specify a range of zoom levels that offer an optimal
trade-off between detail and size. When using the `native` variants, tiles
above or below the zoom range are scaled, changing the stroke weight. The
`detail` settings offer the same trade-off while still rendering the tiles
at the correct zoom levels, meaning stroke weight is visually consistent
across all zoom levels.

Furthermore, `VectorTileLayer` gives clients full control over the SVG DOM
created for vector tile features. The layer option `featureToLayer` accepts
a function that can return any graphics for visualising a given feature
while making it easy to fall back to the default implementation.

In contrast to `VectorGrid`, this class has been designed as much as
possible in terms of Leaflet's public API. This makes it more likely to
continue working with future versions of Leaflet.


Use
---

Loads vector tiles from a URL template like

    https://{s}.example.com/tiles/{z}/{x}/{y}.pbf

The URL template also supports the undocumented `{-y}` option for
»[inverted Y][Y]« if the map's [coordinate reference system][CRS] is finite
(the default).

This pacakge can be used as an ES6 module.

```js
import vectorTileLayer from 'leaflet-vector-tile-layer';

const tileLayer = vectorTileLayer(url, options);
```

The AMD build comes with all dependencies included. If imported as an ES6
module, the dependencies need to be made available to the build system, for
example:

```sh
$ npm install @mapbox/vector-tile pbf
```

See this package's development dependencies for version information.


Layer options
-------------

The main difference to `VectorGrid` is that `VectorTileLayer` takes a
different approach to styling. Whereas `VectorGrid` only supports styling a
previously known set of vector-tile layer names, this class allows
specifying a single style for all layers irrespective of their names. When
specifying a function, it is called with the vector-tile feature, the layer
name and the current zoom level, enabling clients can handle layer names
dynamically or ignore them altogether.

Another feature not supported by `VectorGrid` is a `setStyle()` call which
allows changing the style of the entire layer.

For compatibility, support for the `vectorTileLayerStyles` option and
`set/resetFeatureStyle()` method is also provided.

`VectorTileLayer` also supports ordering the layers based on their names
using an option like `layers: ["a", "b", "c"]`.

Another added feature of `VectorTileLayer` is a `getBounds()` function.
After the `load` event, it returns the bounds occupied by the features on
all currently loaded tiles.

`VectorTileLayer` allows clients to create their own DOM representation for
any given layer. A function provided to the `featureToLayer` option takes a
vector-tile feature, the layer name, the number of SVG coordinate units per
vector-tile unit and the feature's style object. It should return an object
that eventually delegates to [`Leaflet.Layer`][LYR] and provides the
following:
  - a `bbox()` function that returns the feature's bounding box in SVG
    coordinate units.
  - a `graphics` property that holds the top-level SVG DOM element.
  - a `setStyle(style)` function that takes a style object and applies it
    to the generated SVG elements.

`VectorTileLayer` supports all options provided by [`GridLayer`][GL].
Additionally, the following options are provided:

```js
const url = 'https://{s}.example.com/tiles/{z}/{x}/{y}.pbf';
const options = {
        // A function that will be passed a vector-tile feature, the layer
        // name, the number of SVG coordinate units per vector-tile unit
        // and the feature's style object to create each feature layer.
        featureToLayer, // default undefined

        // A function that will be used to decide whether to include a
        // feature or not. If specified, it will be passed the vector-tile
        // feature, the layer name and the zoom level. The default is to
        // include all features.
        filter, // default undefined

        // A function that receives a list of vector-tile layer names and
        // the zoom level and returns the names in the order in which they
        // should be rendered, from bottom to top. The default is to render
        // all layers as they appear in the tile.
        layerOrder, // default undefined

        // An array of vector-tile layer names from bottom to top. Layers
        // that are missing from this list will not be rendered. The
        // default is to render all layers as they appear in the tile.
        layers, // default undefined

        // Specify zoom range in which tiles are loaded. Tiles will be
        // rendered from the same data for Zoom levels outside the range.
        minDetailZoom, // default undefined
        maxDetailZoom, // default undefined

        // Styling options.
        style, // default undefined

        // This works like the same option for `Leaflet.VectorGrid`.
        // Ignored if style is specified.
        vectorTileLayerStyles, // default undefined
};

const layer = vectorTileLayer(url, options);
```

The style can be updated at any time using the `setStyle()` method.

```js
layer.setStyle({ weight: 3 });
```

All omitted options will be substituted by the default options for
[`L.CircleMarker`][CM], [`L.Polyline`][PL] or [`L.Polygon`][PG], as
appropriate.


Style options
-------------

Style options are interpreted by the individual feature layers. For points,
these are `L.CircleMarker` options, or the `icon` property supplies an
`L.Icon` to determine the appearance. For polylines or polygons, these are
`L.Path` options. If the `options.style` property is a function, it will be
passed the vector-tile feature, the layer name and the zoom level as
parameters.

If the style option `interactive` is `true`, the created SVG elements will
listen to mouse events.

The style option `hidden` permits any feature to be hidden. It operates by
setting the SVG attribute `visibility` to `hidden`.


Feature layer helpers
---------------------

A few functions are made available to simplify creating custom layers for
individual features:

 - `defaultFeatureLayer(feature, layerName, pxPerExtent, options)`. This
   function is used if the `featureToLayer` option is unset. It takes the
   vector-tile feature, the layer name, the number of SVG coordinate units
   per vector-tile unit and a style object and returns an appropriate layer
   object to visualise it.
 - `featureCircleLayer(feature, layerName, pxPerExtent, options)` returns a
   layer object that visualises a vector-tile point feature.
 - `featureIconLayer(feature, layerName, pxPerExtent, options)` returns a
   layer object that visualises a vector-tile point feature using the
   [`Leaflet.Icon`][ICO] specified by `options.icon`.
 - `featurePathLayer(feature, layerName, pxPerExtent, options)` returns a
   layer object to visualise a vector-tile line or polygon feature.
 - `featureLayerBase(feature, layerName, pxPerExtent, options)` can be used
   to create a layer object for a vector-tile feature. It returns an object
   that eventually delegates to a [`Leaflet.Layer`][LYR] instantiated with
   the given options. The delegating object must provide:

     - a `graphics` property that holds the top-level SVG DOM element.
     - a `setStyle(style)` method that applies the given style to the
       layer's DOM after enhancing it with the feature layer's default
       options.

   Objects created by this function provide the following:

     - An `applyOptions(style)` function that should be called by a
       delegating object once the `graphics` property is initialised. It
       applies the `style.className` option to it and then invokes
       `setStyle({})` to allow the delegating object to apply its default
       style.
     - A `bbox()` function that returns the feature's bounding box in SVG
       coordinate units and is used by `VectorTileLayer.getBounds()`.
     - A `scalePoint(point)` function converts from vector-tile coordinates
       to SVG coordinates.

A few functions are provided to simplify the implementation of
`setStyle(style)` functions:

  - `applyBasicStyle(element, style)` applies the `style.interactive` and
    `style.hidden` options to the given SVG DOM element.
  - `applyImageStyle(element, style)` applies the `height`, `width` and
    `href` proprties from the [`Leaflet.Icon`][ICO] object in `style.icon`
    to the SVG `<image>` element.
  - `applyPathStyle(element, style)` applies [`Leaflet.Path`][PT] style
    properties to the SVG `<path>` element.


Feature layer example
---------------------

The `featureToLayer` option on `VectorTileLayer` accepts a function that
can render custom SVG elements depending on feature properties, options,
layer names and zoom level.

Example drawing a thickened transparent overlay for polyline interaction:
```js
import {SVG} from "leaflet";
import {defaultFeatureLayer, featureLayerBase} from "leaflet-vector-tile-layer";

function interactiveLinesLayer(feature, layerName, pxPerExtent, options) {
    // Construct a base feature layer.
    const self = featureLayerBase(feature, layerName, pxPerExtent, options);

    // Compose this feature layer of two sub-layers, one for the visible
    // line controlled by `options` and a second controlled by the path
    // options contained in `options.interaction`. Both will share the same
    // path geometry.
    self.visibleLine = defaultFeatureLayer(
        feature,
        layerName,
        pxPerExtent,
        options
    );
    self.interactionLine = defaultFeatureLayer(
        feature,
        layerName,
        pxPerExtent,
        options.interaction
    );

    // Place the two layers in an SVG group.
    const group = SVG.create("g");
    group.appendChild(self.visibleLine.graphics);
    group.appendChild(self.interactionLine.graphics);
    self.graphics = group;

    // Setting of style is delegated to the sub layers.
    self.setStyle = function setStyle(style) {
        self.visibleLine.setStyle(style);
        self.interactionLine.setStyle(style.interaction);
    };

    // Initial setup of this feature layer.
    self.applyOptions(options);

    return self;
}

// Example options for the above custom renderer:
const interactiveLineOptions = {
    color: "red",
    weight: 2,
    interaction: {
        opacity: 0.0,
        weight: 10
    }
};
```


Events
------

Events attached to this layer provide access to the vector-tile `feature`
and the `layerName` through their `layer` attribute. For compatibility with
`VectorGrid`, the feature's `properties` are also made directly available.


Installing and building
-----------------------

You can install this package using

```sh
$ npm install leaflet-vector-tile-layer
```

It can be built by

```sh
$ npm run build
```


Limitations
-----------

At this time, only SVG rendering and vector tiles in [`protobuf`][PBF]
format are supported, but support for other renderers or formats may be
added through options in the future.


[CM]: https://leafletjs.com/reference.html#circlemarker
[CRS]: https://leafletjs.com/reference#crs
[ICO]: https://leafletjs.com/reference.html#icon
[GL]: https://leafletjs.com/reference.html#gridlayer
[LVG]:  https://github.com/Leaflet/Leaflet.VectorGrid
[LYR]: https://leafletjs.com/reference.html#layer
[L]:    http://leafletjs.com/
[PBF]:  https://developers.google.com/protocol-buffers/
[PG]: https://leafletjs.com/reference.html#polygon
[PL]: https://leafletjs.com/reference.html#polyline
[PT]: https://leafletjs.com/reference.html#path
[VT]:   https://github.com/mapbox/vector-tile-spec
[Y]:    https://github.com/Leaflet/Leaflet/issues/4284
