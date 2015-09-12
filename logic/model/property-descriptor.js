var Montage = require("montage").Montage;

/**
 * Describes one property of a type of object.
 *
 * @class
 * @extends external:Montage
 */
exports.PropertyDescriptor = Montage.specialize(/** @lends PropertyDescriptor# */{

    /**
     * The type of the values of this property, as they would be returned from
     * a JavaScript `typeof` call.
     *
     * @type {String}
     */
    type: {
        value: null
    }

});
