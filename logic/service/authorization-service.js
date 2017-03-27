var RawDataService = require("logic/service/raw-data-service").RawDataService;


/**
 *
 * @class
 * @extends RawDataService
 */
exports.AuthorizationService = RawDataService.specialize( /** @lends AuthorizationService.prototype */ {


    providesAuthorization: {
        value: true
    },

    /**
     *
     * @property
     * @type string
     * @description Module ID of the panel component used to gather necessary authorization information
     */
    authorizationPanel: {
        value: undefined
    },

    /**
     *
     * @method
     * @returns Promise
     */
    authorize: {
        value: function () {
            console.warn("AuthorizationService.authorize() must be overridden by the implementing service", arguments);
            return this.nullPromise;
        }
    },

    /**
     *
     * @method
     * @returns Promise
     */
    logOut: {
        value: function () {
            console.warn("AuthorizationService.logOut() must be overridden by the implementing service");
            return this.nullPromise;
        }
    }

});
