var Montage = require("montage").Montage;

/**
 * Maps raw data to data objects of a specific type.
 *
 * Currently services define their mapping by overriding their
 * [mapFromRawData()]{@link DataService#mapFromRawData} method or by using a
 * {@link DataMapping} subclass that overrides its
 * [mapFromRawData()]{@link DataMapping#mapFromRawData} method. In the future it
 * will be possible to define mappings declaratively through mapping descriptors
 * read from blueprint files.
 *
 * @class
 * @extends external:Montage
 */
exports.DataMapping = Montage.specialize(/** @lends DataMapping.prototype */{

    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to map properties of the raw data
     * to data objects, as in the following:
     *
     *     mapFromRawData: {
     *         value: function (object, data) {
     *             object.firstName = data.GIVEN_NAME;
     *             object.lastName = data.FAMILY_NAME;
     *         }
     *     }
     *
     * The default implementation of this method copies the properties defined
     * by the raw data object to the data object.
     *
     * @method
     * @argument {Object} object - An object whose properties must be set or
     *                             modified to represent the raw data.
     * @argument {Object} data   - An object whose properties' values hold
     *                             the raw data.
     * @argument {?} context     - A value that was passed in to the
     *                             [addRawData()]{@link DataService#addRawData}
     *                             call that invoked this method.
     */
    mapFromRawData: {
        value: function (object, data, context) {
            var key;
            if (data) {
                for (key in data) {
                    object[key] = data[key]
                }
            }
        }
    },

    // TODO: Document.
    mapToRawData: {
        value: function (object, data) {
            // TO DO: Provide a default mapping based on object.TYPE.
            // For now, subclasses must override this.
        }
    }

});
