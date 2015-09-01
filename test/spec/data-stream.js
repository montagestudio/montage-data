var DataStream = require("montage-data/logic/service/data-stream").DataStream;

describe("A DataStream", function() {

    it("can be created", function () {
        expect(new DataStream()).toBeDefined();
    });

    it("has a an initially empty data array", function () {
        var stream = new DataStream(),
            data = stream.data;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toEqual(0);
    });

    it("accepts requests for data", function () {
        expect(new DataStream().requestData()).toBeUndefined();
    });

    it("is thenable", function () {
        expect(new DataStream().then).toEqual(jasmine.any(Function));
    });

    it("is catchable", function () {
        expect(new DataStream().catch).toEqual(jasmine.any(Function));
    });

    it("passes data along", function () {
        var stream = new DataStream();
        stream.addData([{a: 1, b: 2}, {a: 3, b: 4}]);
        expect(stream.data).toEqual([{a: 1, b: 2}, {a: 3, b: 4}]);
    });

    it("does not change its data array", function () {
        var stream = new DataStream(),
            data = stream.data;
        stream.addData([{a: 1, b: 2}, {a: 3, b: 4}]);
        expect(stream.data).toBe(data);
    });

    it("fulfills its promise with the data it receives", function (done) {
        var stream = new DataStream();
        // Set up asynchronous expectations.
        stream.then(function (data) {
            expect(data).toEqual([{a: 1, b: 2}, {a: 3, b: 4}]);
            done();
        });
        // Cause the promise above to be fulfilled.
        stream.addData([{a: 1, b: 2}, {a: 3, b: 4}]);
        stream.dataDone();
    });

    it("fulfills its promise only once", function (done) {
        var stream = new DataStream(),
            thenCount = 0;
        // Set up a promise callback counter.
        stream.then(function (data) {
            ++thenCount;
        });
        // Cause the promise above to be fulfilled.
        stream.addData([{a: 1, b: 2}, {a: 3, b: 4}]);
        stream.dataDone();
        // Add more data, hopefully not fulfilling the promise above again.
        stream.addData([{a: 5, b: 6}]);
        stream.dataDone();
        // Check the promise callback count asynchronously.
        window.setTimeout(function () {
            expect(thenCount).toEqual(1);
            done();
        }, 10);
    });

});
