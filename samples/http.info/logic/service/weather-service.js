var HttpService = require("montage-data/logic/service/http-service").HttpService,
    DataService = require("montage-data/logic/service/data-service").DataService,
    DataSelector = require("montage-data/logic/service/data-selector").DataSelector,
    WeatherReport = require("../model/weather-report").WeatherReport;

/**
 * Provides area briefs data for Contour applications.
 *
 * @class
 * @extends external:DataService
 */
exports.WeatherService = HttpService.specialize(/** @lends AreaBriefService.prototype */ {

    constructor: {
        value: function WeatherService() {
            this.super();
        }
    },

    connectionDescriptor: {
        value: null
    },

    // https://openweathermap.org/api
    fetchRawData: {
        value: function (stream) {

            var url, 
                that = this,
                connectionDescriptor = that.connectionDescriptor,
                criteria = stream.selector.criteria,
                parameters = criteria.parameters;

            // Set default
            parameters.unit = parameters.unit || 'imperial';
            url = connectionDescriptor.endpoint + 'weather';
            url += "?appid=" + connectionDescriptor.appid

            // Handle params
            
            if (parameters.city) {
                url += "&q=" + parameters.city;

                if (parameters.country) {
                    url += "," + parameters.country;
                }
            }

            if (parameters.unit) {
                url += "&units=" + parameters.unit;
            }

            if (parameters.latitude) {
                url += "&lat=" + parameters.latitude;
            }

            if (parameters.longitude) {
                url += "&lon=" + parameters.longitude;
            }

            return that.fetchHttpRawData(url, false).then(function (data) {
                if (data) {
                    that.addRawData(stream, [data], criteria);
                    that.rawDataDone(stream);
                }
            });
        }
    },

    mapFromRawData: {
        value: function (object, rawData, criteria) {
            object.temp = rawData.main.temp;
        }
    }
});