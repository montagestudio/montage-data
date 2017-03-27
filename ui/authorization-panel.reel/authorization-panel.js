var Component = require("montage/ui/component").Component,
    AuthorizationManager = require("logic/service/authorization-manager").AuthorizationManager,
    deprecate = require("montage/core/deprecate");

/**
 * @class Main
 * @extends Component
 */
exports.AuthorizationPanel = Component.specialize({

    dataService: {
        get: deprecate.deprecateMethod(void 0, function () {
            return !!this.service;
        }, "dataService", "service"),
        set: deprecate.deprecateMethod(void 0, function () {
            return !!this.service;
        }, "dataService", "service")
    },

    service: {
        value: null
    },

    authorizationManagerPanel: {
        get: function() {
            return AuthorizationManager.authorizationManagerPanel;
        }
    }

});
