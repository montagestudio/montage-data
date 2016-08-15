var Montage = require("montage").Montage;
    // parse = require("frb/parse"),
    // compile = require("frb/compile-evaluator"),
    // evaluate = require("frb/evaluate"),
    // Scope = require("frb/scope");

var ASCENDING = "ASCENDING",
    DESCENDING = "DESCENDING";
/**
 * Naming context:
 * SortDescriptor -> https://developer.apple.com/library/mac/documentation/Cocoa/Reference/Foundation/Classes/NSSortDescriptor_Class/#//apple_ref/occ/instp/NSSortDescriptor/key
 * properties would be:
 *       expression frb
 *       ascending boolean
 * 
 * SortExpression - > https://cloud.google.com/appengine/docs/python/search/sortexpressionclass
 * 
 * properties would be:
 *       expression frb
 *       direction ASCENDING or DESCENDING
 * 
 * SortOrdering -> 
 *  http://mirror.informatimago.com/next/developer.apple.com/documentation/LegacyTechnologies/WebObjects/WebObjects_4.5/System/Library/Frameworks/EOControl.framework/Java/Classes/EOSortOrdering.html
 * http://mirror.informatimago.com/next/developer.apple.com/documentation/LegacyTechnologies/WebObjects/WebObjects_4.5/System/Library/Frameworks/EOControl.framework/Java/Classes/EOFetchSpecification.html#//apple_ref/java/instm/EOFetchSpecification/setSortOrderings
 *  DataSelector would have a sortOrderings array of SortOrdering.
 *  * properties would be:
 *       expression: frb
 *       direction: ASCENDING or DESCENDING or
 *       ascending: boolean
 * 
 *
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
exports.SortOrdering = Montage.specialize(/** @lends DataSelector.prototype */ {

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

    withExpressionOrder: {
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
