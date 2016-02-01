var Component = require("montage/ui/component").Component,
    application = require("montage/core/application").application,
    //This will be re-factored
    AuthorizationManager = require("logic/service/authorization-manager").AuthorizationManager;

/**
 * @class Main
 * @extends Component
 */
exports.AuthorizationManagerPanel = Component.specialize({
    constructor: {
        value: function AuthorizationManagerPanel() {
        }
    },
    authorizationPanels: {
        value: null
    },
    authorizationManager: {
        value: AuthorizationManager
    },
    approveAuthorization: {
        value: function(authorization) {
            application.applicationModal.hide(self);
            this._authorizationResolve(authorization);
        }
    },
    _authorizationResolve: {
        value: void 0
    },
    cancelAuthorization: {
        value: function() {
            application.applicationModal.hide(self);
            this._authorizationReject("CANCEL");
        }
    },
    _authorizationReject: {
        value: void 0
    },
    runModal: {
        value: function() {

            var self = this,
                authorizationPromise = new Promise(function(resolve, reject) {
                    self._authorizationResolve = resolve;
                    self._authorizationReject = reject;
                    // FIXME This is temporary shortcut for FreeNAS while we fix Montage's modal.
                    application.applicationModal.show(self);
            });
            return authorizationPromise;
        }
    },
    enterDocument: {
        value: function() {
        }
    }
});

// FIXME: Selection needs to be managed by a selection controller
