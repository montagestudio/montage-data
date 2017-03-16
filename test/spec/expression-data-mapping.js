var ExpressionDataMapping = require("montage-data/logic/service/expression-data-mapping").ExpressionDataMapping,
    CategoryService = require("spec/data/service/category-service").CategoryService,
    DataService = require("montage-data/logic/service/data-service").DataService,
    ModuleObjectDescriptor = require("montage/core/meta/module-object-descriptor").ModuleObjectDescriptor,
    ModuleReference = require("montage/core/module-reference").ModuleReference,
    Promise = require("montage/core/promise").Promise,
    PropertyDescriptor = require("montage/core/meta/property-descriptor").PropertyDescriptor,
    RawDataService = require("montage-data/logic/service/raw-data-service").RawDataService,
    RawPropertyValueToObjectConverter = require("montage-data/logic/converter/raw-property-value-to-object-converter").RawPropertyValueToObjectConverter;

describe("An Expression Data Mapping", function() {

    var categoryMapping,
        categoryModuleReference,
        categoryObjectDescriptor,
        categoryPropertyDescriptor,
        categoryService,
        mainService,
        movieMapping,
        movieModuleReference,
        movieObjectDescriptor,
        movieService,
        plotSummaryModuleReference,
        plotSummaryObjectDescriptor,
        plotSummaryPropertyDescriptor;

    DataService.mainService = undefined;
    mainService = new DataService();
    mainService.NAME = "Movies";
    movieService = new RawDataService();
    movieModuleReference = new ModuleReference().initWithIdAndRequire("spec/data/model/movie", require);
    movieObjectDescriptor = new ModuleObjectDescriptor().initWithModuleAndExportName(movieModuleReference, "Movie");
    movieObjectDescriptor.addPropertyDescriptor(new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("title", movieObjectDescriptor, 1));
    categoryService = new CategoryService();
    categoryModuleReference = new ModuleReference().initWithIdAndRequire("spec/data/model/category", require);
    categoryObjectDescriptor = new ModuleObjectDescriptor().initWithModuleAndExportName(categoryModuleReference, "Category");
    categoryObjectDescriptor.addPropertyDescriptor(new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("name", categoryObjectDescriptor, 1));
    categoryPropertyDescriptor = new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("category", movieObjectDescriptor, 1);
    categoryPropertyDescriptor.valueDescriptor = categoryObjectDescriptor;
    movieObjectDescriptor.addPropertyDescriptor(categoryPropertyDescriptor);
    plotSummaryModuleReference = new ModuleReference().initWithIdAndRequire("spec/data/model/plot-summary", require);
    plotSummaryObjectDescriptor = new ModuleObjectDescriptor().initWithModuleAndExportName().initWithNameObjectDescriptorAndCardinality(plotSummaryModuleReference, "PlotSummary");
    plotSummaryPropertyDescriptor = new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("plotSummary", movieObjectDescriptor, 1);
    plotSummaryPropertyDescriptor.valueDescriptor = plotSummaryObjectDescriptor;
    movieObjectDescriptor.addPropertyDescriptor(plotSummaryObjectDescriptor);
    movieMapping = new ExpressionDataMapping().initWithObjectDescriptorAndService(movieObjectDescriptor, movieService);
    movieMapping.addRequisitePropertyName("title", "category");
    movieMapping.addObjectMappingRule("title", {"<->": "name"});
    movieMapping.addObjectMappingRule("category", {
        "<-": "category_id",
        converter: new RawPropertyValueToObjectConverter().initWithForeignPropertyAndCardinality("category_id", 1)
    });
    movieService.addMappingForType(movieMapping, movieObjectDescriptor);
    categoryMapping = new ExpressionDataMapping().initWithObjectDescriptorAndService(categoryObjectDescriptor, categoryService);
    categoryMapping.addObjectMappingRule("name", {"<->": "name"});
    categoryMapping.addRequisitePropertyName("name");
    categoryService.addMappingForType(categoryMapping, categoryObjectDescriptor);

    it("can be created", function () {
        expect(new ExpressionDataMapping()).toBeDefined();
    });

    it("properly registers the object descriptor type to the mapping object in a service", function () {
        return Promise.all([
            mainService.registerChildService(movieService, movieObjectDescriptor),
            mainService.registerChildService(categoryService, categoryObjectDescriptor)
        ]).then(function () {
            expect(movieService.parentService).toBe(mainService);
            expect(movieService.mappingWithType(movieObjectDescriptor)).toBe(movieMapping);
        });
    });

    it("can map raw data to object properties", function () {
        var movie = {};
        return movieMapping.mapRawDataToObject({name: "Star Wars", category_id: 1}, movie).then(function () {
            expect(movie.title).toBe("Star Wars");
            expect(movie.category).toBeDefined();
            expect(movie.category && movie.category.name === "Action").toBeTruthy();
        });
    });

    it("can map objects to raw data", function () {
        var data = {};
        movieMapping.mapObjectToRawData({name: "Star Wars"}, data);
        expect(data.name).toBe("Star Wars");
    });

});
