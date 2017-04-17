/**
    @module "ui/title.reel"
*/
var Title = require("digit/ui/title.reel").Title;

/**
    Description TODO
    @class module:"ui/title.reel".Title
    @extends module:montage/ui/component.Component
*/
exports.Title = Title.specialize( {

    constructor: {
        value: function Title() {
            this.super();
            this.classList.add("my-Title");
        }
    },
});
