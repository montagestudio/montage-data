var Montage = require("montage").Montage;

/**
 * Describes a property of of objects of a certain type.
 *
 * @class
 * @extends external:Montage
 */
exports.PropertyDescriptor = Montage.specialize(/** @lends PropertyDescriptor# */{

    /**
     * @type {boolean}
     */
    isRelationship: {
        value: false
    }

});
