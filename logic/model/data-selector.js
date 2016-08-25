var Montage = require("montage").Montage;

/**
 * Defines the criteria that objects must satisfy to be included in a set of
 * data as well as other characteristics that data must possess.
 *
 * @class
 * @extends external:Montage
 */
exports.DataSelector = Montage.specialize(/** @lends DataSelector.prototype */ {

    /**
     * The type of the data object to retrieve.
     *
     * @type {DataObjectDescriptor}
     */
    type: {
        value: undefined
    },

    /**
     * An object defining the criteria that must be satisfied by objects for
     * them to be included in the data set defined by this selector.
     *
     * Initially this can be any object and will typically be a set of key-value
     * pairs, ultimately this will be a boolean expression to be applied to data
     * objects to determine whether they should be in the selected set or not.
     *
     * @type {Object}
     */
    criteria: {
        get: function () {
            if (!this._criteria) {
                this._criteria = {};
            }
            return this._criteria;
        },
        set: function (criteria) {
            this._criteria = criteria;
        }
    },

    _criteria: {
        value: undefined
    },

    /**
     * An array of DataOrdering objects which, combined, define the order
     * desired for the data in the set specified by this selector.
     *
     * @type {Array}
     */
    orderings: {
        get: function () {
            if (!this._orderings) {
                this._orderings = [];
            }
            return this._orderings;
        },
        set: function (orderings) {
            this._orderings = orderings;
        }
    },

    _orderings: {
        value: undefined
    },

}, /** @lends DataSelector */ {

    /**
     * @todo Document.
     */
    withTypeAndCriteria: {
        value: function (type, criteria) {
            var selector, key;
            selector = new this();
            selector.type = type;
            selector.criteria = criteria;
            return selector;
        }
    }

});
