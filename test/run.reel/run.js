var Component = require("montage/ui/component").Component;

exports.Run = Component.specialize(/** @lends Run.prototype */ {

    hasTemplate: {
        value: false
    },

    enterDocument: {
        value: function(isFirstTime) {
            if (isFirstTime) {
                // Require and run the Jasmine "specs" defining the tests here.
                // For maintainability please keep these in alphabetical order.
                runJasmine([
                    require("spec/data-mapping"),
                    require("spec/data-object-descriptor"),
                    require("spec/data-property-descriptor"),
                    require("spec/data-provider"),
                    require("spec/data-selector"),
                    require("spec/data-service"),
                    require("spec/data-stream"),
                    require("spec/enumeration"),
                    require("spec/http-service"),
                    require("spec/object-descriptor"),
                    require("spec/offline-service"),
                    require("spec/property-descriptor"),
                ]);
            }
        }
    }

});
