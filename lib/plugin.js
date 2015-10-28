'use strict';

// Deps
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');


/**
 * Plugin module: hapi-viper-mongoose
 *
 * @param  {Object}   server  Plugin server object
 * @param  {Object}   options Plugin options
 * @param  {Function} next    Needs to be called on terminating plugin configuration
 * @return {VOID}
 */
module.exports = function register(plugin, options, next) {

	var viper = plugin.plugins.viper;

	var promise = Promise.resolve();


	Object.keys(options).forEach(function(key) {
		promise = promise.then(function() {
			return createCon(key, options[key], plugin);
		})
		.then(function(con) {
			viper.value(key, con);
		});
	});


	// finish plugin configuration
	promise.then(function() {
		next();
	}, next);

};


// Set plugin attributes
module.exports.attributes = {
	name: 'hapi-viper-mongoose'
};







function createCon(name, options, plugin) {

	return new Promise(function(resolve, reject) {

		var con = mongoose.createConnection('mongodb://'+options.host+':'+options.port+'/'+options.db, {
			user: options.username,
			pass: options.password
		});

		con.on('error', reject);

		con.once('open', function() {

			var models = {
				_db: con
			};

			if(options.modelsPath && fs.existsSync(options.modelsPath)) {
				registerModelsFromPath(options.modelsPath, con, plugin);

				con.modelNames()
				.forEach(function(modelName) {
					models[modelName] = con.model(modelName);
				});

				associateModels(models);
			}


			resolve(models);

		});


	});

}











/**
 * Executes Model.associate on each model which has this method
 * to register model relations when all models are defined
 * @param  {Object} models Object of models
 * @return {Void}
 */
function associateModels(models) {

	// Execute associate methods on models which have one
	Object.keys(models)

		// Map keys to models
		.map(function(key){
			return models[key];
		})

		// Filter models to models with associate method
		.filter(function(model) {
			return (typeof model.associate !== 'undefined' && typeof model.associate === 'function')
		})

		// Execute model.associate for each model
		.forEach(function(model) {
			model.associate(models);
		});

}






/**
 * Walks through given modelsPath an executes the exported model define handler
 * of each file on the given connection with the given plugin
 * @param  {String} modelsPath Path to models
 * @param  {Object} connection mongoose connection
 * @param  {Object} plugin     Plugin instance
 * @return {Void}
 */
function registerModelsFromPath(modelsPath, connection, plugin) {

	fs.readdirSync(modelsPath)

		// elliminate dotfiles
		.filter(function(item) {
			return (item.substr(0, 1) !== '.');
		})

		// execute model define handler
		.forEach(function(item) {

			var handler = require( path.join(modelsPath, item) );

			handler(connection, mongoose.Schema, mongoose.Schema.Types, plugin);

		});

}



