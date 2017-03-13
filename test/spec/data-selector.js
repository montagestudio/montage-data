var DataQuery = require("montage-data/logic/model/data-query").DataQuery,
    ObjectDescriptor = require("montage-data/logic/model/object-descriptor").ObjectDescriptor;

describe("A DataQuery", function() {

    it("can be created", function () {
        expect(new DataQuery()).toBeDefined();
    });

    it("initially has no type", function () {
        expect(new DataQuery().type).toBeUndefined();
    });

    it("preserves its type", function () {
        var selector = new DataQuery(),
            type = new ObjectDescriptor(),
            name = "String" + Math.random();
        type.name = name;
        selector.type = type;
        expect(selector.type).toBe(type);
        expect(selector.type.name).toEqual(name);
    });

    it("initially has no criteria", function () {
        expect(new DataQuery().criteria).toEqual({});
    });

    it("preserves its criteria", function () {
        var selector = new DataQuery(),
            criteria = {a: Math.random(), b: Math.random(), c: Math.random()};
        selector.criteria.a = criteria.a;
        selector.criteria.b = criteria.b;
        selector.criteria.c = criteria.c;
        expect(selector.criteria).toEqual(criteria);
    });

});
