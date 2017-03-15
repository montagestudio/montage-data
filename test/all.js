console.log('montage-testing', 'Start');
require("montage-testing").run(require, [
    "spec/data-mapping",
	"spec/data-object-descriptor",
	"spec/data-property-descriptor",
	"spec/data-provider",
	"spec/data-selector",
	"spec/data-service",
	"spec/data-stream",
	"spec/enumeration",
	"spec/http-service",
	"spec/object-descriptor",
	"spec/offline-service",
	"spec/property-descriptor",
	"spec/raw-data-service"
]).then(function () {
	console.log('montage-testing', 'End');
}, function (err) {
	console.log('montage-testing', 'Fail', err, err.stack);
});