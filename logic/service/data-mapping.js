var Montage = require("montage").Montage;

/**
 * Maps raw data to data objects of a specific type.
 *
 * Currently services have to subclass this and override its
 * [mapData()]{@link DataMapping#mapData} method to define their mapping. In the
 * future mappings will be defined declaratively through mapping descriptors
 * read from blueprint files.
 *
 * @class
 * @extends external:Montage
 */
exports.DataMapping = Montage.specialize(/** @lends DataMapping# */{

    /**
     * The type of the data object to map to.
     *
     * @type {ObjectDescriptor}
     */
    type: {
        value: undefined
    },


    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to create an object of the right
     * type with values taken from the passed in raw object. The
     * [specialize()]{@linkcode external:specialize} method of the prototype of
     * the map's type can be used for this, as in the following:
     *
     *     mapRawData: {
     *         value: function (rawObject) {
     *             return this.type.prototype.specialize({
     *                 firstName: {
     *                     value: rawObject.GIVEN_NAME
     *                 }
     *                 lastName: {
     *                     value: rawObject.FAMILY_NAME
     *                 }
     *             });
     *         }
     *     }
     *
     * The default implementation of this method returns the raw object
     * unmodified.
     *
     * @method
     * @argument {Object} rawObject - An object whose properties hold the raw
     *                                data. This object may be modified.
     */
    mapRawData: {
        value: function (rawObject) {
            return rawObject;
        }
    }

});
