var Montage = require("montage").Montage;

/**
 * Defines the criteria that objects must satisfy to be included in a data set
 * as well as other characteristics the data set must possess.
 *
 * @class
 * @extends external:Montage
 */
exports.DataSelector = Montage.specialize(/** @lends DataSelector# */{

    /**
     * The type of the data object to retrieve.
     *
     * @type {ObjectDescriptor}
     */
    type: {
        value: undefined
    },

    /**
     * A set of named values defining the criteria that must be satisfied by
     * objects for them to be included in the data set defined by this selector.
     *
     * Properties and corresponding values can be added or removed from the
     * criteria object but that criteria object itself cannot be replaced.
     *
     * @type {Object}
     */
    criteria: {
        get: function () {
            if (!this._criteria) {
                this._criteria = {};
            }
            return this._criteria;
        }
    }

}, {

    withTypeAndCriteria: {
        value: function (type, criteria) {
            var selector, key;
            selector = new this();
            selector.type = type;
            if (criteria) {
                for (key in criteria) {
                    selector.criteria[key] = criteria[key];
                }
            }
            return selector;
        }
    }

});
