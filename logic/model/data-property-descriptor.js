var PropertyDescriptor = require("logic/model/property-descriptor").PropertyDescriptor;

/**
 * Extend {@link PropertyDescriptor} to describes a property of
 * [data objects]{@link DataObjectDescriptor} of a certain type.
 *
 * @class
 * @extends PropertyDescriptor
 */
exports.DataPropertyDescriptor = PropertyDescriptor.specialize(/** @lends DataPropertyDescriptor.prototype */ {

    // TODO: Add support for derived properties, relationship criteria,
    // relationship targets, and shared fetches.

    /**
     * @type {boolean}
     */
    isGlobal: {
        value: false
    }

});
