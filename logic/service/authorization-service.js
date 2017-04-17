var DataService = require("logic/service/data-service").DataService;


/**
 *
 * @class
 * @extends RawDataService
 */
exports.AuthorizationService = DataService.specialize( /** @lends AuthorizationService.prototype */ {


    constructor: {
        value: function AuthorizationService() {
            console.warn("AuthorizationService is deprecated. The Authorization API was moved to DataService");
            DataService.call(this);
        }
    }

});
