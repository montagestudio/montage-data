var Component = require("montage/ui/component").Component,
    Promise  = require("montage/core/promise").Promise,
    application = require("montage/core/application").application,
    Map = require("montage/collections/map");

/**
 * @class Main
 * @extends Component
 */
exports.AuthorizationManagerPanel = Component.specialize({

    authorizationPanels: {
        get: function () {
            if (!this._authorizationPanels) {
                this._authorizationPanels = [];
            }
            return this._authorizationPanels;
        },
        set: function (value) {
            this._authorizationPanels = value;
        }
    },

    authorizationManager: {
        value: undefined
    },

    approveAuthorization: {
        value: function (authorization, authorizationPanel) {

            var index = this.authorizationPanels.indexOf(authorizationPanel);
            if (index !== -1) {
                this.authorizationPanels.splice(index, 1);
            }
            this._panels.get(authorizationPanel).resolve(authorization);

            if (!this.authorizationPanels.length) {
                this._authorizationResolve(authorization);
            }
        }
    },

    _panels: {
        get: function () {
            if (!this.__panels) {
                this.__panels = new Map();
            }
            return this.__panels;
        }
    },

    authorizeWithPanel: {
        value: function (authorizationPanel) {
            var self = this,
                promise;

            if (this.authorizationPanels.indexOf(authorizationPanel) === -1) {
                promise = new Promise(function (resolve, reject) {
                    self._panels.set(authorizationPanel, {
                        resolve: resolve,
                        reject: reject
                    })
                });
                this.authorizationPanels.push(authorizationPanel);
            } else {
                promise = Promise.resolve(null);
            }

            return promise;
        }
    },

    _authorizationResolve: {
        value: void 0
    },

    cancelAuthorization: {
        value: function() {
            if (application.applicationModal) {
                application.applicationModal.hide(this);
            }
            this._authorizationReject("CANCEL");
        }
    },

    _authorizationReject: {
        value: void 0
    },

    runModal: {
        value: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                self._authorizationResolve = resolve;
                self._authorizationReject = reject;
                // FIXME This is temporary shortcut for FreeNAS while we fix Montage's modal.
                if (application.applicationModal) {
                    application.applicationModal.show(self);
                }
            });
        }
    }

});

// FIXME: Selection needs to be managed by a selection controller
