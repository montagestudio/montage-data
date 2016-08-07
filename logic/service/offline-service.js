var RawDataService = require("logic/service/raw-data-service").RawDataService;

/**
 * TODO: Document
 *
 * @class
 * @extends RawDataService
 */
exports.OfflineService = RawDataService.specialize(/** @lends OfflineService.prototype */ {

    /***************************************************************************
     * Initializing
     */

    constructor: {
        value: function OfflineService() {
            RawDataService.call(this);
        }
    },

    /***************************************************************************
     * Entry points
     */

    fetchData: {
        value: function (selector, stream) {
            // TODO.
        }
    }

});
