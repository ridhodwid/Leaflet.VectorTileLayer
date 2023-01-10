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
    _map, addClass, addInteractiveTarget, addTo, appendChild, bbox, className,
    color, create, dashArray, dashOffset, feature, fill, fillColor, fillOpacity,
    fillRule, freeze, interactive, lineCap, lineJoin, loadGeometry,
    map, opacity, options, pointsToPath, properties, prototype, removeAttribute,
    removeClass, removeFrom, removeInteractiveTarget, scaleBy, setAttribute,
    setStyle, stroke, type, types, weight
*/

import {
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
}

function featureLayer(feature, pxPerExtent, options) {
    const self = new Layer(options);

    options = extend({}, options);

    self.feature = feature;

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

    self.applyBasicStyle = function applyBasicStyle(element, options) {
        if (options.interactive) {
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

        if (options.className) {
            DomUtil.addClass(element, options.className);
        }
    };

    self.applyPathStyle = function applyPathStyle(path, options) {
        options = extend(
            {},
            (
                FeatureTypes.Polygon === self.feature.type
                ? Polygon.prototype.options
                : Path.prototype.options
            ),
            options
        );

        if (options.stroke) {
            path.setAttribute("stroke", options.color);
            path.setAttribute("stroke-opacity", options.opacity);
            path.setAttribute("stroke-width", options.weight);
            path.setAttribute("stroke-linecap", options.lineCap);
            path.setAttribute("stroke-linejoin", options.lineJoin);

            if (options.dashArray) {
                path.setAttribute("stroke-dasharray", options.dashArray);
            } else {
                path.removeAttribute("stroke-dasharray");
            }

            if (options.dashOffset) {
                path.setAttribute("stroke-dashoffset", options.dashOffset);
            } else {
                path.removeAttribute("stroke-dashoffset");
            }
        } else {
            path.setAttribute("stroke", "none");
        }

        if (options.fill) {
            path.setAttribute("fill", options.fillColor || options.color);
            path.setAttribute("fill-opacity", options.fillOpacity);
            path.setAttribute("fill-rule", options.fillRule || "evenodd");
        } else {
            path.setAttribute("fill", "none");
        }

        return path;
    };

    self.applyImageStyle = function applyImageStyle(image, options) {
        if (options.icon) {
            image.setAttribute("width", options.icon.options.iconSize[0]);
            image.setAttribute("height", options.icon.options.iconSize[1]);
            image.setAttribute("href", options.icon.options.iconUrl)
        }
    }

    self.scalePoint = function scalePoint(p) {
        return point(p).scaleBy(pxPerExtent);
    };

    self.bbox = function bbox() {
        const [x0, y0, x1, y1] = feature.bbox();
        return bounds(self.scalePoint([x0, y0]), self.scalePoint([x1, y1]));
    };
    
    return self;
}

export function featurePathLayer(feature, pxPerExtent, options) {
    const self = featureLayer(feature, pxPerExtent, options);

    self.setStyle = function setStyle(options) {
        self.applyBasicStyle(self.graphics, options);
        self.applyPathStyle(self.visiblePath, options);
    };

    self.createGraphics = function createGraphics() {
        self.visiblePath = SVG.create("path");

        const pathPoints = SVG.pointsToPath(
            feature.loadGeometry().map((ring) => ring.map(self.scalePoint)),
            FeatureTypes.Polygon === self.feature.type
        );
        self.visiblePath.setAttribute("d", pathPoints);

        if (FeatureTypes.LineString === self.feature.type && options.interactive) {
            // For an interactive unfilled path, we are going to create a
            // group with the above visible, styled line plus a thicker,
            // invisible version of the same line.
            self.interactionPath = SVG.create("path");
            self.interactionPath.setAttribute("d", pathPoints);
            self.applyPathStyle(self.interactionPath, {
                opacity: 0.20,
                weight: options.interactionWeight || 10
            });

            self.graphics = SVG.create("g");
            self.graphics.appendChild(self.visiblePath);
            self.graphics.appendChild(self.interactionPath);
        }
        else {
            self.graphics = self.visiblePath;
        }
        return self.graphics;
    };

    return self;
}

export function featureIconLayer(feature, pxPerExtent, options) {
    const self = featureLayer(feature, pxPerExtent, options);

    self.setStyle = function setStyle(options) {
        self.applyBasicStyle(self.graphics, options);
        self.applyImageStyle(self.graphics, options);
    };

    self.createGraphics = function createGraphics() {
        self.graphics = SVG.create("image");

        const pos = self.scalePoint(feature.loadGeometry()[0][0]);
        const anchor = options.icon.options.iconAnchor || [0,0];
        self.graphics.setAttribute("x", pos.x - anchor[0]);
        self.graphics.setAttribute("y", pos.y - anchor[1]);
        return self.graphics;
    };

    return self;
}    

export function defaultFeatureLayer(feature, pxPerExtent, options) {
    switch(feature.type) {
    case FeatureTypes.Point:
        return featureIconLayer(feature, pxPerExtent, options);

    case FeatureTypes.Polygon:
    case FeatureTypes.LineString:
        return featurePathLayer(feature, pxPerExtent, options);

    default:
        throw new Error('Unknown feature type');
    }
}
