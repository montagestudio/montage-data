var DataStream = require("montage-data/logic/service/data-stream").DataStream,
    Montage = require("montage").Montage;

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
        expect(new DataStream().requestData).toEqual(jasmine.any(Function));
    });

    it("is thenable", function () {
        expect(new DataStream().then).toEqual(jasmine.any(Function));
    });

    it("is catchable", function () {
        expect(new DataStream().catch).toEqual(jasmine.any(Function));
    });

    it("doesn't change the array instance it uses for its data", function () {
        var stream = new DataStream(),
            data = stream.data;
        stream.addData([{a: 1, b: 2}, {a: 3, b: 4}]);
        expect(stream.data).toBe(data);
    });

    it("provides the data it receives through its data array", function () {
        var stream = new DataStream();
        stream.addData([{a: 1, b: 2}, {a: 3, b: 4}]);
        expect(stream.data).toEqual([{a: 1, b: 2}, {a: 3, b: 4}]);
    });

    it("provides the data it receives to objects bound to its data array", function () {
        var stream = new DataStream(),
            bound = new (Montage.specialize({}))();
        bound.stream = stream;
        bound.defineBinding("data", {"<-": "stream.data"});
        bound.defineBinding("foos", {"<-": "stream.data.map{foo}"});
        stream.addData([{foo: 1, bar: 2}, {foo: 3, bar: 4}]);
        expect(bound.data).toEqual([{foo: 1, bar: 2}, {foo: 3, bar: 4}]);
        expect(bound.foos).toEqual([1, 3]);
    });

    it("is a promise that gets fulfilled with the data it receives", function (done) {
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

    it("is a promise that is fulfilled only once", function (done) {
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
