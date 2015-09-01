var ObjectDescriptor = require("montage-data/logic/model/object-descriptor").ObjectDescriptor;

describe("An ObjectDescriptor", function() {

    it("can be created", function () {
        expect(new ObjectDescriptor()).toBeDefined();
    });

});
