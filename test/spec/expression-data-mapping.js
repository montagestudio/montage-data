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
        budgetPropertyDescriptor,
        movieMapping,
        movieModuleReference,
        movieObjectDescriptor,
        movieSchema,
        movieSchemaModuleReference,
        movieService,
        plotSummaryModuleReference,
        plotSummaryObjectDescriptor,
        plotSummaryPropertyDescriptor,
        registrationPromise,
        schemaBudgetPropertyDescriptor;

    DataService.mainService = undefined;
    mainService = new DataService();
    mainService.NAME = "Movies";
    movieService = new RawDataService();
    movieModuleReference = new ModuleReference().initWithIdAndRequire("spec/data/model/logic/movie", require);
    movieObjectDescriptor = new ModuleObjectDescriptor().initWithModuleAndExportName(movieModuleReference, "Movie");
    movieObjectDescriptor.addPropertyDescriptor(new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("title", movieObjectDescriptor, 1));
    movieSchemaModuleReference = new ModuleReference().initWithIdAndRequire("spec/data/schema/logic/movie", require);
    movieSchema = new ModuleObjectDescriptor().initWithModuleAndExportName(movieSchemaModuleReference, "Movie");
    categoryService = new CategoryService();

    categoryModuleReference = new ModuleReference().initWithIdAndRequire("spec/data/model/logic/category", require);
    categoryObjectDescriptor = new ModuleObjectDescriptor().initWithModuleAndExportName(categoryModuleReference, "Category");
    categoryObjectDescriptor.addPropertyDescriptor(new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("name", categoryObjectDescriptor, 1));
    categoryPropertyDescriptor = new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("category", movieObjectDescriptor, 1);
    categoryPropertyDescriptor.valueDescriptor = categoryObjectDescriptor;
    movieObjectDescriptor.addPropertyDescriptor(categoryPropertyDescriptor);

    plotSummaryModuleReference = new ModuleReference().initWithIdAndRequire("spec/data/model/logic/plot-summary", require);
    plotSummaryObjectDescriptor = new ModuleObjectDescriptor().initWithModuleAndExportName(plotSummaryModuleReference, "PlotSummary");
    plotSummaryObjectDescriptor.addPropertyDescriptor(new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("summary", plotSummaryObjectDescriptor, 1));
    plotSummaryPropertyDescriptor = new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("plotSummary", movieObjectDescriptor, 1);
    plotSummaryPropertyDescriptor.valueDescriptor = plotSummaryObjectDescriptor;
    movieObjectDescriptor.addPropertyDescriptor(plotSummaryPropertyDescriptor);

    schemaBudgetPropertyDescriptor = new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("budget", movieSchema, 1);
    movieSchema.addPropertyDescriptor(schemaBudgetPropertyDescriptor);
    budgetPropertyDescriptor = new PropertyDescriptor().initWithNameObjectDescriptorAndCardinality("budget", movieObjectDescriptor, 1);
    budgetPropertyDescriptor.valueType = "number";
    movieObjectDescriptor.addPropertyDescriptor(budgetPropertyDescriptor);

    movieMapping = new ExpressionDataMapping().initWithServiceObjectDescriptorAndSchema(movieService, movieObjectDescriptor, movieSchema);
    movieMapping.addRequisitePropertyName("title", "category", "budget");
    movieMapping.addObjectMappingRule("title", {"<->": "name"});
    movieMapping.addObjectMappingRule("category", {
        "<-": "category_id",
        converter: new RawPropertyValueToObjectConverter().initWithForeignPropertyAndCardinality("category_id", 1)
    });
    movieMapping.addObjectMappingRule("budget", {"<->": "budget"});
    movieService.addMappingForType(movieMapping, movieObjectDescriptor);
    categoryMapping = new ExpressionDataMapping().initWithServiceObjectDescriptorAndSchema(categoryService, categoryObjectDescriptor);
    categoryMapping.addObjectMappingRule("name", {"<->": "name"});
    categoryMapping.addRequisitePropertyName("name");
    categoryService.addMappingForType(categoryMapping, categoryObjectDescriptor);

    it("can be created", function () {
        expect(new ExpressionDataMapping()).toBeDefined();
    });
    registrationPromise = Promise.all([
        mainService.registerChildService(movieService, movieObjectDescriptor),
        mainService.registerChildService(categoryService, categoryObjectDescriptor)
    ]);
    it("properly registers the object descriptor type to the mapping object in a service", function (done) {
        return registrationPromise.then(function () {
            expect(movieService.parentService).toBe(mainService);
            expect(movieService.mappingWithType(movieObjectDescriptor)).toBe(movieMapping);
            done();
        });
    });

    it("can map raw data to object properties", function (done) {
        var movie = {};
        return movieMapping.mapRawDataToObject({name: "Star Wars", category_id: 1, budget: "14000000.00"}, movie)
        .then(function () {
            expect(movie.title).toBe("Star Wars");
            expect(movie.category).toBeDefined();
            expect(movie.category && movie.category.name === "Action").toBeTruthy();
            done();
        });
    });

    it("can automatically convert raw data to the correct value", function (done) {
        var movie = {};
        return movieMapping.mapRawDataToObject({name: "Star Wars", category_id: 1, budget: "14000000.00"}, movie)
            .then(function () {
                expect(typeof movie.budget === "number").toBeTruthy();
                done();
            });
    });


    it("can map objects to raw data", function (done) {
        return registrationPromise.then(function () {
            var data = {};
            movieMapping.mapObjectToRawData({name: "Star Wars"}, data);
            expect(data.name).toBe("Star Wars");
            done();
        });
    });

});
