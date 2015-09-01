var DataProvider = require("montage-data/logic/service/data-provider").DataProvider;

describe("A DataProvider", function() {

    it("can be created", function () {
        expect(new DataProvider()).toBeDefined();
    });

    it("has a an initially empty data array", function () {
        var provider = new DataProvider(),
            data = provider.data;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toEqual(0);
    });

    it("accepts requests for data", function () {
        expect(new DataProvider().requestData()).toBeUndefined();
    });

});
