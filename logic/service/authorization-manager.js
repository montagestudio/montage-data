var Montage = require("montage/core/core").Montage,
    Promise = require("montage/core/promise").Promise,
    Map = require("collections/map"),
    application = require("montage/core/application").application,

    MANAGER_PANEL_MODULE = "ui/authorization-manager-panel.reel";

/**
 * Helps coordinates the needs for DataServices to get the authorization they
 * need to access data. It is meant to be a singleton, so the constructor
 * enforces that.
 *
 * @class
 * @extends external:Montage
 */
var AuthorizationManager = Montage.specialize(/** @lends AuthorizationManager.prototype */ {

    constructor: {
        value: function () {
            this._authorizationServicesByModuleId = new Map();
            this._authorizationPanelsByModuleId = new Map();
            this._authorizationByServiceModuleId = new Map();
            return this;
        }
    },

    /********************************************
     * Caching
     */

    // Module ID to Panel
    _authorizationPanelsByModuleId: {
        value: undefined
    },

    // Module ID to Service
    _authorizationServicesByModuleId: {
        value: undefined
    },

    // Service Module ID to Promise that resolves with Authorization
    _authorizationByServiceModuleId: {
        value: undefined
    },


    /********************************************
     * Panels
     */

    _getAuthorizationManagerPanel: {
        value: function () {
            var self = this,
                moduleId;

            if (!this._authorizationManagerPanelPromise && this.authorizationManagerPanel) {
                this.authorizationManagerPanel.authorizationManager = this;
                this._authorizationManagerPanelPromise = Promise.resolve(this.authorizationManagerPanel);
            } else if (!this._authorizationManagerPanelPromise) {
                moduleId = this.callDelegateMethod("authorizationManagerWillLoadAuthorizationManagerPanel", this, MANAGER_PANEL_MODULE) || MANAGER_PANEL_MODULE;
                this._authorizationManagerPanelPromise = require.async(moduleId).bind(this).then(function (exports) {
                    var panel = new exports.AuthorizationManagerPanel();
                    self.authorizationManagerPanel = panel;
                    panel.authorizationManager = self;
                    return panel;
                }).catch(function(error) {
                    console.log(error);
                });
            }

            return this._authorizationManagerPanelPromise;
        }
    },


    _getAuthorizationPanelForService: {
        value: function (authorizationService) {
            var moduleId = this._getPanelModuleIdForService(authorizationService),
                panel = this._authorizationPanelsByModuleId.get(moduleId);

            return panel ? Promise.resolve(panel) : this._makePanelForService(moduleId, authorizationService);
        }
    },

    _getPanelModuleIdForService: {
        value: function (authorizationService) {
            var moduleId = authorizationService.authorizationPanel;
            return this.callDelegateMethod("authorizationManagerWillAuthorizeServiceWithPanelModuleId", this,  authorizationService, moduleId) || moduleId;
        }
    },

    _getPanelForConstructorAndService: {
        value: function (constructor, authorizationService) {
            return this.callDelegateMethod("authorizationManagerWillInstantiateAuthorizationPanelForService", this, constructor, authorizationService) || new constructor();
        }
    },

    _makePanelForService: {
        value: function (panelModuleID, authorizationService) {
            var self = this,
                serviceInfo = Montage.getInfoForObject(authorizationService),
                panelPromise;

            if (panelModuleID) {
                panelPromise = serviceInfo.require.async(panelModuleID).then(function (exports) {
                    var exportNames = Object.keys(exports),
                        panel, i, n;

                    for (i = 0, n = exportNames.length; i < n && !panel; ++i) {
                        panel = self._getPanelForConstructorAndService(exports[exportNames[i]], authorizationService)
                    }
                    panel.service = authorizationService;
                    self._authorizationPanelsByModuleId.set(panelModuleID, panel);
                    return panel;
                });
            }

            return panelPromise;
        }
    },

    /********************************************
     * Services
     */

    _canNotifyDataService: {
        value: function (dataService) {
            return dataService.authorizationManagerWillAuthorizeWithService && typeof dataService.authorizationManagerWillAuthorizeWithService == "function";
        }
    },

    _getAuthorizationServicesForDataService: {
        value: function (dataService) {
            var promises = [],
                dataServiceInfo = Montage.getInfoForObject(dataService),
                serviceIds = dataService.authorizationServices,
                servicePromise, i, n;

            for (i = 0, n = serviceIds.length; i < n; ++i) {
                servicePromise = this._getAuthorizationServiceWithModuleId(serviceIds[i], dataServiceInfo);
                promises.push(servicePromise);
            }

            return Promise.all(promises);
        }
    },

    _getAuthorizationServiceWithModuleId: {
        value: function (moduleId, dataServiceInfo) {
            var existingService = this._authorizationServicesByModuleId.get(moduleId);

            return existingService ? Promise.resolve(existingService) :
                                     this._makeAuthorizationServiceWithModuleId(moduleId, dataServiceInfo);
        }
    },


    _getAuthorizationWithService: {
        value: function (moduleId, dataServiceInfo, managerPanel) {
            var self = this,
                service;
            return this._getAuthorizationServiceWithModuleId(moduleId, dataServiceInfo).then(function (authService) {
                service = authService;
                return service.authorization;
            }).then(function (authorization) {
                return authorization || self._getAuthorizationPanelForService(service).then(function (panel) {
                                            return managerPanel.authorizeWithPanel(panel);
                                        });

            })
        }
    },

    _makeAuthorizationServiceWithModuleId: {
        value: function (moduleId, dataServiceInfo) {
            var self = this;
            return dataServiceInfo.require.async(moduleId).then(function (exports) {
                var service, serviceName;
                for (serviceName in exports) {
                    service = service || new exports[serviceName]();
                }
                self.registerAuthorizationService(service);
                return service;
            });
        }
    },

    _notifyDataService: {
        value: function (dataService) {
            var i, n;

            if (this._canNotifyDataService(dataService)) {
                return this._getAuthorizationServicesForDataService(dataService).then(function (services) {
                    for (i = 0, n = services.length; i < n; i++) {
                        //We tell the data service we're authorizing about authorizationService we create and are about to use.
                        dataService.authorizationManagerWillAuthorizeWithService(this, services[i]);
                    }
                })
            }

            return Promise.resolve(null);
        }
    },

    /********************************************
     * Public
     */

    authorizationManagerPanel: {
        value: undefined
    },

    /**
     * Takes care of obtaining authorization for a DataService. Returns a promise of Authorization
     *
     * TODO:
     * 1. Handle repeated calls: if a DataService authorizes on-demand it's likely
     * it would come from fetching data. Multiple independent fetches could trigger repeated
     * attempts to authorize: The promise should be cached and returned when pending.
     *
     * TODO:
     * 2. A service could require mandatory authorization from 2 dataService, right now it's implemented
     * in a way that we extect user to make a choice in one of aDataService.authorizationServices,
     * not a combination of. We need another sturcture to represent that.
     *
     * TODO
     * right now, Promises for existing objects are resolved, meaning that the loops could see different
     * types of objects coming in. Existing objects could be just added to array filled after the Promise.all().then..
     *
     * @method
     */


    authorizeService : {
        value: function (dataService) {
            var self = this,
                dataServiceInfo = Montage.getInfoForObject(dataService),
                authorizationPromises = [],
                moduleId,
                i, n;

            this.hasPendingServices = true;

            return this._getAuthorizationManagerPanel().then(function (managerPanel) {

                for (i = 0, n = dataService.authorizationServices.length; i < n; ++i) {
                    moduleId = dataService.authorizationServices[i];
                    if (!self._authorizationByServiceModuleId.has(moduleId)) {
                        self._authorizationByServiceModuleId.set(moduleId, self._getAuthorizationWithService(moduleId, dataServiceInfo, managerPanel));
                    }

                    authorizationPromises.push(self._authorizationByServiceModuleId.get(moduleId));
                }
                return self._notifyDataService(dataService)
            }).then(function () {
                var useModal = application.applicationModal && self.authorizationManagerPanel.runModal;
                return useModal ? self.authorizationManagerPanel.runModal() : Promise.all(authorizationPromises);
            }).then(function(authorizations) {
                self.callDelegateMethod("authorizationManagerDidAuthorizeService", self, dataService);
                self.hasPendingServices = false;
                //TODO [TJ] How to concatenate authorizations from different auth-services into a single Authorization Object for the data-service
                return authorizations;
            }).catch(function () {
                self.hasPendingServices = false;
            });

        }
    },

    delegate: {
        value: null
    },

    hasPendingServices: {
        value: false
    },

    registerAuthorizationService: {
        value: function(dataService) {
            var info = Montage.getInfoForObject(dataService);
            this._authorizationServicesByModuleId.set(info.moduleId, dataService);
        }
    }

});

exports.AuthorizationManager = new AuthorizationManager();
