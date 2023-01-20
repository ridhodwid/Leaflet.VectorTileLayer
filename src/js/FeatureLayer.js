/*
 * Copyright 2017, Joachim Kuebart <joachim.kuebart@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the
 *      distribution.
 *
 *   3. Neither the name of the copyright holder nor the names of its
 *      contributors may be used to endorse or promote products derived
 *      from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/*property
    LineString, Point, Polygon, Unknown, _map, addClass, addInteractiveTarget,
    addTo, appendChild, applyBasicStyle, applyImageStyle, applyPathStyle, bbox,
    className, color, create, dashArray, dashOffset, feature,
    fill, fillColor, fillOpacity, fillRule, graphics, hidden, icon, iconAnchor,
    iconSize, iconUrl, interactionPath, interactionWeight, interactive,
    layerName, lineCap, lineJoin, loadGeometry, map, opacity, options,
    pointsToPath, properties, prototype, radius, removeAttribute, removeClass,
    removeFrom, removeInteractiveTarget, scaleBy, scalePoint, setAttribute,
    setStyle, stroke, type, visiblePath, weight, x, y
*/

import {
    CircleMarker,
    DomUtil,
    Layer,
    Path,
    Polygon,
    SVG,
    bounds,
    extend,
    point
} from "leaflet";

export const FeatureTypes = {
    Unknown: 0,
    Point: 1,
    LineString: 2,
    Polygon: 3
};

export function featureLayer(feature, layerName, pxPerExtent, options) {
    const self = new Layer(options);

    self.feature = feature;
    self.layerName = layerName;

    // Compatibility with Leaflet.VectorGrid
    self.properties = feature.properties;

    /*
     * FeatureLayers only serve as event targets and are never actually
     * "added" to the map, so we override the base class's addTo.
     */
    self.addTo = function addTo(map) {
        // Required by addInteractiveTarget.
        self._map = map;
        self.addInteractiveTarget(self.graphics);
    };

    self.removeFrom = function removeFrom() {
        self.removeInteractiveTarget(self.graphics);
        delete self._map;
    };

    self.applyBasicStyle = function applyBasicStyle(element, style) {
        if (style.interactive) {
            /*
             * Leaflet's "interactive" class only applies to
             * renderers that are immediate descendants of a
             * pane.
             */
            element.setAttribute("pointer-events", "auto");
            DomUtil.addClass(element, "leaflet-interactive");
        } else {
            DomUtil.removeClass(element, "leaflet-interactive");
            element.removeAttribute("pointer-events");
        }

        if (style.hidden) {
            element.setAttribute("visibility", "hidden");
        }
        else {
            element.removeAttribute("visibility");
        }
    };

    self.applyPathStyle = function applyPathStyle(path, style) {
        style = extend({}, options, style);

        if (style.stroke) {
            path.setAttribute("stroke", style.color);
            path.setAttribute("stroke-opacity", style.opacity);
            path.setAttribute("stroke-width", style.weight);
            path.setAttribute("stroke-linecap", style.lineCap);
            path.setAttribute("stroke-linejoin", style.lineJoin);

            if (style.dashArray) {
                path.setAttribute("stroke-dasharray", style.dashArray);
            } else {
                path.removeAttribute("stroke-dasharray");
            }

            if (style.dashOffset) {
                path.setAttribute("stroke-dashoffset", style.dashOffset);
            } else {
                path.removeAttribute("stroke-dashoffset");
            }
        } else {
            path.setAttribute("stroke", "none");
        }

        if (style.fill) {
            path.setAttribute("fill", style.fillColor || style.color);
            path.setAttribute("fill-opacity", style.fillOpacity);
            path.setAttribute("fill-rule", style.fillRule || "evenodd");
        } else {
            path.setAttribute("fill", "none");
        }

        return path;
    };

    self.applyImageStyle = function applyImageStyle(image, style) {
        if (style.icon) {
            image.setAttribute("width", style.icon.options.iconSize[0]);
            image.setAttribute("height", style.icon.options.iconSize[1]);
            image.setAttribute("href", style.icon.options.iconUrl);
        }
    };

    self.scalePoint = function scalePoint(p) {
        return point(p).scaleBy(pxPerExtent);
    };

    self.bbox = function bbox() {
        const [x0, y0, x1, y1] = feature.bbox();
        return bounds(self.scalePoint([x0, y0]), self.scalePoint([x1, y1]));
    };

    return self;
}

export function featurePathLayer(feature, layerName, pxPerExtent, options) {
    options = extend(
        {},
        (
            FeatureTypes.Polygon === feature.type
            ? Polygon.prototype.options
            : (
                FeatureTypes.LineString === feature.type
                ? Path.prototype.options
                : CircleMarker.prototype.options
            )
        ),
        options
    );

    const self = featureLayer(feature, layerName, pxPerExtent, options);

    self.setStyle = function setStyle(style) {
        self.applyBasicStyle(self.graphics, style);
        self.applyPathStyle(self.visiblePath, style);
    };

    const geometry = feature.loadGeometry();
    function createPoint() {
        const r = options.radius;
        const pt = self.scalePoint(geometry[0][0]);
        const arc = `a${r} ${r} 0 0 0 0 `;
        return `M${pt.x} ${pt.y - r}${arc}${2 * r}${arc}${-2 * r}`;
    }

    function createPath() {
        return SVG.pointsToPath(
            geometry.map((ring) => ring.map(self.scalePoint)),
            FeatureTypes.Polygon === self.feature.type
        );
    }

    self.visiblePath = SVG.create("path");

    const pathPoints = (
        FeatureTypes.Point === feature.type
        ? createPoint()
        : createPath()
    );
    self.visiblePath.setAttribute("d", pathPoints);

    if (
        FeatureTypes.LineString === self.feature.type &&
        options.interactive
    ) {
        // For an interactive unfilled path, we are going to create a
        // group with the above visible, styled line plus a thicker,
        // invisible version of the same line.
        self.interactionPath = SVG.create("path");
        self.interactionPath.setAttribute("d", pathPoints);
        self.applyPathStyle(self.interactionPath, {
            opacity: 0.0,
            weight: options.interactionWeight || 10
        });

        self.graphics = SVG.create("g");
        self.graphics.appendChild(self.visiblePath);
        self.graphics.appendChild(self.interactionPath);
    }
    else {
        self.graphics = self.visiblePath;
    }
    if (options.className) {
        DomUtil.addClass(self.visiblePath, options.className);
    }

    return self;
}

export function featureIconLayer(feature, layerName, pxPerExtent, options) {
    const self = featureLayer(feature, layerName, pxPerExtent, options);

    self.setStyle = function setStyle(options) {
        self.applyBasicStyle(self.graphics, options);
        self.applyImageStyle(self.graphics, options);
    };

    self.graphics = SVG.create("image");

    const pos = self.scalePoint(feature.loadGeometry()[0][0]);
    const anchor = options.icon.options.iconAnchor || [0,0];
    self.graphics.setAttribute("x", pos.x - anchor[0]);
    self.graphics.setAttribute("y", pos.y - anchor[1]);

    return self;
}

export function defaultFeatureLayer(feature, layerName, pxPerExtent, options) {
    switch(feature.type) {
    case FeatureTypes.Point:
        if (options.icon) {
            return featureIconLayer(feature, layerName, pxPerExtent, options);
        }
        return featurePathLayer(feature, layerName, pxPerExtent, options);

    case FeatureTypes.Polygon:
    case FeatureTypes.LineString:
        return featurePathLayer(feature, layerName, pxPerExtent, options);

    default:
        throw new Error("Unknown feature type");
    }
}
