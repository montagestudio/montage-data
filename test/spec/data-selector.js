var DataSelector = require("montage-data/logic/service/data-selector").DataSelector;

describe("A DataSelector", function() {

    it("can be created", function () {
        expect(new DataSelector()).toBeDefined();
    });

    it("has an initially null expression object", function () {
        expect(new DataSelector().expression).toBe(null);
    });

    it("preserves its expression object", function () {
        var selector = new DataSelector(),
            expression = { a: {"=": 1}, b: {">": 2, "<": 3}, c: {">=": 3}, d: {"!=": 4}};
        selector.expression = expression;
        expect(selector.expression).toBe(expression);
    });

});
