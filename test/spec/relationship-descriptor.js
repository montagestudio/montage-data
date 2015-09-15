var RelationshipDescriptor = require("montage-data/logic/model/relationship-descriptor").RelationshipDescriptor,
    ObjectDescriptor = require("montage-data/logic/model/object-descriptor").ObjectDescriptor;

describe("A RelationshipDescriptor", function() {

    it("can be created", function () {
        expect(new RelationshipDescriptor()).toBeDefined();
    });

    it("initially has no destination type", function () {
        expect(new RelationshipDescriptor().destinationType).toBeUndefined();
    });

    it("preserves its destination type", function () {
        var selector = new RelationshipDescriptor(),
            type = new ObjectDescriptor(),
            name = "String" + Math.random();
        type.name = name;
        selector.destinationType = type;
        expect(selector.destinationType).toBe(type);
        expect(selector.destinationType.name).toEqual(name);
    });

    // TODO [Charles]: Update this for API changes.
    xit("initially has no value expressions", function () {
        expect(new RelationshipDescriptor().valueExpressions).toEqual({});
    });

    // TODO [Charles]: Update this for API changes.
    xit("preserves its value expressions", function () {
        var descriptor = new RelationshipDescriptor(),
            expression = "String" + Math.random();
            expressions = {foo: "String" + Math.random(), bar: expression};
        descriptor.valueExpressions = expressions;
        expect(descriptor.valueExpressions).toEqual(expressions);
        expect(Object.keys(descriptor.valueExpressions).sort()).toEqual(["bar", "foo"]);
        expect(descriptor.valueExpressions.bar).toEqual(expression);
    });

    it("initially has no criteria expressions", function () {
        expect(new RelationshipDescriptor().criteriaExpressions).toEqual({});
    });

    it("preserves its criteria expressions", function () {
        var descriptor = new RelationshipDescriptor(),
            expression = "String" + Math.random();
            expressions = {foo: "String" + Math.random(), bar: expression};
        descriptor.criteriaExpressions = expressions;
        expect(descriptor.criteriaExpressions).toEqual(expressions);
        expect(Object.keys(descriptor.criteriaExpressions).sort()).toEqual(["bar", "foo"]);
        expect(descriptor.criteriaExpressions.bar).toEqual(expression);
    });

});
