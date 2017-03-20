var Montage = require("montage").Montage,
    Enumeration = require("montage-data/logic/model/enumeration").Enumeration,
    DataObjectDescriptor = require("montage-data/logic/model/data-object-descriptor").DataObjectDescriptor;

/**
 * @class AreaBriefReport
 * @extends Montage
 */
exports.WeatherReport = Montage.specialize(/** @lends AreaBriefReport.prototype */ {
    temp: {
        value: null
    },
    constructor: {
        value: function WeatherReport() {}
    }
}, {

    //////////////////////////////////////////////////////////////////////
    // Montage data

    /**
     * The Montage Data type of features.
     *
     * @type {external:ObjectDescriptor}
     */
    TYPE: {
        get: DataObjectDescriptor.getterFor(exports, "WeatherReport", {
            sections: []
        })
    }
});