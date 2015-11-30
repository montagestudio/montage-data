var DataService = require("logic/service/data-service").DataService;

/**
 * Saves data for offline use and restores it when offline.
 *
 * @class
 * @extends external:DataService
 */
exports.OfflineService = DataService.specialize(/** @lends OfflineService.prototype */ {

}, /** @lends OfflineService */ {

});
