var HttpService = require("montage-data/logic/service/http-service").HttpService,
    DataService = require("montage-data/logic/service/data-service").DataService,
    DataSelector = require("montage-data/logic/service/data-selector").DataSelector,
    WeatherReport = require("spec/logic/model/weather-report").WeatherReport;

/**
 * Provides area briefs data for Contour applications.
 *
 * @class
 * @extends external:DataService
 */
 var WeatherService = exports.WeatherService = HttpService.specialize(/** @lends AreaBriefService.prototype */ {

	API_KEY: {
		value: '7593a575795cbd73f54c69a321ed86fe'
	},

	ENDPOINT: {
		value: 'http://api.openweathermap.org/data/2.5/'
	},

   
	fetchRawData: {
        value: function (stream) {
            var self = this,
                criteria = stream.selector.criteria;

            return self.fetchHttpRawData(this._getUrl(criteria, true), false).then(function (data) {
                if (data) {
                    self.addRawData(stream, [data], criteria);
                    self.rawDataDone(stream);
                }
            });
        }
    },

    mapFromRawData: {
        value: function (object, rawData, criteria) {
            object.temp = rawData.main.temp;
        }
    },

    _getUrl: {
        value: function (criteria, detect) {
            return this.ENDPOINT + "weather?q=" + criteria.city + "," + criteria.country + "&units=" + criteria.unit + "&appid=" + this.API_KEY;
        }
    }
});