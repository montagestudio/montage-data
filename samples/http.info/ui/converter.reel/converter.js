/**
 * @module ui/converter.reel
 */
var Component = require("montage/ui/component").Component;
var Criteria = require("montage/core/criteria").Criteria;
var WeatherReport = require("logic/model/weather-report").WeatherReport;
var WeatherService = require("logic/service/weather-service").WeatherService;
var DataService = require("montage-data/logic/service/data-service").DataService;
var DataSelector = require("montage-data/logic/service/data-selector").DataSelector;

/**
 * @class Converter
 * @extends Component
 */
exports.Converter = Component.specialize(/** @lends Converter# */ {
    constructor: {
        value: function Converter() {
            var that = this;
            this.super();

            // Init services
            this.initServices().then(function () {
                // Use service
                that.loadWeatherReport();  
            });
        }
    },

    initServices: {
        value: function (){
            
            // Init mainService
            this.mainService = mainService = new DataService();
            mainService.isUniquing = true;

            // Init connection
            var connectionDescriptorPromise;
            if(location.hostname.indexOf("local") !== -1) {
                connectionDescriptorPromise = require.async("logic/service/weather-local-connexion.json");
            } else {
                connectionDescriptorPromise = require.async("logic/service/weather-prod-connexion.json");
            }

            return connectionDescriptorPromise.then(function (connectionDescriptor) {
                var weatherService = new WeatherService();
                weatherService.connectionDescriptor = connectionDescriptor;
                this.mainService.addChildService(weatherService);
            });
        }
    },

    getWeatherReportCriteria: {
        value: function (ignoreGeolocation) {
            var that = this;
            return new Promise(function (resolve, reject) {

                // Use geolocation
                if (!ignoreGeolocation && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function (geolocation) {

                        var dataExpression = "longitude = $longitude && latitude = $latitude";
                        var dataParameters = {
                            latitude: geolocation.coords.latitude,
                            longitude: geolocation.coords.longitude
                        };

                        var dataCriteria = new Criteria().initWithExpression(dataExpression, dataParameters);

                        resolve(dataCriteria);

                    }, function (err) {
                        resolve(that.getWeatherReportCriteria(true));
                    });

                // Use default params
                } else {

                    var dataExpression = "city = $city && unit = $unit && country = $country";
                    var dataParameters = {
                        city: 'San-Francisco',
                        country: 'us',
                        unit: 'imperial'
                    };

                    var dataCriteria = new Criteria().initWithExpression(dataExpression, dataParameters);

                    resolve(dataCriteria);
                }
            });
        }
    },

    loadWeatherReport: {
        value: function () {
            var that = this;
            return that.getWeatherReportCriteria().then(function (dataCriteria) {
                var dataType = WeatherReport;
                var dataQuery  = DataSelector.withTypeAndCriteria(dataType, dataCriteria);
                that.mainService.fetchData(dataQuery).then(function (weatherReports) {
                    that.weatherReport = weatherReports[0];
                });
            });
        }
    },

    _weatherReport: {
        value: null,
    },

    weatherReport: {
        get: function () {
            return this._weatherReport;
        },
        set: function (weatherReport) {
            if (this._weatherReport !== weatherReport) {
                this._weatherReport = weatherReport;
                this.needsDraw = true;
            }
        }
    }
});
