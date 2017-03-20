
var DataService = require("montage-data/logic/service/data-service").DataService,
    DataSelector = require("montage-data/logic/service/data-selector").DataSelector,
    WeatherReport = require("spec/logic/model/weather-report").WeatherReport,
    WeatherService = require("spec/logic/service/weather-service").WeatherService;

describe("An HttpService", function() {

    it("needs to be tested", function (done) {

    	var criteria = {
            city: 'San-Francisco',
            country: 'us',
            unit: 'imperial'
        };

        var mainService = new DataService();
        mainService.addChildService(new WeatherService());
    	
    	var stream  = DataSelector.withTypeAndCriteria(WeatherReport.TYPE, criteria);
        mainService.fetchData(stream).then(function (weatherReports) {
            expect(typeof weatherReports[0].temp).toBe('number');
            done();
        });
    });

});
