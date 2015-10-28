var DataMapping = require("montage-data/logic/service/data-mapping").DataMapping,
    ObjectDescriptor = require("montage-data/logic/model/object-descriptor").ObjectDescriptor;

describe("A DataMapping", function() {

   function ClassA(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    function ClassB(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    it("can be created", function () {
        expect(new DataMapping()).toBeDefined();
    });

    it("copies raw data properties by default", function () {
        var object = {x: 42},
            random = Math.random(),
            data = new ClassA(1, 2, object, random),
            mapped = new ClassB();
        new DataMapping().mapFromRawData(mapped, data);
        expect(mapped).toEqual(new ClassB(1, 2, object, random));
    });

});
