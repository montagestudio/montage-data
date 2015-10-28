var DataService = require("montage-data/logic/service/data-service").DataService,
    DataStream = require("montage-data/logic/service/data-stream").DataStream;

describe("A DataService", function() {

    it("can be created", function () {
        expect(new DataService()).toBeDefined();
    });

    it("has a fetchData() method", function () {
        expect(new DataService().fetchData).toEqual(jasmine.any(Function));
    });

    xit("has a fetchData() method that uses the passed in stream when one is specified", function () {
    });

    xit("has a fetchData() method that creates and return a new stream when none is passed in", function () {
    });

    xit("has a fetchData() method that sets its stream's selector", function () {
    });

    xit("has a fetchData() method that calls the service's fetchRawData() when appropriate", function () {
    });

    xit("has a fetchData() xmethod that calls a child service's fetchRawData() when appropraite", function () {
    });

    it("has a saveDataChanges() method", function () {
        expect(new DataService().saveDataChanges).toEqual(jasmine.any(Function));
    });

    xit("has a saveDataChanges() method that needs to be further tested", function () {});

    it("has a fetchRawData() method", function () {
        expect(new DataService().fetchRawData).toEqual(jasmine.any(Function));
    });

    it("has a fetchRawData() method that fetches empty data by default", function (done) {
        // Call fetchRawData() and verify the resulting stream's initial data.
        var stream = new DataStream();
        new DataService().fetchRawData(stream);
        expect(stream.data).toEqual([]);
        // Make sure the stream's promise is fulfilled with the same data.
        stream.then(function (data) {
            expect(data).toBe(stream.data);
            expect(data).toEqual([]);
            done();
        });
    });

    it("has a addRawData() method", function () {
        expect(new DataService().addRawData).toEqual(jasmine.any(Function));
    });

    xit("has a addRawData() method that maps the data it receives", function () {
    });

    xit("has a addRawData() method that calls the specified stream's addData() with the mapped data", function () {
    });

    xit("has a addRawData() method that needs to be further tested", function () {});

    it("has a mapFromRawData() method", function () {
        expect(new DataService().mapFromRawData).toEqual(jasmine.any(Function));
    });

    xit("has a mapFromRawData() method that needs to be further tested", function () {});

    it("has a rawDataDone() method", function () {
        expect(new DataService().rawDataDone).toEqual(jasmine.any(Function));
    });

    xit("has a rawDataDone() method that calls the specified stream's dataDone()", function () {
    });

    xit("has a registerService() method that needs to be further tested", function () {});

    xit("has a mainService class variable that needs to be further tested", function () {});

});
