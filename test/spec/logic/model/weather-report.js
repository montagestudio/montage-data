var Montage = require("montage").Montage,
    DataObjectDescriptor = require("montage-data/logic/model/data-object-descriptor").DataObjectDescriptor;

/**
 * @class AreaBriefReport
 * @extends Montage
 */

exports.WeatherReport = WeatherReport = Montage.specialize(/** @lends AreaBriefReport.prototype */ {
    temp: {
        value: null
    },
    constructor: {
        value: function WeatherReport() {}
    }
}, {

    /**
     * @type {external:DataObjectDescriptor}
     */
    TYPE: {
        //get: DataObjectDescriptor.getterFor(exports, "WeatherReport"),
        get: function () {
            WeatherReport.objectPrototype = WeatherReport;
            return WeatherReport;
        }
    }
});
