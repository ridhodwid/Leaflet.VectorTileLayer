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
    fillRule, freeze, interactive, layerName, lineCap, lineJoin, loadGeometry,
    map, opacity, options, pointsToPath, properties, prototype, radius,
    removeAttribute, removeClass, removeFrom, removeInteractiveTarget, scaleBy,
    setAttribute, setStyle, stroke, type, types, weight, x, y
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
import {VectorTileFeature} from "@mapbox/vector-tile";

function featureLayer(feature, layerName, rootGroup, pxPerExtent, options) {
    const self = new Layer(options);
    const m_path = SVG.create("path");
    const m_type = VectorTileFeature.types[feature.type];

    options = extend(
        {},
        (
            "Polygon" === m_type
            ? Polygon.prototype.options
            : (
                "LineString" === m_type
                ? Path.prototype.options
                : CircleMarker.prototype.options
            )
        ),
        options
    );

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
        self.addInteractiveTarget(m_path);
    };

    self.removeFrom = function removeFrom() {
        self.removeInteractiveTarget(m_path);
        delete self._map;
    };

    self.setStyle = function setStyle(style) {
        const path = m_path;

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

        if (style.interactive) {
            /*
             * Leaflet's "interactive" class only applies to
             * renderers that are immediate descendants of a
             * pane.
             */
            path.setAttribute("pointer-events", "auto");
            DomUtil.addClass(path, "leaflet-interactive");
        } else {
            DomUtil.removeClass(path, "leaflet-interactive");
            path.removeAttribute("pointer-events");
        }

        return path;
    };

    const scalePoint = (p) => point(p).scaleBy(pxPerExtent);

    self.bbox = function bbox() {
        const [x0, y0, x1, y1] = feature.bbox();
        return bounds(scalePoint([x0, y0]), scalePoint([x1, y1]));
    };

    const geometry = feature.loadGeometry();
    switch (m_type) {
    case "Point":
        const radius = options.radius;
        const pt = scalePoint(geometry[0][0]);
        const arc = `a${radius} ${radius} 0 0 0 0 `;
        m_path.setAttribute(
            "d",
            `M${pt.x} ${pt.y - radius}${arc}${2 * radius}${arc}${-2 * radius}`
        );
        break;
    case "LineString":
    case "Polygon":
        m_path.setAttribute(
            "d",
            SVG.pointsToPath(
                geometry.map((ring) => ring.map(scalePoint)),
                "Polygon" === m_type
            )
        );
        break;
    }

    if (options.className) {
        DomUtil.addClass(m_path, options.className);
    }
    self.setStyle(options);

    rootGroup.appendChild(m_path);
    return self;
}

export default Object.freeze(featureLayer);
