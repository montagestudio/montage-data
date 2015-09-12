var Montage = require("montage").Montage;

/**
 * Defines criteria that objects must satisfy to be included in a data set.
 *
 * @class
 * @extends external:Montage
 */
exports.DataSelector = Montage.specialize(/** @lends DataSelector# */{

    /**
     * Eventually selector expressions will be parsed from strings but for now
     * they can only be defined as literal objects structured like the
     * following:
     *
     *     var selector = new DataSelector();
     *     selector.expression = {
     *         property1: {"=": 1},
     *         property2: {">": 2, "<": 3},
     *         property3: {">=": 3},
     *         property4: {"!=": 4}
     *     };
     *
     * This supports a small subset of the selector expressions expected to be
     * valid in the future. Services are ultimately responsible for interpreting
     * selector expressions and for determinging which expressions are valid
     * but for now the operators that are expected to be valid in expression
     * objects are:
     *
     *     "=" || "<" || ">" || "<=" || ">=" || "!="
     *
     * @type {Object}
     */
    expression: {
        value: null
    }

});
