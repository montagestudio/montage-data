var Montage = require("montage").Montage;

/**
 * Describes a type of object.
 *
 * Because of [an issue]{@linkplain https://github.com/jsdoc3/jsdoc/issues/1049}
 * with JSDoc the `prototype` property of this class will not appear in the
 * JSDoc generated documentation for this class. This property does exist,
 * however. It is of type `Object` and is a reference to the prototype to use
 * for objects described by instances of this class.
 *
 * @class
 * @extends external:Montage
 */
exports.ObjectDescriptor = Montage.specialize(/** @lends ObjectDescriptor# */{

    /**
     * The name of the type of object described by this descriptor. Names must
     * be globally unique with each different type having a different name.
     *
     * @type {String}
     */
    name: {
        value: null
    },

    /**
     * The prototype to use for objects of this type.
     *
     * @type {Object}
     */
    prototype: {
        value: Object.prototype
    },

    /**
     * Descriptors of the properties of this type of object, by property name.
     *
     * @type {Object.<String, PropertyDescriptor>}
     */
    properties: {
        value: {}
    }

});
