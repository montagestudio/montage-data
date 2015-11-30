var DataService = require("montage-data/logic/service/data-service").DataService,
    DataStream = require("montage-data/logic/service/data-stream").DataStream;

describe("A DataService", function() {

    it("can be created", function () {
        expect(new DataService()).toBeDefined();
    });

    it("inserts children in priority order", function () {
        var service = new DataService();
            // Individual services to try to insert.
            service0 = {priority: 0},
            service1A = {priority: 1},
            service1B = {priority: 1},
            service1C = {priority: 1},
            service2 = {priority: 2},
            service3A = {priority: 3},
            service3B = {priority: 3},
            service3C = {priority: 3},
            service4 = {priority: 4},
            service5A = {priority: 5},
            service5B = {priority: 5},
            service5C = {priority: 5},
            service6 = {priority: 6},
            // Arrays of services to insert in.
            services0 = [],
            services1 = [service1A],
            services11 = [service1A, service1B],
            services13 = [service1A, service3A],
            services111 = [service1A, service1B, service1C],
            services113 = [service1A, service1B, service3A],
            services133 = [service1A, service3A, service3B],
            services135 = [service1A, service3A, service5A],
            services1113 = [service1A, service1B, service1C, service3A],
            services1133 = [service1A, service1B, service3A, service3B],
            services1135 = [service1A, service1B, service3A, service5A],
            services1333 = [service1A, service3A, service3B, service3C],
            services1335 = [service1A, service3A, service3B, service5A],
            services1355 = [service1A, service3A, service5A, service5B],
            services11133 = [service1A, service1B, service1C, service3A, service3B],
            services11135 = [service1A, service1B, service1C, service3A, service5A],
            services11333 = [service1A, service1B, service3A, service3B, service3C],
            services11335 = [service1A, service1B, service3A, service3B, service5A],
            services11355 = [service1A, service1B, service3A, service5A, service5B],
            services13335 = [service1A, service3A, service3B, service3C, service5A],
            services13355 = [service1A, service3A, service3B, service5A, service5B],
            services13555 = [service1A, service3A, service5A, service5B, service5C],
            // Array of all the arrayss of services to insert in.
            services = [
                services0, services1, services11, services13,
                services111, services113, services133, services135,
                services1113, services1133, services1135, services1333, services1335, services1355,
                services11133, services11135, services11333, services11335,
                services11355, services13335, services13355, services13555
            ];
        // Test using a matrix: Each row of the matrix corresponds to one
        // service to test with, with the first element in the row being the
        // service to test with and the 22 remaining elements in the row being
        // the expected index of this service in each of the 22 service arrays
        // defined above.
        [
            [service0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [service1A, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [service1B, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [service1C, 0, 1, 2, 1, 2, 2, 1, 1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1],
            [service2,  0, 1, 2, 1, 3, 2, 1, 1, 3, 2, 2, 1, 1, 1, 3, 3, 2, 2, 2, 1, 1, 1],
            [service3A, 0, 1, 2, 1, 3, 2, 1, 1, 3, 2, 2, 1, 1, 1, 3, 3, 2, 2, 2, 1, 1, 1],
            [service3B, 0, 1, 2, 2, 3, 3, 2, 2, 4, 3, 3, 2, 2, 2, 4, 4, 3, 3, 3, 2, 2, 2],
            [service3C, 0, 1, 2, 2, 3, 3, 3, 2, 4, 4, 3, 3, 3, 2, 5, 4, 4, 4, 3, 3, 3, 2],
            [service4,  0, 1, 2, 2, 3, 3, 3, 2, 4, 4, 3, 4, 3, 2, 5, 4, 5, 4, 3, 4, 3, 2],
            [service5A, 0, 1, 2, 2, 3, 3, 3, 2, 4, 4, 3, 4, 3, 2, 5, 4, 5, 4, 3, 4, 3, 2],
            [service5B, 0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 3, 5, 5, 5, 5, 4, 5, 4, 3],
            [service5C, 0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 4],
            [service6,  0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5]
        ].forEach(function (row, i, rows) {
            row.slice(1).forEach(function (column, j) {
                var rowContext = "row #" + (i + 1) + " of " + rows.length,
                    columnContext = "column #" + (j + 2) + " of " + row.length,
                    testContext = "(" + rowContext + ", " + columnContext + ")",
                    index = service._getChildServiceInsertionIndex(services[j], row[0]);
                expect(index).toEqual(column, testContext);
            });
        });
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
