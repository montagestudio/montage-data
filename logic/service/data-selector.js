var Montage = require("montage").Montage;

/**
 * Defines the criteria that objects must satisfy to be included in a data set
 * as well as other characteristics the data set must possess.
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
     * pairs, ultimately this will probably be an object representing an
     * expression.
     *
     * @type {Object}
     */
    _criteria: {
        value: undefined
    },
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

    /**
     * An array of SortOrdering objects which combined in order describe how .
     * data ordered after being selected.
     * move to sortings
     * @type {Object}
     */
    sortOrderings: {
        value: undefined
    }

}, {

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
