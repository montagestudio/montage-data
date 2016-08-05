var RawDataService = require("montage-data/logic/service/raw-data-service").RawDataService,
    DataStream = require("montage-data/logic/service/data-stream").DataStream,
    DataObjectDescriptor = require("montage-data/logic/model/data-object-descriptor").DataObjectDescriptor;

describe("A RawDataService", function() {

    it("can be created", function () {
        expect(new RawDataService()).toBeDefined();
    });

    it("never has any parent and is always the root", function () {
        var service = new RawDataService();
        expect(service.parentService).toBeUndefined();
        expect(service.rootService).toEqual(service);
        service.parentService = new RawDataService();
        expect(service.parentService).toBeUndefined();
        expect(service.rootService).toEqual(service);
    });

    it("manages children correctly", function () {
        var toString, Types, objects, Child, children, service;

        // Define test types with ObjectDescriptors.
        toString = function () { return "Type" + this.id; };
        Types = [0, 1, 2, 3].map(function () { return function () {}; });
        Types.forEach(function (type) { type.TYPE = new DataObjectDescriptor(); });
        Types.forEach(function (type) { type.TYPE.toString = toString; });
        Types.forEach(function (type) { type.TYPE.jasmineToString = toString; });
        Types.forEach(function (type, index) { type.TYPE.id = index; });

        // Define test objects for each of the test types.
        toString = function () { return "Object" + this.id; };
        objects = Types.map(function (type) { return new type(); });
        objects.forEach(function (object) { object.toString = toString; });
        objects.forEach(function (object) { object.jasmineToString = toString; });
        objects.forEach(function (object, index) { object.id = index; });

        // Create test children with unique identifiers to help with debugging.
        toString = function () { return "Child" + this.id; };
        children = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function () { return new RawDataService(); });
        children.forEach(function (child) { child.toString = toString; });
        children.forEach(function (child) { child.jasmineToString = toString; });
        children.forEach(function (child, index) { child.id = index; });

        // Define a variety of types for the test children. Children with an
        // undefined, null, or empty types array will be "all types" children.
        children.forEach(function (child) { Object.defineProperty(child, "types", {writable: true}); });
        children[0].types = [Types[0].TYPE];
        children[1].types = [Types[0].TYPE];
        children[2].types = [Types[1].TYPE];
        children[3].types = [Types[0].TYPE, Types[1].TYPE];
        children[4].types = [Types[0].TYPE, Types[2].TYPE];
        children[5].types = [Types[1].TYPE, Types[2].TYPE];
        children[6].types = [Types[0].TYPE, Types[1].TYPE, Types[2].TYPE];
        children[7].types = undefined;
        children[8].types = null;
        children[9].types = [];

        // Create a service with the desired children.
        service = new RawDataService();
        children.forEach(function (child) { service.addChildService(child); });

        // Verify the initial parents, types, and type-to-child mapping.
        expect(service.parentService).toBeUndefined();
        expect(children[0].parentService).toEqual(service);
        expect(children[1].parentService).toEqual(service);
        expect(children[2].parentService).toEqual(service);
        expect(children[3].parentService).toEqual(service);
        expect(children[4].parentService).toEqual(service);
        expect(children[5].parentService).toEqual(service);
        expect(children[6].parentService).toEqual(service);
        expect(children[7].parentService).toEqual(service);
        expect(children[8].parentService).toEqual(service);
        expect(children[9].parentService).toEqual(service);
        expect(service.types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[0].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[1].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[2].types.sort()).toEqual([Types[1].TYPE]);
        expect(children[3].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE]);
        expect(children[4].types.sort()).toEqual([Types[0].TYPE, Types[2].TYPE]);
        expect(children[5].types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[6].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[7].types).toBeUndefined();
        expect(children[8].types).toBeNull();
        expect(children[9].types).toEqual([]);
        expect(service.getChildServiceForType(Types[0].TYPE)).toEqual(children[0]);
        expect(service.getChildServiceForType(Types[1].TYPE)).toEqual(children[2]);
        expect(service.getChildServiceForType(Types[2].TYPE)).toEqual(children[4]);
        expect(service.getChildServiceForType(Types[3].TYPE)).toEqual(children[7]);
        expect(service.getChildServiceForObject(objects[0])).toEqual(children[0]);
        expect(service.getChildServiceForObject(objects[1])).toEqual(children[2]);
        expect(service.getChildServiceForObject(objects[2])).toEqual(children[4]);
        expect(service.getChildServiceForObject(objects[3])).toEqual(children[7]);

        // Modify the children and verify the resulting service parent, types,
        // and type-to-child mapping.
        service.removeChildService(children[0]);
        service.removeChildService(children[1]);
        expect(service.parentService).toBeUndefined();
        expect(children[0].parentService).toBeUndefined();
        expect(children[1].parentService).toBeUndefined();
        expect(children[2].parentService).toEqual(service);
        expect(children[3].parentService).toEqual(service);
        expect(children[4].parentService).toEqual(service);
        expect(children[5].parentService).toEqual(service);
        expect(children[6].parentService).toEqual(service);
        expect(children[7].parentService).toEqual(service);
        expect(children[8].parentService).toEqual(service);
        expect(children[9].parentService).toEqual(service);
        expect(service.types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[0].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[1].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[2].types.sort()).toEqual([Types[1].TYPE]);
        expect(children[3].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE]);
        expect(children[4].types.sort()).toEqual([Types[0].TYPE, Types[2].TYPE]);
        expect(children[5].types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[6].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[7].types).toBeUndefined();
        expect(children[8].types).toBeNull();
        expect(children[9].types).toEqual([]);
        expect(service.getChildServiceForType(Types[0].TYPE)).toEqual(children[3]);
        expect(service.getChildServiceForType(Types[1].TYPE)).toEqual(children[2]);
        expect(service.getChildServiceForType(Types[2].TYPE)).toEqual(children[4]);
        expect(service.getChildServiceForType(Types[3].TYPE)).toEqual(children[7]);
        expect(service.getChildServiceForObject(objects[0])).toEqual(children[3]);
        expect(service.getChildServiceForObject(objects[1])).toEqual(children[2]);
        expect(service.getChildServiceForObject(objects[2])).toEqual(children[4]);
        expect(service.getChildServiceForObject(objects[3])).toEqual(children[7]);

        // Modify and verify some more.
        service.removeChildService(children[3]);
        expect(service.parentService).toBeUndefined();
        expect(children[0].parentService).toBeUndefined();
        expect(children[1].parentService).toBeUndefined();
        expect(children[2].parentService).toEqual(service);
        expect(children[3].parentService).toBeUndefined();
        expect(children[4].parentService).toEqual(service);
        expect(children[5].parentService).toEqual(service);
        expect(children[6].parentService).toEqual(service);
        expect(children[7].parentService).toEqual(service);
        expect(children[8].parentService).toEqual(service);
        expect(children[9].parentService).toEqual(service);
        expect(service.types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[0].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[1].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[2].types.sort()).toEqual([Types[1].TYPE]);
        expect(children[3].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE]);
        expect(children[4].types.sort()).toEqual([Types[0].TYPE, Types[2].TYPE]);
        expect(children[5].types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[6].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[7].types).toBeUndefined();
        expect(children[8].types).toBeNull();
        expect(children[9].types).toEqual([]);
        expect(service.getChildServiceForType(Types[0].TYPE)).toEqual(children[4]);
        expect(service.getChildServiceForType(Types[1].TYPE)).toEqual(children[2]);
        expect(service.getChildServiceForType(Types[2].TYPE)).toEqual(children[4]);
        expect(service.getChildServiceForType(Types[3].TYPE)).toEqual(children[7]);
        expect(service.getChildServiceForObject(objects[0])).toEqual(children[4]);
        expect(service.getChildServiceForObject(objects[1])).toEqual(children[2]);
        expect(service.getChildServiceForObject(objects[2])).toEqual(children[4]);
        expect(service.getChildServiceForObject(objects[3])).toEqual(children[7]);

        // Modify and verify some more. After the modification there will be no
        // more children for Types[0] so the first "all types" child should be
        // returned for that type.
        service.removeChildService(children[4]);
        service.removeChildService(children[6]);
        expect(service.parentService).toBeUndefined();
        expect(children[0].parentService).toBeUndefined();
        expect(children[1].parentService).toBeUndefined();
        expect(children[2].parentService).toEqual(service);
        expect(children[3].parentService).toBeUndefined();
        expect(children[4].parentService).toBeUndefined();
        expect(children[5].parentService).toEqual(service);
        expect(children[6].parentService).toBeUndefined();
        expect(children[7].parentService).toEqual(service);
        expect(children[8].parentService).toEqual(service);
        expect(children[9].parentService).toEqual(service);
        expect(service.types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[0].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[1].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[2].types.sort()).toEqual([Types[1].TYPE]);
        expect(children[3].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE]);
        expect(children[4].types.sort()).toEqual([Types[0].TYPE, Types[2].TYPE]);
        expect(children[5].types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[6].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[7].types).toBeUndefined();
        expect(children[8].types).toBeNull();
        expect(children[9].types).toEqual([]);
        expect(service.getChildServiceForType(Types[0].TYPE)).toEqual(children[7]);
        expect(service.getChildServiceForType(Types[1].TYPE)).toEqual(children[2]);
        expect(service.getChildServiceForType(Types[2].TYPE)).toEqual(children[5]);
        expect(service.getChildServiceForType(Types[3].TYPE)).toEqual(children[7]);
        expect(service.getChildServiceForObject(objects[0])).toEqual(children[7]);
        expect(service.getChildServiceForObject(objects[1])).toEqual(children[2]);
        expect(service.getChildServiceForObject(objects[2])).toEqual(children[5]);
        expect(service.getChildServiceForObject(objects[3])).toEqual(children[7]);

        // Modify and verify some more.
        service.removeChildService(children[5]);
        service.removeChildService(children[7]);
        expect(service.parentService).toBeUndefined();
        expect(children[0].parentService).toBeUndefined();
        expect(children[1].parentService).toBeUndefined();
        expect(children[2].parentService).toEqual(service);
        expect(children[3].parentService).toBeUndefined();
        expect(children[4].parentService).toBeUndefined();
        expect(children[5].parentService).toBeUndefined();
        expect(children[6].parentService).toBeUndefined();
        expect(children[7].parentService).toBeUndefined();
        expect(children[8].parentService).toEqual(service);
        expect(children[9].parentService).toEqual(service);
        expect(service.types.sort()).toEqual([Types[1].TYPE]);
        expect(children[0].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[1].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[2].types.sort()).toEqual([Types[1].TYPE]);
        expect(children[3].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE]);
        expect(children[4].types.sort()).toEqual([Types[0].TYPE, Types[2].TYPE]);
        expect(children[5].types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[6].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[7].types).toBeUndefined();
        expect(children[8].types).toBeNull();
        expect(children[9].types).toEqual([]);
        expect(service.getChildServiceForType(Types[0].TYPE)).toEqual(children[8]);
        expect(service.getChildServiceForType(Types[1].TYPE)).toEqual(children[2]);
        expect(service.getChildServiceForType(Types[2].TYPE)).toEqual(children[8]);
        expect(service.getChildServiceForType(Types[3].TYPE)).toEqual(children[8]);
        expect(service.getChildServiceForObject(objects[0])).toEqual(children[8]);
        expect(service.getChildServiceForObject(objects[1])).toEqual(children[2]);
        expect(service.getChildServiceForObject(objects[2])).toEqual(children[8]);
        expect(service.getChildServiceForObject(objects[3])).toEqual(children[8]);

        // Modify and verify some more.
        service.removeChildService(children[2]);
        service.removeChildService(children[8]);
        expect(service.parentService).toBeUndefined();
        expect(children[0].parentService).toBeUndefined();
        expect(children[1].parentService).toBeUndefined();
        expect(children[2].parentService).toBeUndefined();
        expect(children[3].parentService).toBeUndefined();
        expect(children[4].parentService).toBeUndefined();
        expect(children[5].parentService).toBeUndefined();
        expect(children[6].parentService).toBeUndefined();
        expect(children[7].parentService).toBeUndefined();
        expect(children[8].parentService).toBeUndefined();
        expect(children[9].parentService).toEqual(service);
        expect(service.types.sort()).toEqual([]);
        expect(children[0].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[1].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[2].types.sort()).toEqual([Types[1].TYPE]);
        expect(children[3].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE]);
        expect(children[4].types.sort()).toEqual([Types[0].TYPE, Types[2].TYPE]);
        expect(children[5].types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[6].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[7].types).toBeUndefined();
        expect(children[8].types).toBeNull();
        expect(children[9].types).toEqual([]);
        expect(service.getChildServiceForType(Types[0].TYPE)).toEqual(children[9]);
        expect(service.getChildServiceForType(Types[1].TYPE)).toEqual(children[9]);
        expect(service.getChildServiceForType(Types[2].TYPE)).toEqual(children[9]);
        expect(service.getChildServiceForType(Types[3].TYPE)).toEqual(children[9]);
        expect(service.getChildServiceForObject(objects[0])).toEqual(children[9]);
        expect(service.getChildServiceForObject(objects[1])).toEqual(children[9]);
        expect(service.getChildServiceForObject(objects[2])).toEqual(children[9]);
        expect(service.getChildServiceForObject(objects[3])).toEqual(children[9]);

        // Modify and verify some more.
        service.removeChildService(children[9]);
        expect(service.parentService).toBeUndefined();
        expect(children[0].parentService).toBeUndefined();
        expect(children[1].parentService).toBeUndefined();
        expect(children[2].parentService).toBeUndefined();
        expect(children[3].parentService).toBeUndefined();
        expect(children[4].parentService).toBeUndefined();
        expect(children[5].parentService).toBeUndefined();
        expect(children[6].parentService).toBeUndefined();
        expect(children[7].parentService).toBeUndefined();
        expect(children[8].parentService).toBeUndefined();
        expect(children[9].parentService).toBeUndefined();
        expect(service.types.sort()).toEqual([]);
        expect(children[0].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[1].types.sort()).toEqual([Types[0].TYPE]);
        expect(children[2].types.sort()).toEqual([Types[1].TYPE]);
        expect(children[3].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE]);
        expect(children[4].types.sort()).toEqual([Types[0].TYPE, Types[2].TYPE]);
        expect(children[5].types.sort()).toEqual([Types[1].TYPE, Types[2].TYPE]);
        expect(children[6].types.sort()).toEqual([Types[0].TYPE, Types[1].TYPE, Types[2].TYPE]);
        expect(children[7].types).toBeUndefined();
        expect(children[8].types).toBeNull();
        expect(children[9].types).toEqual([]);
        expect(service.getChildServiceForType(Types[0].TYPE)).toBeNull();
        expect(service.getChildServiceForType(Types[1].TYPE)).toBeNull();
        expect(service.getChildServiceForType(Types[2].TYPE)).toBeNull();
        expect(service.getChildServiceForType(Types[3].TYPE)).toBeNull();
        expect(service.getChildServiceForObject(objects[0])).toBeNull();
        expect(service.getChildServiceForObject(objects[1])).toBeNull();
        expect(service.getChildServiceForObject(objects[2])).toBeNull();
        expect(service.getChildServiceForObject(objects[3])).toBeNull();
    });

    it("has a fetchData() method", function () {
        expect(new RawDataService().fetchData).toEqual(jasmine.any(Function));
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
        expect(new RawDataService().saveDataChanges).toEqual(jasmine.any(Function));
    });

    xit("has a saveDataChanges() method that needs to be further tested", function () {});

    it("has a fetchRawData() method", function () {
        expect(new RawDataService().fetchRawData).toEqual(jasmine.any(Function));
    });

    it("has a fetchRawData() method that fetches empty data by default", function (done) {
        // Call fetchRawData() and verify the resulting stream's initial data.
        var stream = new DataStream();
        new RawDataService().fetchRawData(stream);
        expect(stream.data).toEqual([]);
        // Make sure the stream's promise is fulfilled with the same data.
        stream.then(function (data) {
            expect(data).toBe(stream.data);
            expect(data).toEqual([]);
            done();
        });
    });

    it("has a addRawData() method", function () {
        expect(new RawDataService().addRawData).toEqual(jasmine.any(Function));
    });

    xit("has a addRawData() method that maps the data it receives", function () {
    });

    xit("has a addRawData() method that calls the specified stream's addData() with the mapped data", function () {
    });

    xit("has a addRawData() method that needs to be further tested", function () {});

    it("has a mapFromRawData() method", function () {
        expect(new RawDataService().mapFromRawData).toEqual(jasmine.any(Function));
    });

    xit("has a mapFromRawData() method that needs to be further tested", function () {});

    it("has a rawDataDone() method", function () {
        expect(new RawDataService().rawDataDone).toEqual(jasmine.any(Function));
    });

    xit("has a rawDataDone() method that calls the specified stream's dataDone()", function () {
    });

    xit("has a registerService() method that needs to be further tested", function () {});

    xit("has a mainService class variable that needs to be further tested", function () {});

});
