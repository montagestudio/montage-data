var Component = require("montage/ui/component").Component,
    application = require("montage/core/application").application;

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
    enterDocument: {
        value: function() {
        }
    }
});

// FIXME: Selection needs to be managed by a selection controller
