var DataService = require("montage-data/logic/service/data-service").DataService,
    DataStream = require("montage-data/logic/service/data-stream").DataStream;

describe("A DataService", function() {

    it("can be created", function () {
        expect(new DataService()).toBeDefined();
    });

});

describe("A DataService's fetchData() method", function() {

    it("is defined", function () {
        expect(new DataService().fetchData).toBeDefined();
    });

    xit("uses the passed in stream when one is specified", function () {
    });

    xit("creates and return a new stream when none is passed in", function () {
    });

    xit("sets its stream's type", function () {
    });

    xit("sets its stream's selector", function () {
    });

    xit("calls fetchRawData() each time it is called", function () {
    });

});

describe("A DataService's fetchRawData() method", function() {

    it("is defined", function () {
        expect(new DataService().fetchRawData).toBeDefined();
    });

    it("gets an empty set of data by default", function (done) {
        // Call fetchRawData() and verify the stream data this generates.
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

});

describe("A DataService's addRawData() method", function() {

    it("is defined", function () {
        expect(new DataService().addRawData).toBeDefined();
    });

    xit("maps the data it receives", function () {
    });

    xit("calls the specified stream's addData() with the mapped data", function () {
    });

});

describe("A DataService's rawDataDone() method", function() {

    it("is defined", function () {
        expect(new DataService().rawDataDone).toBeDefined();
    });

    xit("calls the specified stream's dataDone()", function () {
    });

});
