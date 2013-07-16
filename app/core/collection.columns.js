define([
  "app",
  "backbone"
],

function(app, Backbone) {

  var Structure = {};

  Structure.UI = Backbone.Model.extend({

    url: function() {
      return this.parent.url() + '/' + this.id;
    },

    getStructure: function() {
      return this.parent.structure;
    },

    //@todo: This is code repetition. Almost identical to entries.model. Create a mixin?
    validate: function(attributes, options) {
      var errors = [];
      var structure = this.getStructure();

      //only validates attributes that are part of the schema
      attributes = _.pick(attributes, structure.pluck('id'));

      _.each(attributes, function(value, key, list) {
        var mess = ui.validate(this, key, value);
        if (mess !== undefined) {
          errors.push({attr: key, message: ui.validate(this, key, value)});
        }
      }, this);

      if (errors.length > 0) return errors;
    }

  });

  Structure.Column = Backbone.Model.extend({

      parse: function(result) {

        // initialize Schema
        var ui = result.ui;
        var tableName = '';

        if (_.isEmpty(ui)) {
          throw new Error("Column '"+ result.id + "' in table '" + tableName + "' does not have a UI");
        }
        if (!app.uiSettings.hasOwnProperty(ui)) {
          throw new Error("The UI '" + ui + "', set for the column '" + result.id + "' in the table '" + tableName + "' does not exist!");
        }

        // make sure that the structure is the right kind for the UI
        // @todo: move this to options instead so it doesn't need to change
        this.structure = app.uiSettings[ui].schema;

        // initialize UI
        var options = result.options || {};
        options.id = result.ui;
        this.options = new Structure.UI(options);
        this.options.parent = this;
        delete result.options;

        if (result.master) result.header = true;
        result.header = (result.header === "true" || result.header === true || result.header === 1 || result.header === "1") ? true : false;

        return result;
      },

      getOptions: function() {
        return this.options.get(this.attributes.ui);
      },

      getRelated: function() {
        return (this.get('ui') === 'many_to_one') ? this.options.get('table_related') : this.get('table_related');
      },

      getRelationshipType: function() {
        var type = this.get('type');
        var ui = this.get('ui');

        if (_.contains(['MANYTOMANY', 'ONETOMANY'], type)) return type;
        if (ui === 'many_to_one') return 'MANYTOONE';
      },

      hasRelated: function() {
        return this.getRelated() !== undefined;
      },

      toJSON: function(options) {
        if (options && options.columns) {
          return _.pick(this.attributes, options.columns);
        }
        return _.clone(this.attributes);
      }

  });

  //The equivalent of a MySQL columns Schema
  Structure.Columns = Backbone.Collection.extend({

    model: Structure.Column,

    comparator: function(row) {
      return row.get('sort');
    },

    save: function(attributes, options) {
      options = options || {};
      var collection = this;
      var success = options.success;

      options.success = function(model, resp, xhr) {
        collection.reset(model);
        if (success !== undefined) {
          success();
        }
      };

      $result = Backbone.sync('update', this, options);
      return $result;
    }
  });
  return Structure;
});