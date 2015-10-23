var DataObjectDescriptor = require("montage-data/logic/model/data-object-descriptor").DataObjectDescriptor,
    DataPropertyDescriptor = require("montage-data/logic/model/data-property-descriptor").DataPropertyDescriptor,
    Montage = require("montage-data/montage").Montage;

describe("A DataObjectDescriptor", function() {

    it("can be created", function () {
        expect(new DataObjectDescriptor()).toBeDefined();
    });

    it("initially has no name", function () {
        expect(new DataObjectDescriptor().name).toBeUndefined();
    });

    it("preserves its name", function () {
        var descriptor = new DataObjectDescriptor(),
            name = "String" + Math.random();
        descriptor.name = name;
        expect(descriptor.name).toEqual(name);
    });

    it("has Montage.prototype as its initial prototype value", function () {
        expect(new DataObjectDescriptor().prototype).toEqual(Montage.prototype);
    });

    it("preserves its prototype value", function () {
        var descriptor = new DataObjectDescriptor(),
            prototype = Object.create({});
        descriptor.prototype = prototype;
        expect(descriptor.prototype).toBe(prototype);
    });

    it("initially has no properties", function () {
        expect(new DataObjectDescriptor().properties).toEqual({});
    });

    it("preserves its properties", function () {
        var descriptor = new DataObjectDescriptor(),
            properties = {},
            i;
        properties["property" + Math.random()] = new DataPropertyDescriptor();
        properties["property" + Math.random()] = new DataPropertyDescriptor();
        properties["property" + Math.random()] = new DataPropertyDescriptor();
        for (i in properties) {
            descriptor.setProperty(i, properties[i]);
        }
        expect(descriptor.properties).toEqual(properties);
    });

    it("can be created with a getter", function () {
        var className1 = "Class" + Math.random(),
            className2 = "Class" + Math.random(),
            propertyName1 = "property" + Math.random(),
            propertyName2 = "property" + Math.random(),
            propertyName3 = "property" + Math.random(),
            propertyName4 = "property" + Math.random(),
            exports = {},
            descriptors1 = {},
            descriptors2 = {},
            descriptor1,
            descriptor2;
        descriptors1[propertyName1] = {value: Math.random()};
        descriptors1[propertyName2] = {value: Math.random()};
        descriptors2[propertyName3] = {value: Math.random()};
        descriptors2[propertyName4] = {value: Math.random()};
        exports[className1] = Montage.specialize(descriptors1);
        exports[className2] = Montage.specialize(descriptors2);
        descriptor1 = DataObjectDescriptor.getterFor(exports, className1).call({});
        descriptor2 = DataObjectDescriptor.getterFor(exports, className2).call({});
        expect(descriptor1).not.toEqual(descriptor2);
        expect(descriptor1.name).toEqual(className1);
        expect(descriptor2.name).toEqual(className2);
        expect(Object.keys(descriptor1.properties).sort()).toEqual([propertyName1, propertyName2].sort());
        expect(Object.keys(descriptor2.properties).sort()).toEqual([propertyName3, propertyName4].sort());
    });

    xit("needs to be further tested", function () {});

});
