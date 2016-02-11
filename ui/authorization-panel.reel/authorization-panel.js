var Component = require("montage/ui/component").Component,
    application = require("montage/core/application").application,
    AuthorizationManager = require("logic/service/authorization-manager").AuthorizationManager;

/**
 * @class Main
 * @extends Component
 */
exports.AuthorizationPanel = Component.specialize({
    dataService: {
        value: null
    },
    authorizationManagerPanel: {
        get: function() {
            return AuthorizationManager.authorizationManagerPanel;
        }
    }

});

// FIXME: Selection needs to be managed by a selection controller
