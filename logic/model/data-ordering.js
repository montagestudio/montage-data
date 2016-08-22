var Montage = require("montage").Montage;
    // parse = require("frb/parse"),
    // compile = require("frb/compile-evaluator"),
    // evaluate = require("frb/evaluate"),
    // Scope = require("frb/scope");

var ASCENDING = "ASCENDING",
    DESCENDING = "DESCENDING";
/*
 *
 *    var syntax = parse("a.b");
 *    var array = [{foo:"A",bar:"2"},{foo:"A",bar:"1"},{foo:"C",bar:"5"},{foo:"D",bar:"3"},{foo:"B",bar:"2"},{foo:"B",bar:"4"},{foo:"F",bar:"1"},{foo:"G",bar:"2"},{foo:"E",bar:"4"}];
 *    var sortExpression = "foo";
 *    var evaluatedSortExpression = compile(parse("sorted{foo}"));
 *    var evaluatedDoubleSortExpression = compile(parse("sorted{foo+bar}"));
 *    var evaluatedInvertedSortExpression = compile(parse("sorted{foo}.reversed()"));
 *    var evaluatedSyntax = compile(syntax);
 *    var c = evaluatedSyntax(new Scope({a: {b: 10}}));
 *    var sortedArray = evaluatedSortExpression(new Scope(array));
 *    var inverseSortedArray = evaluatedInvertedSortExpression(new Scope(array));
 *    var doubleSortedArray = evaluatedDoubleSortExpression(new Scope(array));

 * 
 * @class
 * @extends external:Montage
 */
exports.DataOrdering = Montage.specialize(/** @lends DataSelector.prototype */ {

    /**
     * The expression that describes the sorting. Internally 
     *
     * @type {String}
     */
    expression: {
        value: undefined
    },

    /**
     * This should be an enumeration I guess? Take 2 constants.
     *
     * @type {String}
     */
    order: {
        value: ASCENDING
    }

}, {

    /* -> withExpressionAndOrder */
    withExpressionAndOrder: {
        value: function (expression, order) {
            var sortOrdering = new this();
            sortOrdering.expression = expression;
            sortOrdering.order = order;
            return sortOrdering;
        }
    },
    ASCENDING: {
        value: ASCENDING
    },
    DESCENDING: {
        value: DESCENDING
    }

});
