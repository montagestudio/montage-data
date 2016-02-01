var Montage = require("montage").Montage;

/**
 * Helps coordinates the needs for DataServices to get the authorization they
 * need to access data. It is meant to be a singleton, so the constructor
 * enforces that.
 *
 * @class
 * @extends external:Montage
 */
AuthorizationManager = Montage.specialize(/** @lends AuthorizationManager.prototype */{

    constructor: {
        value: function () {
            return AuthorizationManager || this;
        }
    }
});

var authorizationManager = new AuthorizationManager;
exports.AuthorizationManager = authorizationManager;
