var Component = require("montage/ui/component").Component,
    Promise  = require("montage/core/promise").Promise,
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
            if(application.applicationModal) {
                application.applicationModal.hide(global);
            }
            this._authorizationResolve(authorization);
        }
    },
    _authorizationResolve: {
        value: void 0
    },
    cancelAuthorization: {
        value: function() {
            application.applicationModal.hide(global);
            this._authorizationReject("CANCEL");
        }
    },
    _authorizationReject: {
        value: void 0
    },
    runModal: {
        value: function() {

            var that = this;
        
            return new Promise(function(resolve, reject) {
                that._authorizationResolve = resolve;
                that._authorizationReject = reject;
                // FIXME This is temporary shortcut for FreeNAS while we fix Montage's modal.
                if(application.applicationModal) {
                    application.applicationModal.show(that);
                }
            });
        }
    },
    enterDocument: {
        value: function() {
        }
    }
});

// FIXME: Selection needs to be managed by a selection controller
