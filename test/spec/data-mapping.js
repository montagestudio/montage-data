var DataMapping = require("montage-data/logic/service/data-mapping").DataMapping,
    ObjectDescriptor = require("montage-data/logic/model/object-descriptor").ObjectDescriptor;

describe("A DataMapping", function() {

    it("can be created", function () {
        expect(new DataMapping()).toBeDefined();
    });

    it("has an initially undefined type", function () {
        expect(new DataMapping().type).toBeUndefined();
    });

    it("records its type", function () {
        var object = {a: 1, b: 2},
            mapping = new DataMapping();
        mapping.type = object;
        expect(mapping.type).toBe(object);
    });

    it("leaves raw data unmapped by default", function () {
        var object = {a: 1, b: 2};
        expect(new DataMapping().mapRawData(object)).toBe(object);
    });

});
