var DataSelector = require("montage-data/logic/service/data-selector").DataSelector,
    ObjectDescriptor = require("montage-data/logic/model/object-descriptor").ObjectDescriptor,
    Criteria = require("montage/core/criteria").Criteria,
    serialize = require("montage/core/serialization/serializer/montage-serializer").serialize,
    deserialize = require("montage/core/serialization/deserializer/montage-deserializer").deserialize;

describe("A DataSelector", function() {

    it("can be created", function () {
        expect(new DataSelector()).toBeDefined();
    });

    it("initially has no type", function () {
        expect(new DataSelector().type).toBeUndefined();
    });

    it("preserves its type", function () {
        var selector = new DataSelector(),
            type = new ObjectDescriptor(),
            name = "String" + Math.random();
        type.name = name;
        selector.type = type;
        expect(selector.type).toBe(type);
        expect(selector.type.name).toEqual(name);
    });

    it("initially has no criteria", function () {
        expect(new DataSelector().criteria).toEqual({});
    });

    it("preserves its criteria", function () {
        var selector = new DataSelector(),
            criteria = {a: Math.random(), b: Math.random(), c: Math.random()};
        selector.criteria.a = criteria.a;
        selector.criteria.b = criteria.b;
        selector.criteria.c = criteria.c;
        expect(selector.criteria).toEqual(criteria);
    });

    it("can serialize and deserialize", function () {

        var dataExpression = "city = $city && unit = $unit && country = $country";
        var dataParameters = {
            city: 'San-Francisco',
            country: 'us',
            unit: 'imperial'
        };
        
        var dataType = new ObjectDescriptor();
        var dataCriteria = new Criteria().initWithExpression(dataExpression, dataParameters);
        var dataQuery  = DataSelector.withTypeAndCriteria(dataType, dataCriteria);

        var dataQueryJson = serialize(dataQuery, require);
        var dataQuery = deserialize(dataQueryJson, require);
        expect(dataQueryJson).toBeDefined();
    });

});
