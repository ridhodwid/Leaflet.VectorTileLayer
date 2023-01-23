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

        // Styling options. For points, these are `L.CircleMarker` options,
        // or the `icon` property supplies an `L.Icon` to determine the
        // appearance. For polylines or polygons, these are `L.Path`
        // options. If this property is a function, it will be passed the
        // vector-tile feature, the layer name and the zoom level as
        // parameters.
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

Custom Feature Rendering
------------------------

The `featureToLayer` option on `VectorTileLayer` provides a function that can
render custom SVG elements depending on feature properties, options, layer
names and zoom level.

**TBD: explanation of superclass, utility classes/functions, default constructor, etc.**

Example drawing a thickened transparent overlay for polyline interaction:
```js
const interactiveLinesLayer = (feature, layerName, pxPerExtent, options) => {
    // construct a base FeatureLayer
    const self = featureLayerBase(feature, layerName, pxPerExtent, options);

    // Compose this FeatureLayer of two sub-layers, one for the visible line controlled by `options`
    // and a second controlled by the path options contained in `options.interaction`. Both will
    // share the same path geometry.
    self.visibleLine = defaultFeatureLayer(feature, layerName, pxPerExtent, options);
    self.interactionLine = defaultFeatureLayer(feature, layerName, pxPerExtent, options.interaction);

    // Place the two layers in an SVG group.
    const group = SVG.create("g");
    group.appendChild(self.visibleLine.graphics);
    group.appendChild(self.interactionLine.graphics);
    self.graphics = group;

    // Setting of style is delegated to the sub layers.
    self.setStyle = (style) => {
        self.visibleLine.setStyle(style);
        self.interactionLine.setStyle(style.interaction);
    };

    // Initial setup of this FeatureLayer.
    self.applyOptions(options);

    return self;
};

// Example options for the above custom renderer:
const interactiveLineOptions = {
    color: 'red',
    weight: 2,
    interaction: {
        opacity: 0.0,
        weight: 10
    }
};

```


Feature-level Visibility Control
--------------------------------

The style option `hidden` permits any feature to be hidden. It operates by setting the SVG
attribute `visibility` to `hidden`.


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
[GL]: https://leafletjs.com/reference.html#gridlayer
[L]:    http://leafletjs.com/
[LVG]:  https://github.com/Leaflet/Leaflet.VectorGrid
[PBF]:  https://developers.google.com/protocol-buffers/
[PG]: https://leafletjs.com/reference.html#polygon
[PL]: https://leafletjs.com/reference.html#polyline
[VT]:   https://github.com/mapbox/vector-tile-spec
[Y]:    https://github.com/Leaflet/Leaflet/issues/4284
