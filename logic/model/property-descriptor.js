var Montage = require("montage").Montage;

/**
 * Describes a property of objects of a certain type.
 *
 * @class
 * @extends external:Montage
 */
exports.PropertyDescriptor = Montage.specialize(/** @lends PropertyDescriptor.prototype */ {

    /**
     * @type {boolean}
     */
    isRelationship: {
        value: false
    },

    /**
     * @type {boolean}
     */
    isOptional: {
        value: false
    }

});
