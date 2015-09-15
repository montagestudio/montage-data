var PropertyDescriptor = require("montage-data/logic/model/property-descriptor").PropertyDescriptor,
    ObjectDescriptor = require("montage-data/logic/model/object-descriptor").ObjectDescriptor,
    RelationshipDescriptor = require("montage-data/logic/model/relationship-descriptor").RelationshipDescriptor;

describe("A PropertyDescriptor", function() {

    it("can be created", function () {
        expect(new PropertyDescriptor()).toBeDefined();
    });

    it("initially has no relationship", function () {
        expect(new PropertyDescriptor().relationship).toBeUndefined();
    });

    it("preserves its relationship", function () {
        var descriptor = new PropertyDescriptor(),
            relationship = new RelationshipDescriptor(),
            type = new ObjectDescriptor(),
            name = "String" + Math.random();
        type.name = name;
        relationship.destinationType = type;
        relationship.valueExpressions = {foo: "String" + Math.random()};
        relationship.criteriaExpressions = {bar: "String" + Math.random()};
        descriptor.relationship = relationship;
        expect(descriptor.relationship).toEqual(relationship);
        expect(descriptor.relationship.destinationType).toBe(type);
        expect(descriptor.relationship.destinationType.name).toEqual(name);
        expect(Object.keys(descriptor.relationship.valueExpressions).sort()).toEqual(["foo"]);
        expect(Object.keys(descriptor.relationship.criteriaExpressions).sort()).toEqual(["bar"]);
    });

});
